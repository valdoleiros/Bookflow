// src/app/api/dashboard/[businessId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { startOfDay, endOfDay, addDays } from 'date-fns'

const BOOKING_SELECT = `
  id, business_id, service_id, customer_id,
  start_time, end_time, status, notes, created_at,
  services ( id, name, duration_minutes, price ),
  customers ( id, name, phone, email )
`

export async function GET(
  req: NextRequest,
  { params }: { params: { businessId: string } }
) {
  const supabase = createClient()
  
  // Security Check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: business } = await supabase.from('businesses').select('owner_id').eq('id', params.businessId).single()
  if (!business || business.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()

  const todayStart = startOfDay(now).toISOString()
  const futureCutoff = addDays(now, 31).toISOString()

  const { data: bookingsRes } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .eq('business_id', params.businessId)
    .neq('status', 'cancelled')
    .gte('start_time', todayStart)
    .lte('start_time', futureCutoff)
    .order('start_time')

  return NextResponse.json({
    bookings: bookingsRes ?? [],
  })
}