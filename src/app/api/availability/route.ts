// src/app/api/availability/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase/server'

export async function PUT(req: NextRequest) {
  const { business_id, availability } = await req.json()

  if (!business_id || !Array.isArray(availability)) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
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

  // Upsert each day rule, now including staff_id
  const rows = availability.map((a: any) => ({
    ...(a.id && !a.id.startsWith('new-') ? { id: a.id } : {}),
    business_id,
    staff_id: a.staff_id || null,
    day_of_week: a.day_of_week,
    start_hour: a.start_hour,
    end_hour: a.end_hour,
    is_active: a.is_active,
  }))

  // Para regras com staff_id específico, fazemos upsert individual
  // Para regras gerais (staff_id null), usamos o conflito original
  for (const row of rows) {
    if (row.id) {
      // Update existing row
      const { error } = await supabase
        .from('availability')
        .update(row)
        .eq('id', row.id)
      if (error) {
        console.error('Availability update error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else {
      // Insert new row
      const { error } = await supabase
        .from('availability')
        .insert(row)
      if (error) {
        console.error('Availability insert error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ ok: true })
}