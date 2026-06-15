import { POST } from '@/app/api/bookings/route'
import { createSupabaseMock } from '../helpers/supabase'

jest.mock('@/lib/supabase/server', () => ({
  createServiceClient: jest.fn(),
  createClient: jest.fn(),
}))
jest.mock('@/lib/notifications', () => ({
  buildNotificationSchedule: jest.fn().mockReturnValue([]),
}))
jest.mock('@/lib/email', () => ({
  sendBookingConfirmation: jest.fn(),
}))
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: jest.fn() } })),
}))
jest.mock('@/lib/sms', () => ({ sendSms: jest.fn() }))

import { createServiceClient } from '@/lib/supabase/server'
const mockServiceClient = createServiceClient as jest.Mock

// Future Monday 10:00 UTC
const FUTURE_TIME = new Date('2030-06-03T10:00:00.000Z').toISOString()

const VALID_BODY = {
  business_id: 'biz-id',
  service_id:  'svc-id',
  start_time:  FUTURE_TIME,
  customer_name:  'João Silva',
  customer_phone: '+351912345678',
}

function req(body: object) {
  return { json: jest.fn().mockResolvedValue(body) } as any
}

// Builds a mock that succeeds the full happy path
function happyMock(overrides: { bookingError?: any } = {}) {
  const business  = { data: { id: 'biz-id', name: 'Barber', timezone: 'Europe/Lisbon' }, error: null }
  const service   = { data: { id: 'svc-id', name: 'Corte', duration_minutes: 30, price: 10, is_active: true }, error: null }
  const avail     = { data: [{ id: 'av1', business_id: 'biz-id', staff_id: null, day_of_week: 1, start_hour: '09:00', end_hour: '19:00', is_active: true }], error: null }
  const bookings  = { data: [], error: null }
  const closed    = { data: [], error: null }
  const staff     = { data: [], error: null }
  const capCount  = { count: 0, data: null, error: null }
  const customer  = { data: null, error: null } // no existing customer
  const newCust   = { data: { id: 'cust-id' }, error: null }
  const booking   = { data: overrides.bookingError ? null : { id: 'booking-id' }, error: overrides.bookingError ?? null }
  const notifs    = { data: null, error: null }

  let fromCallIndex = 0
  const responses = [
    business, service, avail, bookings, closed, staff, capCount, // Promise.all
    customer,   // rate-limit customer lookup
    newCust,    // customer insert
    booking,    // booking insert
    notifs,     // notifications insert
  ]

  return {
    from: jest.fn(() => {
      const resp = responses[fromCallIndex] ?? { data: null, error: null }
      fromCallIndex++
      const chain: any = {}
      ;['select','insert','update','delete','eq','neq','gte','lte','order','limit','filter'].forEach(m => {
        chain[m] = jest.fn().mockReturnThis()
      })
      chain.single      = jest.fn().mockResolvedValue(resp)
      chain.maybeSingle = jest.fn().mockResolvedValue(resp)
      chain.then  = (r: any, j: any) => Promise.resolve(resp).then(r, j)
      chain.catch = (h: any) => Promise.resolve(resp).catch(h)
      return chain
    }),
    auth: { getUser: jest.fn() },
  }
}

describe('POST /api/bookings', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── Input validation ──────────────────────────────────────

  it('returns 400 when required fields are missing', async () => {
    mockServiceClient.mockReturnValue(happyMock())
    const res = await POST(req({ business_id: 'x' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for an invalid phone number', async () => {
    mockServiceClient.mockReturnValue(happyMock())
    const res = await POST(req({ ...VALID_BODY, customer_phone: 'abc' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/telefone/i)
  })

  it('returns 400 for a phone that is too short', async () => {
    mockServiceClient.mockReturnValue(happyMock())
    const res = await POST(req({ ...VALID_BODY, customer_phone: '123' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when start_time is in the past', async () => {
    mockServiceClient.mockReturnValue(happyMock())
    const res = await POST(req({ ...VALID_BODY, start_time: '2020-01-01T10:00:00Z' }))
    expect(res.status).toBe(400)
  })

  // ── Daily hard cap ────────────────────────────────────────

  it('returns 429 when business has reached the daily hard cap', async () => {
    const mock = happyMock()
    let idx = 0
    const responses = [
      { data: { id: 'biz-id', name: 'B', timezone: 'Europe/Lisbon' }, error: null }, // business
      { data: { id: 'svc-id', name: 'C', duration_minutes: 30, price: 10, is_active: true }, error: null }, // service
      { data: [], error: null }, // availability
      { data: [], error: null }, // bookings window
      { data: [], error: null }, // closed_periods
      { data: [], error: null }, // staff
      { count: 200, data: null, error: null }, // bookingsToday = HARD CAP
    ]
    mock.from = jest.fn(() => {
      const resp = responses[idx] ?? { data: null, error: null }
      idx++
      const chain: any = {}
      ;['select','eq','neq','gte','lte','order','limit','insert','update','delete','filter'].forEach(m => {
        chain[m] = jest.fn().mockReturnThis()
      })
      chain.single      = jest.fn().mockResolvedValue(resp)
      chain.maybeSingle = jest.fn().mockResolvedValue(resp)
      chain.then  = (r: any, j: any) => Promise.resolve(resp).then(r, j)
      chain.catch = (h: any) => Promise.resolve(resp).catch(h)
      return chain
    })
    mockServiceClient.mockReturnValue(mock)

    const res = await POST(req(VALID_BODY))
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error).toMatch(/agenda completa/i)
  })

  // ── Race condition / double booking ──────────────────────

  it('returns 409 with friendly message when DB unique constraint fires (23505)', async () => {
    mockServiceClient.mockReturnValue(
      happyMock({ bookingError: { code: '23505', message: 'duplicate key value' } })
    )
    const res = await POST(req(VALID_BODY))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/reservado por outra pessoa/i)
  })

  it('does NOT return the generic 500 when constraint fires — only the user-friendly 409', async () => {
    mockServiceClient.mockReturnValue(
      happyMock({ bookingError: { code: '23505', message: 'duplicate key value' } })
    )
    const res = await POST(req(VALID_BODY))
    expect(res.status).not.toBe(500)
  })

  // ── Rate limiting ─────────────────────────────────────────

  it('returns 429 when customer has >= 3 bookings in the last 30 minutes', async () => {
    const mock = happyMock()
    let idx = 0
    const responses = [
      { data: { id: 'biz-id', name: 'B', timezone: 'Europe/Lisbon' }, error: null },
      { data: { id: 'svc-id', name: 'C', duration_minutes: 30, price: 10, is_active: true }, error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
      { count: 5, data: null, error: null },        // bookingsToday (under hard cap)
      { data: { id: 'cust-id' }, error: null },     // existing customer found
      { count: 3, data: null, error: null },         // recent bookings = RATE LIMIT
    ]
    mock.from = jest.fn(() => {
      const resp = responses[idx] ?? { data: null, error: null }
      idx++
      const chain: any = {}
      ;['select','eq','neq','gte','lte','order','limit','insert','update','delete','filter'].forEach(m => {
        chain[m] = jest.fn().mockReturnThis()
      })
      chain.single      = jest.fn().mockResolvedValue(resp)
      chain.maybeSingle = jest.fn().mockResolvedValue(resp)
      chain.then  = (r: any, j: any) => Promise.resolve(resp).then(r, j)
      chain.catch = (h: any) => Promise.resolve(resp).catch(h)
      return chain
    })
    mockServiceClient.mockReturnValue(mock)

    const res = await POST(req(VALID_BODY))
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error).toMatch(/demasiadas marcações/i)
  })
})
