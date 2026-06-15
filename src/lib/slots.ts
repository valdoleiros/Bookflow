// src/lib/slots.ts
// ============================================================
// Slot Generation Engine
// Generates available time slots for a given business/service/date
// ============================================================

import {
  addMinutes,
  isWithinInterval,
  parseISO,
  setHours,
  setMinutes,
  startOfDay,
  endOfDay,
  format,
  isBefore,
  isAfter,
} from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import type { Availability, TimeSlot } from '@/types'

export interface ClosedPeriod {
  id: string
  business_id: string
  date: string
  start_time: string | null
  end_time: string | null
  reason: string | null
}

// Minimal booking shape needed for slot overlap detection
interface BookingForSlot {
  start_time: string
  end_time: string
  status: string
}

interface GenerateSlotsParams {
  date: Date                    // The calendar date requested (in business timezone)
  durationMinutes: number       // Service duration
  availability: Availability[]  // Business weekly schedule
  existingBookings: BookingForSlot[]   // Already confirmed bookings
  closedPeriods?: ClosedPeriod[] // Vacation/Closed periods
  timezone: string              // Business timezone e.g. "Europe/Lisbon"
  slotIntervalMinutes?: number  // Granularity – default 30 min
}

export function generateSlots({
  date,
  durationMinutes,
  availability,
  existingBookings,
  closedPeriods,
  timezone,
  slotIntervalMinutes = 30,
}: GenerateSlotsParams): TimeSlot[] {
  // Day of week in business timezone (0=Sun … 6=Sat)
  const zonedDate = toZonedTime(date, timezone)
  const dayOfWeek = zonedDate.getDay()
  const dateStr = format(zonedDate, 'yyyy-MM-dd')

  // Check full day closures
  const todayPeriods = closedPeriods?.filter(p => p.date === dateStr) || []
  if (todayPeriods.some(p => !p.start_time)) {
    return [] // Whole day is blocked
  }

  // Find availability rule for this day
  const rule = availability.find(
    (a) => a.day_of_week === dayOfWeek && a.is_active
  )
  if (!rule) return []

  // Create virtual bookings for partial closed periods (require both start AND end time)
  const blockBookings = todayPeriods.filter(p => p.start_time && p.end_time).map(p => {
    const st = fromZonedTime(parseISO(`${p.date}T${p.start_time}`), timezone)
    const et = fromZonedTime(parseISO(`${p.date}T${p.end_time}`), timezone)
    return {
      status: 'confirmed',
      start_time: st.toISOString(),
      end_time: et.toISOString(),
    }
  }) as BookingForSlot[]

  const allBookings = [...existingBookings, ...blockBookings]

  // Parse start/end hours (e.g. "09:00")
  const [startH, startM] = rule.start_hour.split(':').map(Number)
  const [endH, endM] = rule.end_hour.split(':').map(Number)

  // Build absolute start/end in business timezone, then convert to UTC
  let slotStart = fromZonedTime(
    setMinutes(setHours(startOfDay(zonedDate), startH), startM),
    timezone
  )
  const dayEnd = fromZonedTime(
    setMinutes(setHours(startOfDay(zonedDate), endH), endM),
    timezone
  )

  const slots: TimeSlot[] = []
  const now = new Date()

  while (true) {
    const slotEnd = addMinutes(slotStart, durationMinutes)

    // Stop if slot would exceed business hours
    if (isAfter(slotEnd, dayEnd)) break

    // Skip slots in the past
    if (isAfter(slotStart, now)) {
      const available = !hasOverlap(slotStart, slotEnd, allBookings)
      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        available,
      })
    }

    // Advance by slot interval
    slotStart = addMinutes(slotStart, slotIntervalMinutes)
  }

  return slots
}

// ── Overlap detection ─────────────────────────────────────
function hasOverlap(
  slotStart: Date,
  slotEnd: Date,
  bookings: { start_time: string; end_time: string; status: string }[]
): boolean {
  return bookings.some((b) => {
    if (b.status === 'cancelled') return false
    const bStart = parseISO(b.start_time)
    const bEnd = parseISO(b.end_time)
    // Overlap if slotStart < bEnd && slotEnd > bStart
    return isBefore(slotStart, bEnd) && isAfter(slotEnd, bStart)
  })
}

// ── Format slot for display ───────────────────────────────
export function formatSlot(isoTime: string, timezone: string): string {
  const zonedTime = toZonedTime(parseISO(isoTime), timezone)
  return format(zonedTime, 'HH:mm')
}

// ── Group slots by hour for UI display ───────────────────
export function groupSlotsByHour(
  slots: TimeSlot[],
  timezone: string
): Record<string, TimeSlot[]> {
  const groups: Record<string, TimeSlot[]> = {}
  for (const slot of slots) {
    const zonedTime = toZonedTime(parseISO(slot.start), timezone)
    const hour = format(zonedTime, 'HH:00')
    if (!groups[hour]) groups[hour] = []
    groups[hour].push(slot)
  }
  return groups
}