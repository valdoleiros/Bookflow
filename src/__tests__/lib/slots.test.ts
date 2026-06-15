import { generateSlots } from '@/lib/slots'
import { addDays, setHours, setMinutes, startOfDay } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'

const TZ = 'Europe/Lisbon'

// Fix "now" to a Monday at 08:00 Lisbon time so slots aren't filtered as past
const FIXED_NOW = fromZonedTime(
  setMinutes(setHours(startOfDay(new Date('2030-06-02')), 8), 0),
  TZ
)

// A Monday (day_of_week = 1) one day from FIXED_NOW
const FUTURE_MONDAY = addDays(FIXED_NOW, 1)

const BASE_AVAILABILITY = [
  {
    id: 'av1',
    business_id: 'b1',
    staff_id: null,
    day_of_week: 1, // Monday
    start_hour: '09:00',
    end_hour: '11:00',
    is_active: true,
  },
]

beforeEach(() => {
  jest.useFakeTimers()
  jest.setSystemTime(FIXED_NOW)
})

afterEach(() => {
  jest.useRealTimers()
})

describe('generateSlots', () => {
  describe('availability rules', () => {
    it('returns empty array when no availability rule for the day', () => {
      const slots = generateSlots({
        date: FUTURE_MONDAY,
        durationMinutes: 30,
        availability: [], // no rules
        existingBookings: [],
        timezone: TZ,
      })
      expect(slots).toHaveLength(0)
    })

    it('returns empty array when availability rule is inactive', () => {
      const slots = generateSlots({
        date: FUTURE_MONDAY,
        durationMinutes: 30,
        availability: [{ ...BASE_AVAILABILITY[0], is_active: false }],
        existingBookings: [],
        timezone: TZ,
      })
      expect(slots).toHaveLength(0)
    })

    it('generates correct number of slots within business hours', () => {
      // 09:00–11:00 window, 30min service, 30min interval → 09:00, 09:30, 10:00, 10:30
      const slots = generateSlots({
        date: FUTURE_MONDAY,
        durationMinutes: 30,
        availability: BASE_AVAILABILITY,
        existingBookings: [],
        timezone: TZ,
        slotIntervalMinutes: 30,
      })
      expect(slots).toHaveLength(4)
      expect(slots.every(s => s.available)).toBe(true)
    })

    it('respects service duration — no slot that would exceed end of day', () => {
      // 09:00–11:00, 90min service: only 09:00 fits (ends 10:30); 09:30 would end 11:00 ✓; 10:00 ends 11:30 ✗
      const slots = generateSlots({
        date: FUTURE_MONDAY,
        durationMinutes: 90,
        availability: BASE_AVAILABILITY,
        existingBookings: [],
        timezone: TZ,
        slotIntervalMinutes: 30,
      })
      // 09:00→10:30 ✓, 09:30→11:00 ✓, 10:00→11:30 ✗
      expect(slots).toHaveLength(2)
    })
  })

  describe('closed periods', () => {
    it('returns empty array when entire day is closed', () => {
      const dateStr = '2030-06-03' // FUTURE_MONDAY
      const slots = generateSlots({
        date: FUTURE_MONDAY,
        durationMinutes: 30,
        availability: BASE_AVAILABILITY,
        existingBookings: [],
        closedPeriods: [
          { id: 'cp1', business_id: 'b1', date: dateStr, start_time: null, end_time: null, reason: 'Férias' },
        ],
        timezone: TZ,
      })
      expect(slots).toHaveLength(0)
    })

    it('marks slots as unavailable during a partial closure', () => {
      const dateStr = '2030-06-03'
      // Block 09:00–10:00
      const slots = generateSlots({
        date: FUTURE_MONDAY,
        durationMinutes: 30,
        availability: BASE_AVAILABILITY,
        existingBookings: [],
        closedPeriods: [
          { id: 'cp1', business_id: 'b1', date: dateStr, start_time: '09:00', end_time: '10:00', reason: null },
        ],
        timezone: TZ,
        slotIntervalMinutes: 30,
      })
      // 09:00 and 09:30 overlap with the block → unavailable; 10:00 and 10:30 → available
      const unavailable = slots.filter(s => !s.available)
      const available = slots.filter(s => s.available)
      expect(unavailable.length).toBeGreaterThanOrEqual(1)
      expect(available.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('existing bookings', () => {
    it('marks a slot as unavailable when a confirmed booking overlaps', () => {
      const dateStr = '2030-06-03'
      // Book 09:00–09:30
      const booking = {
        start_time: fromZonedTime(`${dateStr}T09:00:00`, TZ).toISOString(),
        end_time: fromZonedTime(`${dateStr}T09:30:00`, TZ).toISOString(),
        status: 'confirmed',
      }
      const slots = generateSlots({
        date: FUTURE_MONDAY,
        durationMinutes: 30,
        availability: BASE_AVAILABILITY,
        existingBookings: [booking],
        timezone: TZ,
        slotIntervalMinutes: 30,
      })
      const nineOclock = slots[0]
      expect(nineOclock.available).toBe(false)
      // Other slots should still be available
      expect(slots[1].available).toBe(true)
    })

    it('does NOT block slot for a cancelled booking', () => {
      const dateStr = '2030-06-03'
      const booking = {
        start_time: fromZonedTime(`${dateStr}T09:00:00`, TZ).toISOString(),
        end_time: fromZonedTime(`${dateStr}T09:30:00`, TZ).toISOString(),
        status: 'cancelled',
      }
      const slots = generateSlots({
        date: FUTURE_MONDAY,
        durationMinutes: 30,
        availability: BASE_AVAILABILITY,
        existingBookings: [booking],
        timezone: TZ,
        slotIntervalMinutes: 30,
      })
      expect(slots[0].available).toBe(true)
    })

    it('blocks all slots that overlap with a longer booking', () => {
      const dateStr = '2030-06-03'
      // 60-min booking at 09:00 blocks 09:00 and 09:30 slots
      const booking = {
        start_time: fromZonedTime(`${dateStr}T09:00:00`, TZ).toISOString(),
        end_time: fromZonedTime(`${dateStr}T10:00:00`, TZ).toISOString(),
        status: 'confirmed',
      }
      const slots = generateSlots({
        date: FUTURE_MONDAY,
        durationMinutes: 30,
        availability: BASE_AVAILABILITY,
        existingBookings: [booking],
        timezone: TZ,
        slotIntervalMinutes: 30,
      })
      expect(slots[0].available).toBe(false) // 09:00
      expect(slots[1].available).toBe(false) // 09:30 — overlaps with existing 09:00–10:00
      expect(slots[2].available).toBe(true)  // 10:00
    })
  })
})
