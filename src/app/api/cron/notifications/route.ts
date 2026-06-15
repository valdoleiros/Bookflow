// src/app/api/cron/notifications/route.ts
// ============================================================
// Cron Job: Process pending notifications
// Runs every 5-10 min via Vercel Cron
// Vercel config in vercel.json:
//   { "crons": [{ "path": "/api/cron/notifications", "schedule": "*/5 * * * *" }] }
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendNotification } from '@/lib/notifications'
import type { BookingWithDetails } from '@/types'

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return req.headers.get('authorization') === `Bearer ${cronSecret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date().toISOString()

  // Fetch due notifications (pending + scheduled_time <= now)
  const { data: dueNotifications, error } = await supabase
    .from('notifications')
    .select(`
      id,
      type,
      channel,
      booking_id,
      bookings (
        id,
        start_time,
        end_time,
        status,
        notes,
        created_at,
        business_id,
        service_id,
        customer_id,
        businesses ( id, name, email, phone, slug, timezone, created_at ),
        services ( id, business_id, name, duration_minutes, price, is_active, created_at ),
        customers ( id, name, phone, email, created_at )
      )
    `)
    .eq('status', 'pending')
    .lte('scheduled_time', now)
    .limit(50) // Process in batches

  if (error) {
    console.error('Cron fetch error:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!dueNotifications || dueNotifications.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  let sent = 0
  let failed = 0

  for (const notif of dueNotifications) {
    const booking = notif.bookings as any
    if (!booking || booking.status === 'cancelled') {
      // Mark as failed / skip
      await supabase
        .from('notifications')
        .update({ status: 'failed', error_message: 'Booking cancelled or missing' })
        .eq('id', notif.id)
      continue
    }

    const bookingWithDetails: BookingWithDetails = {
      ...booking,
      business: booking.businesses,
      service: booking.services,
      customer: booking.customers,
    }

    const result = await sendNotification(
      bookingWithDetails,
      notif.type as any,
      notif.channel as any
    )

    if (result.success) {
      await supabase
        .from('notifications')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', notif.id)
      sent++
    } else {
      await supabase
        .from('notifications')
        .update({ status: 'failed', error_message: result.error ?? 'Unknown error' })
        .eq('id', notif.id)
      failed++
    }
  }

  return NextResponse.json({ processed: dueNotifications.length, sent, failed })
}