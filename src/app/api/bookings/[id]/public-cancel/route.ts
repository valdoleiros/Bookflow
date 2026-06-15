import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Public endpoint — no auth required. UUIDs are unguessable (128-bit).
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServiceClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status')
    .eq('id', params.id)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Marcação não encontrada.' }, { status: 404 })
  }

  if (booking.status === 'cancelled') {
    return NextResponse.json({ error: 'Esta marcação já foi cancelada.' }, { status: 400 })
  }

  if (booking.status !== 'confirmed') {
    return NextResponse.json({ error: 'Não é possível cancelar esta marcação.' }, { status: 400 })
  }

  await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', params.id)

  await supabase
    .from('notifications')
    .update({ status: 'failed', error_message: 'Booking cancelled by customer' })
    .eq('booking_id', params.id)
    .eq('status', 'pending')

  return NextResponse.json({ message: 'Marcação cancelada com sucesso.' })
}
