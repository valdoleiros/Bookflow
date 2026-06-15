import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { startOfMonth, subMonths, format } from 'date-fns'
import { pt } from 'date-fns/locale'

export async function GET(
  req: NextRequest,
  { params }: { params: { businessId: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: business } = await supabase
    .from('businesses')
    .select('owner_id')
    .eq('id', params.businessId)
    .single()
  if (!business || business.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()
  const sixMonthsAgo = startOfMonth(subMonths(now, 5))

  // Revenue/volume count every appointment that happened or is booked:
  // confirmed = upcoming, completed = past honoured. Cancelled & no-show excluded.
  const [
    { data: bookings },
    { data: noShowBookings },
    { data: allCustomers },
  ] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, start_time, services(name, price), staff(name)')
      .eq('business_id', params.businessId)
      .in('status', ['confirmed', 'completed'])
      .gte('start_time', sixMonthsAgo.toISOString())
      .order('start_time'),
    supabase
      .from('bookings')
      .select('id')
      .eq('business_id', params.businessId)
      .eq('status', 'no_show')
      .gte('start_time', sixMonthsAgo.toISOString()),
    // For retention: count bookings per customer (all time)
    supabase
      .from('bookings')
      .select('customer_id')
      .eq('business_id', params.businessId)
      .in('status', ['confirmed', 'completed']),
  ])

  const allBookings = bookings ?? []
  const noShows     = noShowBookings?.length ?? 0
  const totalForRate = allBookings.length + noShows

  // ── Monthly buckets ───────────────────────────────────────
  const monthlyMap: Record<string, { revenue: number; count: number; label: string }> = {}
  for (let i = 5; i >= 0; i--) {
    const d   = subMonths(now, i)
    const key = format(d, 'yyyy-MM')
    monthlyMap[key] = { revenue: 0, count: 0, label: format(d, 'MMM', { locale: pt }) }
  }

  // ── Service + staff + hour maps ───────────────────────────
  const serviceMap: Record<string, { count: number; revenue: number }>  = {}
  const staffMap:   Record<string, { count: number; revenue: number }>  = {}
  const hourMap:    Record<number,  number>  = {}

  for (const b of allBookings) {
    const month   = (b.start_time as string).slice(0, 7)
    const price   = Number((b.services as any)?.price ?? 0)
    const svcName = (b.services as any)?.name ?? 'Outro'
    const stfName = (b.staff as any)?.name ?? 'Geral'
    const hour    = new Date(b.start_time).getUTCHours()

    if (monthlyMap[month]) {
      monthlyMap[month].revenue += price
      monthlyMap[month].count++
    }

    if (!serviceMap[svcName]) serviceMap[svcName] = { count: 0, revenue: 0 }
    serviceMap[svcName].count++
    serviceMap[svcName].revenue += price

    if (!staffMap[stfName]) staffMap[stfName] = { count: 0, revenue: 0 }
    staffMap[stfName].count++
    staffMap[stfName].revenue += price

    hourMap[hour] = (hourMap[hour] ?? 0) + 1
  }

  // ── Retention rate ────────────────────────────────────────
  const custBookingCount: Record<string, number> = {}
  for (const b of (allCustomers ?? [])) {
    custBookingCount[b.customer_id] = (custBookingCount[b.customer_id] ?? 0) + 1
  }
  const totalCustomers  = Object.keys(custBookingCount).length
  const repeatCustomers = Object.values(custBookingCount).filter(c => c >= 2).length
  const retentionRate   = totalCustomers > 0
    ? Math.round((repeatCustomers / totalCustomers) * 100)
    : 0

  // ── Peak hours ────────────────────────────────────────────
  const peakHours = Object.entries(hourMap)
    .map(([h, count]) => ({ hour: Number(h), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const thisMonthKey = format(now, 'yyyy-MM')
  const lastMonthKey = format(subMonths(now, 1), 'yyyy-MM')

  return NextResponse.json({
    revenueThisMonth:  monthlyMap[thisMonthKey]?.revenue ?? 0,
    revenueLastMonth:  monthlyMap[lastMonthKey]?.revenue ?? 0,
    bookingsThisMonth: monthlyMap[thisMonthKey]?.count ?? 0,
    bookingsLastMonth: monthlyMap[lastMonthKey]?.count ?? 0,
    monthlyRevenue:    Object.values(monthlyMap),
    topServices:       Object.entries(serviceMap).map(([n, d]) => ({ name: n, ...d })).sort((a, b) => b.count - a.count).slice(0, 5),
    revenueByStaff:    Object.entries(staffMap).map(([n, d]) => ({ name: n, ...d })).sort((a, b) => b.revenue - a.revenue),
    noShowRate:        totalForRate > 0 ? Math.round((noShows / totalForRate) * 100) : 0,
    noShowCount:       noShows,
    retentionRate,
    totalCustomers,
    peakHours,
  })
}
