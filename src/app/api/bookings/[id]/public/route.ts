import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Returns safe booking data for the public reschedule page — no customer PII.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServiceClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      id, start_time, status,
      services ( id, name, duration_minutes, price ),
      staff   ( id, name ),
      businesses ( id, name, slug, timezone )
    `)
    .eq('id', params.id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Marcação não encontrada.' }, { status: 404 })

  return NextResponse.json({
    id:          booking.id,
    start_time:  booking.start_time,
    status:      booking.status,
    service:     booking.services,
    staff:       booking.staff,
    business:    booking.businesses,
  })
}
