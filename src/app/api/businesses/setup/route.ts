import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

function parseJwt(token: string): { sub?: string; email?: string; exp?: number } | null {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'))
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  // Try cookie-based auth first (works after page reloads)
  const supabase = createClient()
  let userId: string | null = null
  let userEmail: string | null = null

  const { data: { user: cookieUser } } = await supabase.auth.getUser()
  if (cookieUser) {
    userId = cookieUser.id
    userEmail = cookieUser.email ?? null
  }

  // Fallback: verify Bearer token from header (right after signUp, cookies not yet propagated)
  if (!userId) {
    const authHeader = req.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const payload = parseJwt(token)
      if (payload?.sub && payload.exp && payload.exp > Math.floor(Date.now() / 1000)) {
        userId = payload.sub
        userEmail = payload.email ?? null
      }
    }
  }

  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { name, slug, phone, timezone } = await req.json()

  if (!name?.trim() || !slug?.trim()) {
    return NextResponse.json({ error: 'Nome e slug são obrigatórios' }, { status: 400 })
  }

  const slugFormatted = slug.toLowerCase().trim()

  const service = createServiceClient()

  const { data: existing } = await service
    .from('businesses')
    .select('id')
    .eq('owner_id', userId)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'Já tem uma barbearia registada' }, { status: 409 })
  }

  const { data: business, error: bizError } = await service
    .from('businesses')
    .insert({
      owner_id: userId,
      name: name.trim(),
      slug: slugFormatted,
      email: userEmail ?? '',
      phone: phone?.trim() || null,
      timezone:             timezone || 'Europe/Lisbon',
      trial_ends_at:        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      subscription_status:  'trial',
    })
    .select('id')
    .single()

  if (bizError) {
    if (bizError.code === '23505') {
      return NextResponse.json({ error: 'Este endereço já está em uso. Escolhe outro.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro ao criar barbearia' }, { status: 500 })
  }

  await service.from('services').insert([
    { business_id: business.id, name: 'Corte de Cabelo', duration_minutes: 30, price: 10.00 },
    { business_id: business.id, name: 'Barba', duration_minutes: 20, price: 7.00 },
    { business_id: business.id, name: 'Corte + Barba', duration_minutes: 45, price: 15.00 },
  ])

  const days = [
    { day_of_week: 0, is_active: false },
    { day_of_week: 1, is_active: true },
    { day_of_week: 2, is_active: true },
    { day_of_week: 3, is_active: true },
    { day_of_week: 4, is_active: true },
    { day_of_week: 5, is_active: true },
    { day_of_week: 6, is_active: true },
  ]
  await service.from('availability').insert(
    days.map(d => ({
      business_id: business.id,
      staff_id: null,
      day_of_week: d.day_of_week,
      start_hour: '09:00',
      end_hour: '19:00',
      is_active: d.is_active,
    }))
  )

  return NextResponse.json({ businessId: business.id })
}
