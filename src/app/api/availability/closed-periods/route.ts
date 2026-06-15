import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function verifyOwner(businessId: string, userId: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('businesses')
    .select('owner_id')
    .eq('id', businessId)
    .single()
  return data?.owner_id === userId
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const businessId = searchParams.get('business_id')

  if (!businessId) {
    return NextResponse.json({ error: 'business_id is required' }, { status: 400 })
  }

  const authSupabase = createClient()
  const { data: { user } } = await authSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await verifyOwner(businessId, user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('closed_periods')
    .select('*')
    .eq('business_id', businessId)
    .order('date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ closed_periods: data })
}

export async function POST(request: Request) {
  const authSupabase = createClient()
  const { data: { user } } = await authSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const json = await request.json()
  const { business_id, date, start_time, end_time, reason, staff_id } = json

  if (!business_id || !date) {
    return NextResponse.json({ error: 'business_id and date are required' }, { status: 400 })
  }

  if (!await verifyOwner(business_id, user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('closed_periods')
    .insert({
      business_id,
      date,
      start_time: start_time || null,
      end_time: end_time || null,
      reason: reason || null,
      staff_id: staff_id || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ closed_period: data })
}

export async function DELETE(request: Request) {
  const authSupabase = createClient()
  const { data: { user } } = await authSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const supabase = createServiceClient()

  // Verify ownership via the closed_period → business join
  const { data: period } = await supabase
    .from('closed_periods')
    .select('business_id')
    .eq('id', id)
    .single()

  if (!period) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!await verifyOwner(period.business_id, user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase.from('closed_periods').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
