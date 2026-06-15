import { NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const businessId = searchParams.get('business_id')

  if (!businessId) {
    return NextResponse.json({ error: 'business_id is required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching staff:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ staff: data })
}

export async function POST(request: Request) {
  try {
    const json = await request.json()
    const { business_id, name, avatar_url, is_active } = json

    if (!business_id || !name) {
      return NextResponse.json({ error: 'business_id and name are required' }, { status: 400 })
    }

    const authSupabase = createClient()
    const { data: { user } } = await authSupabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()
    
    // Verify ownership
    const { data: business } = await supabase.from('businesses').select('owner_id').eq('id', business_id).single()
    if (business?.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { data, error } = await supabase
      .from('staff')
      .insert({
        business_id,
        name: name.trim(),
        avatar_url: avatar_url || null,
        is_active: is_active ?? true
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ staff: data })
  } catch (error: any) {
    console.error('Error adding staff:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const { id, business_id, is_active } = await request.json()
  if (!id || !business_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const authSupabase = createClient()
  const { data: { user } } = await authSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: business } = await supabase.from('businesses').select('owner_id').eq('id', business_id).single()
  if (business?.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('staff')
    .update({ is_active })
    .eq('id', id)
    .eq('business_id', business_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ staff: data })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const business_id = searchParams.get('business_id')
  if (!id || !business_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const authSupabase = createClient()
  const { data: { user } } = await authSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: business } = await supabase.from('businesses').select('owner_id').eq('id', business_id).single()
  if (business?.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('staff').delete().eq('id', id).eq('business_id', business_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
