import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  // We need all bookings for this business, with their customer and service info
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      id,
      start_time,
      status,
      customers (id, name, phone),
      services (name)
    `)
    .eq('business_id', params.businessId)
    .neq('status', 'cancelled')
    .order('start_time', { ascending: false })

  if (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
  }

  // Aggregate by customer
  const customerMap = new Map<string, any>()

  for (const b of (bookings || [])) {
    if (!b.customers) continue
    
    // Handle array or single object if Supabase returns array for one-to-one
    const customer = Array.isArray(b.customers) ? b.customers[0] : b.customers
    if (!customer) continue

    const cid = customer.id
    const serviceName = b.services ? (Array.isArray(b.services) ? b.services[0]?.name : (b.services as any)?.name) : null

    if (!customerMap.has(cid)) {
      customerMap.set(cid, {
        id: cid,
        name: customer.name,
        phone: customer.phone,
        total_visits: 0,
        last_visit: b.start_time, // Ordered DESC, first one is the latest
        last_service: serviceName,
      })
    }
    
    // Count valid visits
    if (b.status === 'completed' || b.status === 'confirmed') {
      customerMap.get(cid).total_visits += 1
    }
  }

  const customersList = Array.from(customerMap.values())
  // Sort by last visit descending
  customersList.sort((a, b) => new Date(b.last_visit).getTime() - new Date(a.last_visit).getTime())

  return NextResponse.json({ customers: customersList })
}
