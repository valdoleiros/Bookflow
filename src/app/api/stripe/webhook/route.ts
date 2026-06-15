import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createBooking } from '@/lib/bookings'
import { sendSms } from '@/lib/sms'
import type Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sig     = req.headers.get('stripe-signature') ?? ''

  let stripe
  try {
    stripe = getStripe()
  } catch {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const m = session.metadata ?? {}

    if (m.kind === 'booking' && session.payment_status === 'paid') {
      const amountPaid = (session.amount_total ?? 0) / 100

      const result = await createBooking(
        {
          business_id:          m.business_id,
          service_id:           m.service_id,
          start_time:           m.start_time,
          customer_name:        m.customer_name,
          customer_phone:       m.customer_phone,
          customer_email:       m.customer_email || null,
          customer_sms_consent: m.customer_sms_consent === 'true',
          staff_id:             m.staff_id || null,
          payment:              { amountPaid, stripeSessionId: session.id },
        },
        { skipAbuseChecks: true }
      )

      // The slot was taken between payment start and confirmation (rare race).
      // Refund the customer and let them know — never keep money without a booking.
      if (!result.ok && result.status === 409) {
        try {
          if (session.payment_intent) {
            await stripe.refunds.create({ payment_intent: session.payment_intent as string })
          }
        } catch { /* best-effort refund */ }

        if (m.customer_phone) {
          // Plain ASCII — Twilio trial accounts reject SMS with too many segments
          // (emoji/accents/€ force UCS-2 at 70 chars/segment instead of 160 GSM-7).
          await sendSms(
            m.customer_phone,
            `Pedimos desculpa: o horario escolhido foi ocupado entretanto e a marcacao nao foi confirmada. O pagamento de ${amountPaid.toFixed(2)} EUR foi devolvido. Tenta outro horario.`
          )
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}
