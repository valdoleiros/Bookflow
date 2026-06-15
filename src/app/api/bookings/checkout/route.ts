import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { computePrepaymentCents } from '@/lib/bookings'

// Creates a Stripe Checkout session (MB WAY / card) for an online booking.
// The booking itself is only created AFTER payment succeeds (in the webhook),
// so an abandoned payment never holds a slot.
export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { business_id, service_id, start_time, customer_name, customer_phone, customer_email, customer_sms_consent, staff_id } = body

  if (!business_id || !service_id || !start_time || !customer_name || !customer_phone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const [{ data: business }, { data: service }] = await Promise.all([
    supabase.from('businesses').select('id, name, slug, prepayment_mode, prepayment_value').eq('id', business_id).single(),
    supabase.from('services').select('id, name, price, is_active').eq('id', service_id).eq('business_id', business_id).single(),
  ])

  if (!business || !service || service.is_active === false) {
    return NextResponse.json({ error: 'Business or Service not found' }, { status: 404 })
  }

  const amountCents = computePrepaymentCents(business, service)
  if (amountCents <= 0) {
    // No pre-payment required for this business/service — caller should book directly.
    return NextResponse.json({ prepaymentRequired: false })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  let stripe
  try {
    stripe = getStripe()
  } catch {
    return NextResponse.json({ error: 'Pagamentos não estão configurados.' }, { status: 503 })
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    // Explicitly offer MB WAY (the dominant PT method) alongside cards. Listing
    // them here guarantees both show, regardless of the account's dynamic
    // payment-method config. Both require an EUR amount, which we always use.
    payment_method_types: ['card', 'mb_way'],
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'eur',
        unit_amount: amountCents,
        product_data: { name: `${service.name} — ${business.name}` },
      },
    }],
    locale: 'pt',
    customer_email: customer_email || undefined,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min to pay
    metadata: {
      kind:                 'booking',
      business_id,
      service_id,
      staff_id:             staff_id ?? '',
      start_time,
      customer_name,
      customer_phone,
      customer_email:       customer_email ?? '',
      customer_sms_consent: customer_sms_consent ? 'true' : 'false',
    },
    success_url: `${appUrl}/booking/sucesso?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${appUrl}/${business.slug}?pagamento=cancelado`,
  })

  return NextResponse.json({ url: session.url })
}
