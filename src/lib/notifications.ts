import { Resend } from 'resend'
import { format, parseISO } from 'date-fns'
import { pt } from 'date-fns/locale'
import { toZonedTime } from 'date-fns-tz'
import { sendSms } from '@/lib/sms'
import type { BookingWithDetails, NotificationType, NotificationChannel } from '@/types'

const resend   = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = process.env.FROM_EMAIL ?? 'noreply@bookflow.app'

// ── Main dispatcher ───────────────────────────────────────
export async function sendNotification(
  booking: BookingWithDetails,
  type: NotificationType,
  channel: NotificationChannel = 'email'
): Promise<{ success: boolean; error?: string }> {
  try {
    if (channel === 'sms')   return await sendSmsNotification(booking, type)
    if (channel === 'email') return await sendEmailNotification(booking, type)
    return { success: false, error: 'Unknown channel' }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ── SMS via Twilio ────────────────────────────────────────
async function sendSmsNotification(
  booking: BookingWithDetails,
  type: NotificationType
): Promise<{ success: boolean; error?: string }> {
  if (!booking.customer.phone) {
    return { success: false, error: 'No customer phone' }
  }

  const { business, service, customer } = booking
  const tz = business.timezone
  const dateStr = format(
    toZonedTime(parseISO(booking.start_time), tz),
    "dd/MM 'as' HH:mm"
  )
  const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/booking/${booking.id}/cancel`

  // Plain ASCII, kept short — Twilio trial accounts reject SMS over 1 segment
  // (160 GSM-7 chars; emoji/accents force UCS-2 at 70 chars/segment).
  let message: string

  if (type === 'confirmation') {
    message = `Marcacao confirmada: ${service.name}, ${dateStr}. Cancelar: ${cancelUrl}`
  } else {
    const label = type === 'reminder_24h' ? '24h' : '2h'
    message = `Lembrete: marcacao em ${label} - ${service.name}, ${dateStr}. Cancelar: ${cancelUrl}`
  }

  return sendSms(booking.customer.phone, message)
}

// ── Email via Resend ──────────────────────────────────────
async function sendEmailNotification(
  booking: BookingWithDetails,
  type: NotificationType
): Promise<{ success: boolean; error?: string }> {
  if (!booking.customer.email) {
    return { success: false, error: 'No customer email' }
  }

  const { subject, html } = buildEmailContent(booking, type)
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: booking.customer.email,
    subject,
    html,
  })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

function buildEmailContent(
  booking: BookingWithDetails,
  type: NotificationType
): { subject: string; html: string } {
  const { business, service } = booking
  const tz = business.timezone

  const dateStr = format(
    toZonedTime(parseISO(booking.start_time), tz),
    "EEEE, d 'de' MMMM",
    { locale: pt }
  )
  const timeStr  = format(toZonedTime(parseISO(booking.start_time), tz), 'HH:mm')
  const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/booking/${booking.id}/cancel`

  const baseStyle = `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#111;`

  if (type === 'confirmation') {
    return {
      subject: `Marcação confirmada – ${business.name}`,
      html: `<div style="${baseStyle}">
        <h1 style="font-size:24px;font-weight:700;margin-bottom:4px;">✅ Marcação Confirmada</h1>
        <p style="color:#555;margin-bottom:24px;">${business.name}</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;width:40%;">Serviço</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;">${service.name}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;">Data</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;">${dateStr}</td></tr>
          <tr><td style="padding:10px 0;color:#888;">Hora</td><td style="padding:10px 0;font-weight:600;">${timeStr}</td></tr>
        </table>
        <a href="${cancelUrl}" style="display:inline-block;margin-top:24px;padding:12px 20px;background:#f5f5f5;border-radius:8px;color:#111;text-decoration:none;font-size:14px;">Cancelar marcação</a>
        <p style="margin-top:32px;font-size:12px;color:#bbb;">Powered by BookFlow</p>
      </div>`,
    }
  }

  const reminderLabel = type === 'reminder_24h' ? '24 horas' : '2 horas'
  return {
    subject: `Lembrete: marcação em ${reminderLabel} – ${business.name}`,
    html: `<div style="${baseStyle}">
      <h1 style="font-size:24px;font-weight:700;margin-bottom:4px;">⏰ Lembrete de Marcação</h1>
      <p style="color:#555;margin-bottom:24px;">A sua marcação em <strong>${business.name}</strong> é em ${reminderLabel}.</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;width:40%;">Serviço</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;">${service.name}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;">Data</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;">${dateStr}</td></tr>
        <tr><td style="padding:10px 0;color:#888;">Hora</td><td style="padding:10px 0;font-weight:600;">${timeStr}</td></tr>
      </table>
      <a href="${cancelUrl}" style="display:inline-block;margin-top:24px;padding:12px 20px;background:#f5f5f5;border-radius:8px;color:#111;text-decoration:none;font-size:14px;">Cancelar marcação</a>
    </div>`,
  }
}

// ── Schedule notifications for a new booking ─────────────
export function buildNotificationSchedule(booking: {
  id: string
  start_time: string
}): Array<{
  booking_id: string
  type: NotificationType
  channel: NotificationChannel
  scheduled_time: string
}> {
  const startTime = parseISO(booking.start_time)
  const now       = new Date()
  const schedule  = []

  // Immediate confirmation via SMS
  schedule.push({
    booking_id: booking.id,
    type: 'confirmation' as NotificationType,
    channel: 'sms' as NotificationChannel,
    scheduled_time: now.toISOString(),
  })

  // 24h reminder
  const time24h = new Date(startTime.getTime() - 24 * 60 * 60 * 1000)
  if (time24h > now) {
    schedule.push({
      booking_id: booking.id,
      type: 'reminder_24h' as NotificationType,
      channel: 'sms' as NotificationChannel,
      scheduled_time: time24h.toISOString(),
    })
  }

  // 2h reminder
  const time2h = new Date(startTime.getTime() - 2 * 60 * 60 * 1000)
  if (time2h > now) {
    schedule.push({
      booking_id: booking.id,
      type: 'reminder_2h' as NotificationType,
      channel: 'sms' as NotificationChannel,
      scheduled_time: time2h.toISOString(),
    })
  }

  return schedule
}
