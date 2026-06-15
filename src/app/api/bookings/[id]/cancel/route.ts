// src/app/api/bookings/[id]/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const bookingId = params.id
  const supabaseAuth = createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Verify booking exists
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, start_time, business_id')
    .eq('id', bookingId)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  // Verify ownership
  const { data: business } = await supabase.from('businesses').select('owner_id').eq('id', booking.business_id).single()
  if (business?.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (booking.status !== 'confirmed') {
    return NextResponse.json(
      { error: `Cannot cancel a ${booking.status} booking` },
      { status: 400 }
    )
  }

  // Cancel the booking
  await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)

  // Cancel pending notifications
  await supabase
    .from('notifications')
    .update({ status: 'failed', error_message: 'Booking cancelled' })
    .eq('booking_id', bookingId)
    .eq('status', 'pending')

  return NextResponse.json({ message: 'Marcação cancelada.' })
}