import { createServiceClient } from '@/lib/supabase/server'
import { generateSlots } from '@/lib/slots'
import { buildNotificationSchedule } from '@/lib/notifications'
import { sendBookingConfirmation } from '@/lib/email'
import { sendSms } from '@/lib/sms'
import { parseISO, addMinutes, startOfDay, format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

// Max confirmed bookings per business per calendar day before we reject new ones.
const DAILY_HARD_CAP = 200
// After this many bookings today, skip SMS scheduling to cap daily Twilio spend.
const DAILY_SMS_CAP = 50
// Max bookings a single phone can make in a 30-minute window (anti-spam).
const RATE_LIMIT_PER_30_MIN = 3
// Portuguese phone: optional +351, then 9 digits; also accepts E.164.
const PHONE_RE = /^\+?[1-9]\d{7,14}$/

export interface CreateBookingInput {
  business_id: string
  service_id: string
  start_time: string
  customer_name: string
  customer_phone: string
  customer_email?: string | null
  customer_sms_consent?: boolean
  staff_id?: string | null
  // When the booking was pre-paid via Stripe (set by the webhook).
  payment?: { amountPaid: number; stripeSessionId: string }
}

export type CreateBookingResult =
  | { ok: true; bookingId: string; idempotent?: boolean }
  | { ok: false; status: number; error: string }

interface Options {
  // Skip rate-limit / daily-cap checks (used for the already-paid webhook path).
  skipAbuseChecks?: boolean
}

// ── Compute how much (if anything) the customer must pre-pay ──
// Returns the amount in cents. 0 = no pre-payment required.
export function computePrepaymentCents(
  business: { prepayment_mode?: string | null; prepayment_value?: number | null },
  service: { price?: number | null }
): number {
  const mode  = business.prepayment_mode ?? 'off'
  const price = Number(service.price ?? 0)
  const value = Number(business.prepayment_value ?? 0)

  let euros = 0
  if (mode === 'full')                euros = price
  else if (mode === 'deposit_fixed')  euros = value
  else if (mode === 'deposit_percent') euros = price * (value / 100)
  else return 0

  const cents = Math.round(euros * 100)
  // MB WAY / cards require ≥ 0.50€. Below that, treat as no pre-payment.
  if (cents < 50) return 0
  // Never charge more than the service price.
  const priceCents = Math.round(price * 100)
  return priceCents > 0 ? Math.min(cents, priceCents) : cents
}

// ── Core booking creation — shared by the public route and the Stripe webhook ──
export async function createBooking(
  input: CreateBookingInput,
  opts: Options = {}
): Promise<CreateBookingResult> {
  const {
    business_id, service_id, start_time, customer_name,
    customer_phone, customer_email, customer_sms_consent, staff_id, payment,
  } = input

  // ── 1. Basic field validation ─────────────────────────────
  if (!business_id || !service_id || !start_time || !customer_name || !customer_phone) {
    return { ok: false, status: 400, error: 'Missing required fields' }
  }

  const phoneClean = String(customer_phone).replace(/[\s\-() ]/g, '')
  if (!PHONE_RE.test(phoneClean)) {
    return { ok: false, status: 400, error: 'Número de telefone inválido.' }
  }

  const startDate = parseISO(start_time)
  if (isNaN(startDate.getTime())) {
    return { ok: false, status: 400, error: 'Invalid start_time' }
  }
  if (startDate < new Date()) {
    return { ok: false, status: 400, error: 'Cannot book in the past' }
  }

  const supabase = createServiceClient()
  const todayStart   = startOfDay(new Date()).toISOString()
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

  // ── 2. Parallel DB fetch ──────────────────────────────────
  const [
    { data: business },
    { data: service },
    { data: availability },
    { data: existingBookings },
    { data: closedPeriods },
    { data: staffList },
    { count: bookingsToday },
  ] = await Promise.all([
    supabase.from('businesses').select('id, name, timezone').eq('id', business_id).single(),
    supabase.from('services').select('*').eq('id', service_id).eq('business_id', business_id).eq('is_active', true).single(),
    supabase.from('availability').select('*').eq('business_id', business_id).eq('is_active', true),
    supabase.from('bookings').select('id, start_time, end_time, status, staff_id')
      .eq('business_id', business_id).neq('status', 'cancelled')
      .gte('start_time', new Date(startDate.getTime() - 24 * 60 * 60 * 1000).toISOString())
      .lte('start_time', new Date(startDate.getTime() + 24 * 60 * 60 * 1000).toISOString()),
    supabase.from('closed_periods').select('*').eq('business_id', business_id).eq('date', start_time.split('T')[0]),
    supabase.from('staff').select('id').eq('business_id', business_id).eq('is_active', true),
    supabase.from('bookings').select('id', { count: 'exact', head: true })
      .eq('business_id', business_id).neq('status', 'cancelled').gte('created_at', todayStart),
  ])

  if (!business || !service) {
    return { ok: false, status: 404, error: 'Business or Service not found' }
  }

  // ── 3. Daily hard cap ──────────────────────────────────────
  if (!opts.skipAbuseChecks && (bookingsToday ?? 0) >= DAILY_HARD_CAP) {
    return { ok: false, status: 429, error: 'Agenda completa para hoje. Tenta amanhã ou contacta a barbearia.' }
  }

  // ── 4. Per-phone rate limiting ─────────────────────────────
  const { data: existingCustomer } = await supabase
    .from('customers').select('id').eq('phone', phoneClean).eq('business_id', business_id).maybeSingle()

  if (!opts.skipAbuseChecks && existingCustomer) {
    const { count: recentCount } = await supabase
      .from('bookings').select('id', { count: 'exact', head: true })
      .eq('customer_id', existingCustomer.id).gte('created_at', thirtyMinAgo)
    if ((recentCount ?? 0) >= RATE_LIMIT_PER_30_MIN) {
      return { ok: false, status: 429, error: 'Demasiadas marcações num curto período. Aguarda alguns minutos.' }
    }
  }

  // ── 5. Slot availability check ─────────────────────────────
  const endDate = addMinutes(startDate, service.duration_minutes)
  let assignedStaffId = staff_id ?? null

  const activeStaffIds = (staffList && staffList.length > 0) ? staffList.map((s: any) => s.id) : [null]
  const staffToEvaluate = assignedStaffId
    ? activeStaffIds.filter((id: any) => id === assignedStaffId)
    : activeStaffIds

  let slotFound = false
  for (const sId of staffToEvaluate) {
    const staffAvailability = (availability ?? []).filter(
      (a: any) => a.staff_id === sId || a.staff_id === null || a.staff_id === undefined
    )
    const resolvedAvailability = []
    for (let i = 0; i < 7; i++) {
      const specific = staffAvailability.find((a: any) => a.day_of_week === i && a.staff_id === sId && sId !== null)
      const general  = staffAvailability.find((a: any) => a.day_of_week === i && (a.staff_id === null || a.staff_id === undefined))
      if (specific) resolvedAvailability.push(specific)
      else if (general) resolvedAvailability.push(general)
    }

    const staffBookings = sId !== null
      ? (existingBookings ?? []).filter((b: any) => b.staff_id === sId)
      : (existingBookings ?? []).filter((b: any) => b.staff_id === null || b.staff_id === undefined)

    const staffClosed = (closedPeriods ?? []).filter(
      (cp: any) => cp.staff_id === sId || cp.staff_id === null || cp.staff_id === undefined
    )

    const slots = generateSlots({
      date: startDate,
      durationMinutes: service.duration_minutes,
      availability: resolvedAvailability,
      existingBookings: staffBookings as any[],
      closedPeriods: staffClosed as any[],
      timezone: business.timezone,
      slotIntervalMinutes: 30,
    })

    const requestedSlot = slots.find((s) => s.start === startDate.toISOString() && s.available)
    if (requestedSlot) {
      slotFound = true
      assignedStaffId = sId
      break
    }
  }

  if (!slotFound) {
    return { ok: false, status: 409, error: 'Slot not available' }
  }

  // ── 6. Upsert customer ─────────────────────────────────────
  let customerId: string
  const consentAt = customer_sms_consent ? new Date().toISOString() : null

  if (existingCustomer) {
    customerId = existingCustomer.id
    await supabase.from('customers').update({
      name: customer_name,
      ...(customer_email ? { email: customer_email } : {}),
      ...(customer_sms_consent ? { sms_consent: true, sms_consent_at: consentAt } : {}),
    }).eq('id', customerId)
  } else {
    const { data: newCustomer, error: customerErr } = await supabase
      .from('customers')
      .insert({
        business_id,
        name: customer_name,
        phone: phoneClean,
        email: customer_email ?? null,
        sms_consent: customer_sms_consent ?? false,
        sms_consent_at: consentAt,
      })
      .select('id').single()
    if (customerErr || !newCustomer) {
      return { ok: false, status: 500, error: 'Failed to create customer' }
    }
    customerId = newCustomer.id
  }

  // ── 7. Create booking — DB constraint catches any race ─────
  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .insert({
      business_id,
      service_id,
      customer_id: customerId,
      staff_id: assignedStaffId,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      status: 'confirmed',
      payment_status: payment ? 'paid' : 'none',
      amount_paid: payment ? payment.amountPaid : null,
      stripe_session_id: payment ? payment.stripeSessionId : null,
    })
    .select('id').single()

  if (bookingErr) {
    if (bookingErr.code === '23505') {
      const { data: ownBooking } = await supabase
        .from('bookings').select('id')
        .eq('business_id', business_id).eq('customer_id', customerId)
        .eq('start_time', startDate.toISOString()).eq('status', 'confirmed')
        .maybeSingle()
      if (ownBooking) {
        return { ok: true, bookingId: ownBooking.id, idempotent: true }
      }
      return { ok: false, status: 409, error: 'Este horário foi reservado por outra pessoa. Por favor, escolhe outro.' }
    }
    return { ok: false, status: 500, error: 'Failed to create booking' }
  }
  if (!booking) {
    return { ok: false, status: 500, error: 'Failed to create booking' }
  }

  // ── 8. SMS confirmation — sent IMMEDIATELY ─────────────────
  const smsCapped = (bookingsToday ?? 0) >= DAILY_SMS_CAP
  if (!smsCapped) {
    const zonedDate = toZonedTime(startDate, business.timezone)
    const dateStr   = format(zonedDate, 'dd/MM')
    const timeStr   = format(zonedDate, 'HH:mm')
    const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/booking/${booking.id}/cancel`

    // Plain ASCII, kept short — Twilio trial accounts reject SMS over 1 segment
    // (160 GSM-7 chars; emoji/accents force UCS-2 at 70 chars/segment).
    const confirmMsg = `Marcacao confirmada: ${service.name}, ${dateStr} as ${timeStr}h. Cancelar: ${cancelUrl}`
    // Awaited — on serverless, fire-and-forget calls can be frozen before they complete.
    await sendSms(phoneClean, confirmMsg)

    const reminders = buildNotificationSchedule({ id: booking.id, start_time: startDate.toISOString() })
      .filter(n => n.type !== 'confirmation')
    if (reminders.length > 0) {
      await supabase.from('notifications').insert(reminders)
    }
  }

  // ── 9. Confirmation email ──────────────────────────────────
  if (customer_email) {
    let staffName: string | null = null
    if (assignedStaffId) {
      const { data: staffMember } = await supabase
        .from('staff').select('name').eq('id', assignedStaffId).single()
      staffName = staffMember?.name ?? null
    }
    // Awaited — on serverless, fire-and-forget calls can be frozen before they complete.
    await sendBookingConfirmation({
      to: customer_email,
      customerName: customer_name,
      businessName: (business as any).name,
      serviceName: service.name,
      startTime: startDate.toISOString(),
      timezone: business.timezone,
      staffName,
      bookingId: booking.id,
    })
  }

  return { ok: true, bookingId: booking.id }
}
