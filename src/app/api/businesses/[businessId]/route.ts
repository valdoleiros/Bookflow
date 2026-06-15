import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function PATCH(
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

  const body = await req.json()
  const allowed = ['name', 'phone', 'timezone', 'address', 'description', 'cover_url', 'logo_url', 'brand_color', 'prepayment_mode', 'prepayment_value']
  const patch = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const admin = createServiceClient()
  const { data: updated, error } = await admin
    .from('businesses')
    .update(patch)
    .eq('id', params.businessId)
    .select('id, name, phone, timezone, slug, email, address, description, cover_url, logo_url, brand_color, prepayment_mode, prepayment_value')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ business: updated })
}
