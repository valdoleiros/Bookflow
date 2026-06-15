import { NextRequest, NextResponse } from 'next/server'
import { createBooking } from '@/lib/bookings'

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = await createBooking({
    business_id:          body.business_id,
    service_id:           body.service_id,
    start_time:           body.start_time,
    customer_name:        body.customer_name,
    customer_phone:       body.customer_phone,
    customer_email:       body.customer_email,
    customer_sms_consent: body.customer_sms_consent,
    staff_id:             body.staff_id,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json(
    { booking_id: result.bookingId, message: 'Marcação confirmada!' },
    { status: 201 }
  )
}
