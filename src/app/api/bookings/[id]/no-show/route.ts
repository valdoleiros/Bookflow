import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createServiceClient()

  const { data: booking } = await admin
    .from('bookings')
    .select('id, status, start_time, business_id')
    .eq('id', params.id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Marcação não encontrada.' }, { status: 404 })

  const { data: business } = await admin
    .from('businesses').select('owner_id').eq('id', booking.business_id).single()
  if (business?.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (booking.status !== 'confirmed') {
    return NextResponse.json({ error: 'Só marcações confirmadas podem ser marcadas como falta.' }, { status: 400 })
  }

  if (new Date(booking.start_time) > new Date()) {
    return NextResponse.json({ error: 'Não é possível marcar falta em marcações futuras.' }, { status: 400 })
  }

  await admin.from('bookings').update({ status: 'no_show' }).eq('id', params.id)
  return NextResponse.json({ message: 'Marcado como falta.' })
}
