import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendSms } from '@/lib/sms'
import { addHours, isBefore, parseISO } from 'date-fns'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*, businesses(name), services(name), customers(name, phone)')
    .eq('status', 'confirmed')
    .eq('reminder_sent', false)

  if (error) {
    console.error('[CRON] Erro ao procurar marcações:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ success: true, sent: 0 })
  }

  const now = new Date()
  const windowEnd = addHours(now, 4.25)
  let sentCount = 0

  for (const booking of bookings) {
    const startTime = parseISO(booking.start_time)

    if (!isBefore(startTime, windowEnd) || !isBefore(now, startTime)) continue

    const customerPhone = booking.customers?.phone
    if (!customerPhone) continue

    const timeFormatted = startTime.toLocaleTimeString('pt-PT', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: booking.businesses?.timezone ?? 'Europe/Lisbon',
    })

    // Plain ASCII, kept short — Twilio trial accounts reject SMS over 1 segment
    // (160 GSM-7 chars; emoji/accents force UCS-2 at 70 chars/segment).
    const message = `Lembrete: marcacao de ${booking.services?.name ?? 'servico'} hoje as ${timeFormatted} - ${booking.businesses?.name ?? 'barbearia'}.`

    const { success } = await sendSms(customerPhone, message)

    if (success) {
      await supabase.from('bookings').update({ reminder_sent: true }).eq('id', booking.id)
      sentCount++
    }
  }

  return NextResponse.json({ success: true, sent: sentCount })
}
