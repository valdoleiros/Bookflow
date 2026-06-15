import { buildNotificationSchedule } from '@/lib/notifications'

// Mock Resend and sendSms so importing notifications.ts doesn't fail
jest.mock('resend', () => ({ Resend: jest.fn().mockImplementation(() => ({ emails: { send: jest.fn() } })) }))
jest.mock('@/lib/sms', () => ({ sendSms: jest.fn() }))

describe('buildNotificationSchedule', () => {
  const BOOKING_ID = 'test-booking-id'

  it('schedules confirmation + 24h + 2h for a booking far in the future', () => {
    const future = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48h from now
    const schedule = buildNotificationSchedule({ id: BOOKING_ID, start_time: future.toISOString() })

    expect(schedule).toHaveLength(3)
    const types = schedule.map(n => n.type)
    expect(types).toContain('confirmation')
    expect(types).toContain('reminder_24h')
    expect(types).toContain('reminder_2h')
  })

  it('skips 24h reminder when booking is less than 24h away', () => {
    const soon = new Date(Date.now() + 10 * 60 * 60 * 1000) // 10h from now
    const schedule = buildNotificationSchedule({ id: BOOKING_ID, start_time: soon.toISOString() })

    const types = schedule.map(n => n.type)
    expect(types).toContain('confirmation')
    expect(types).not.toContain('reminder_24h')
    expect(types).toContain('reminder_2h')
  })

  it('skips both reminders when booking is less than 2h away', () => {
    const veryson = new Date(Date.now() + 30 * 60 * 1000) // 30 min from now
    const schedule = buildNotificationSchedule({ id: BOOKING_ID, start_time: veryson.toISOString() })

    const types = schedule.map(n => n.type)
    expect(types).toContain('confirmation')
    expect(types).not.toContain('reminder_24h')
    expect(types).not.toContain('reminder_2h')
  })

  it('always uses sms channel', () => {
    const future = new Date(Date.now() + 48 * 60 * 60 * 1000)
    const schedule = buildNotificationSchedule({ id: BOOKING_ID, start_time: future.toISOString() })

    expect(schedule.every(n => n.channel === 'sms')).toBe(true)
  })

  it('always links the correct booking_id', () => {
    const future = new Date(Date.now() + 48 * 60 * 60 * 1000)
    const schedule = buildNotificationSchedule({ id: BOOKING_ID, start_time: future.toISOString() })

    expect(schedule.every(n => n.booking_id === BOOKING_ID)).toBe(true)
  })

  it('confirmation is scheduled for approximately now', () => {
    const future = new Date(Date.now() + 48 * 60 * 60 * 1000)
    const before = new Date()
    const schedule = buildNotificationSchedule({ id: BOOKING_ID, start_time: future.toISOString() })
    const after = new Date()

    const confirmation = schedule.find(n => n.type === 'confirmation')!
    const confirmationTime = new Date(confirmation.scheduled_time)
    expect(confirmationTime >= before).toBe(true)
    expect(confirmationTime <= after).toBe(true)
  })

  it('24h reminder is scheduled 24h before booking', () => {
    const future = new Date(Date.now() + 48 * 60 * 60 * 1000)
    const schedule = buildNotificationSchedule({ id: BOOKING_ID, start_time: future.toISOString() })

    const reminder24 = schedule.find(n => n.type === 'reminder_24h')!
    const reminderTime = new Date(reminder24.scheduled_time)
    const expectedTime = new Date(future.getTime() - 24 * 60 * 60 * 1000)
    // Within 5 seconds of expected
    expect(Math.abs(reminderTime.getTime() - expectedTime.getTime())).toBeLessThan(5000)
  })

  it('2h reminder is scheduled 2h before booking', () => {
    const future = new Date(Date.now() + 48 * 60 * 60 * 1000)
    const schedule = buildNotificationSchedule({ id: BOOKING_ID, start_time: future.toISOString() })

    const reminder2 = schedule.find(n => n.type === 'reminder_2h')!
    const reminderTime = new Date(reminder2.scheduled_time)
    const expectedTime = new Date(future.getTime() - 2 * 60 * 60 * 1000)
    expect(Math.abs(reminderTime.getTime() - expectedTime.getTime())).toBeLessThan(5000)
  })
})
