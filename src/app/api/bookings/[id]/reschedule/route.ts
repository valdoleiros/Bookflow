import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateSlots } from '@/lib/slots'
import { buildNotificationSchedule } from '@/lib/notifications'
import { parseISO, addMinutes } from 'date-fns'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { new_start_time } = await req.json()

  if (!new_start_time) {
    return NextResponse.json({ error: 'new_start_time é obrigatório.' }, { status: 400 })
  }

  const newStart = parseISO(new_start_time)
  if (isNaN(newStart.getTime()) || newStart < new Date()) {
    return NextResponse.json({ error: 'Data/hora inválida ou no passado.' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Fetch original booking with all related data
  const { data: original } = await supabase
    .from('bookings')
    .select(`
      id, status, start_time, staff_id, customer_id, business_id, service_id,
      services ( id, name, duration_minutes, price, is_active ),
      businesses ( id, name, timezone )
    `)
    .eq('id', params.id)
    .single()

  if (!original) return NextResponse.json({ error: 'Marcação não encontrada.' }, { status: 404 })
  if (original.status !== 'confirmed') {
    return NextResponse.json({ error: 'Só é possível reagendar marcações confirmadas.' }, { status: 400 })
  }

  const service  = original.services as any
  const business = original.businesses as any

  // Fetch availability + existing bookings for the new date
  const [
    { data: availability },
    { data: existingBookings },
    { data: closedPeriods },
  ] = await Promise.all([
    supabase.from('availability').select('*').eq('business_id', original.business_id).eq('is_active', true),
    supabase.from('bookings').select('id, start_time, end_time, status, staff_id')
      .eq('business_id', original.business_id)
      .neq('status', 'cancelled')
      .neq('id', params.id)  // exclude the booking being rescheduled
      .gte('start_time', new Date(newStart.getTime() - 24 * 60 * 60 * 1000).toISOString())
      .lte('start_time', new Date(newStart.getTime() + 24 * 60 * 60 * 1000).toISOString()),
    supabase.from('closed_periods').select('*')
      .eq('business_id', original.business_id)
      .eq('date', new_start_time.split('T')[0]),
  ])

  // Validate the new slot is available
  const sId = original.staff_id ?? null
  const staffAvailability = (availability ?? []).filter(
    (a: any) => a.staff_id === sId || a.staff_id === null
  )
  const resolvedAvailability = []
  for (let i = 0; i < 7; i++) {
    const specific = staffAvailability.find((a: any) => a.day_of_week === i && a.staff_id === sId && sId !== null)
    const general  = staffAvailability.find((a: any) => a.day_of_week === i && (a.staff_id === null || a.staff_id === undefined))
    if (specific) resolvedAvailability.push(specific)
    else if (general) resolvedAvailability.push(general)
  }

  const staffBookings = sId
    ? (existingBookings ?? []).filter((b: any) => b.staff_id === sId)
    : (existingBookings ?? []).filter((b: any) => !b.staff_id)

  const slots = generateSlots({
    date: newStart,
    durationMinutes: service.duration_minutes,
    availability: resolvedAvailability,
    existingBookings: staffBookings as any[],
    closedPeriods: (closedPeriods ?? []) as any[],
    timezone: business.timezone,
    slotIntervalMinutes: 30,
  })

  const targetSlot = slots.find(s => s.start === newStart.toISOString() && s.available)
  if (!targetSlot) {
    return NextResponse.json({ error: 'Este horário não está disponível. Escolhe outro.' }, { status: 409 })
  }

  const newEnd = addMinutes(newStart, service.duration_minutes)

  // Create new booking first — if it fails, original is untouched
  const { data: newBooking, error: newErr } = await supabase
    .from('bookings')
    .insert({
      business_id: original.business_id,
      service_id:  original.service_id,
      customer_id: original.customer_id,
      staff_id:    original.staff_id,
      start_time:  newStart.toISOString(),
      end_time:    newEnd.toISOString(),
      status:      'confirmed',
    })
    .select('id')
    .single()

  if (newErr) {
    if (newErr.code === '23505') {
      return NextResponse.json({ error: 'Este horário acabou de ser reservado. Escolhe outro.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro ao criar nova marcação.' }, { status: 500 })
  }

  // Cancel original + its notifications
  await Promise.all([
    supabase.from('bookings').update({ status: 'cancelled' }).eq('id', params.id),
    supabase.from('notifications')
      .update({ status: 'failed', error_message: 'Rescheduled' })
      .eq('booking_id', params.id)
      .eq('status', 'pending'),
  ])

  // Schedule notifications for new booking
  const schedule = buildNotificationSchedule({ id: newBooking!.id, start_time: newStart.toISOString() })
  if (schedule.length > 0) {
    await supabase.from('notifications').insert(schedule)
  }

  return NextResponse.json({ booking_id: newBooking!.id, message: 'Marcação reagendada com sucesso!' })
}
