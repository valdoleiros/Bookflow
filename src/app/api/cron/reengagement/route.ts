// Cron: runs daily — sends "we miss you" SMS to customers inactive for 30 days
// vercel.json schedule: "0 10 * * *" (10h UTC daily)

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendSms } from '@/lib/sms'
import { subDays, differenceInDays, parseISO } from 'date-fns'

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now      = new Date()
  const windowStart = subDays(now, 35).toISOString() // last booking between 25-35 days ago
  const windowEnd   = subDays(now, 25).toISOString()

  // Find customers whose most recent booking ended 25-35 days ago,
  // who haven't received a reengagement SMS in 30 days
  const { data: candidates } = await supabase
    .from('customers')
    .select(`
      id, name, phone, business_id, last_reengagement_at,
      businesses ( name, slug )
    `)
    .not('phone', 'is', null)
    .eq('sms_consent', true)   // Only send marketing SMS to customers who opted in
    .or(`last_reengagement_at.is.null,last_reengagement_at.lte.${subDays(now, 30).toISOString()}`)

  if (!candidates?.length) return NextResponse.json({ sent: 0 })

  let sent = 0

  for (const customer of candidates) {
    // Check if their last booking was in the 25-35 day window
    const { data: lastBooking } = await supabase
      .from('bookings')
      .select('start_time')
      .eq('customer_id', customer.id)
      .eq('status', 'confirmed')
      .order('start_time', { ascending: false })
      .limit(1)
      .single()

    if (!lastBooking) continue

    const daysSince = differenceInDays(now, parseISO(lastBooking.start_time))
    if (daysSince < 25 || daysSince > 35) continue

    const biz     = customer.businesses as any
    const bizName = biz?.name ?? 'a barbearia'
    const link    = `${process.env.NEXT_PUBLIC_APP_URL}/${biz?.slug ?? ''}`
    // Plain ASCII — Twilio trial accounts reject SMS with too many segments
    // (emoji/accents force UCS-2 at 70 chars/segment instead of 160 GSM-7).
    const message = `Ola ${customer.name}! Ja la nao vais a ${bizName} ha ${daysSince} dias. Marca aqui: ${link}\n\nResponde STOP para cancelar.`

    const result = await sendSms(customer.phone!, message)
    if (result.success) {
      await supabase
        .from('customers')
        .update({ last_reengagement_at: now.toISOString() })
        .eq('id', customer.id)
      sent++
    }
  }

  return NextResponse.json({ sent })
}
