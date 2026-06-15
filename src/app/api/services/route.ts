// src/app/api/services/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { business_id, name, duration_minutes, price } = body

  if (!business_id || !name || !duration_minutes) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabaseAuth = createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = createServiceClient()
  const { data: business } = await supabaseAdmin.from('businesses').select('owner_id').eq('id', business_id).single()
  if (business?.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createClient()
  const { data: service, error } = await supabase
    .from('services')
    .insert({ business_id, name, duration_minutes, price: price ?? null })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ service }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { id, business_id, ...updates } = await req.json()
  if (!id || !business_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const supabaseAuth = createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createServiceClient()
  const { data: business } = await admin.from('businesses').select('owner_id').eq('id', business_id).single()
  if (business?.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const allowed = ['name', 'duration_minutes', 'price', 'is_active']
  const patch = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)))

  const { data: service, error } = await admin
    .from('services')
    .update(patch)
    .eq('id', id)
    .eq('business_id', business_id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ service })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const business_id = searchParams.get('business_id')
  if (!id || !business_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const supabaseAuth = createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createServiceClient()
  const { data: business } = await admin.from('businesses').select('owner_id').eq('id', business_id).single()
  if (business?.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await admin.from('services').delete().eq('id', id).eq('business_id', business_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}