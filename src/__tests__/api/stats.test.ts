import { GET } from '@/app/api/dashboard/[businessId]/stats/route'
import { createSupabaseMock } from '../helpers/supabase'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'
const mockClient = createClient as jest.Mock

const OWNER  = { id: 'owner-uid' }
const BIZ_ID = 'biz-uuid'
const PARAMS = { params: { businessId: BIZ_ID } }

// Fix time to 2030-07-15 so month calculations are always deterministic
const FIXED_NOW = new Date('2030-07-15T12:00:00.000Z')

function req() {
  return new Request('http://localhost') as any
}

// Bookings in the fixed "now" month (July 2030) and "last month" (June 2030)
const FIXED_BOOKINGS = [
  { start_time: '2030-07-10T10:00:00Z', services: { name: 'Corte', price: 10 } },
  { start_time: '2030-07-15T11:00:00Z', services: { name: 'Barba', price: 7 } },
  { start_time: '2030-06-20T09:00:00Z', services: { name: 'Corte', price: 10 } },
]

describe('GET /api/dashboard/[businessId]/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(FIXED_NOW)
  })
  afterEach(() => jest.useRealTimers())

  it('returns 401 when not authenticated', async () => {
    mockClient.mockReturnValue(createSupabaseMock({}, null))
    const res = await GET(req(), PARAMS)
    expect(res.status).toBe(401)
  })

  it('returns 403 when user is not the business owner', async () => {
    mockClient.mockReturnValue(
      createSupabaseMock({ businesses: { data: { owner_id: 'other-owner' }, error: null } }, OWNER)
    )
    const res = await GET(req(), PARAMS)
    expect(res.status).toBe(403)
  })

  it('returns correct structure with empty bookings', async () => {
    mockClient.mockReturnValue(
      createSupabaseMock({
        businesses: { data: { owner_id: 'owner-uid' }, error: null },
        bookings:   [
          { data: [], error: null },   // confirmed bookings
          { data: [], error: null },   // no_show bookings
          { data: [], error: null },   // all customers (retention)
        ],
      }, OWNER)
    )
    const res = await GET(req(), PARAMS)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('revenueThisMonth')
    expect(body).toHaveProperty('revenueLastMonth')
    expect(body).toHaveProperty('bookingsThisMonth')
    expect(body).toHaveProperty('bookingsLastMonth')
    expect(body).toHaveProperty('monthlyRevenue')
    expect(body).toHaveProperty('topServices')
    expect(body.monthlyRevenue).toHaveLength(6)
    expect(body.revenueThisMonth).toBe(0)
  })

  it('calculates revenue and top services correctly', async () => {
    mockClient.mockReturnValue(
      createSupabaseMock({
        businesses: { data: { owner_id: 'owner-uid' }, error: null },
        bookings:   [
          { data: FIXED_BOOKINGS, error: null },   // confirmed
          { data: [], error: null },                // no_show
          { data: FIXED_BOOKINGS.map(b => ({ customer_id: 'c1' })), error: null }, // retention
        ],
      }, OWNER)
    )
    const res = await GET(req(), PARAMS)
    expect(res.status).toBe(200)
    const body = await res.json()

    // July 2030: 10 + 7 = 17€, 2 bookings
    expect(body.revenueThisMonth).toBe(17)
    expect(body.bookingsThisMonth).toBe(2)

    // June 2030: 10€, 1 booking
    expect(body.revenueLastMonth).toBe(10)
    expect(body.bookingsLastMonth).toBe(1)

    // Top: Corte (2×, 20€), Barba (1×, 7€)
    expect(body.topServices[0].name).toBe('Corte')
    expect(body.topServices[0].count).toBe(2)
    expect(body.topServices[0].revenue).toBe(20)
    expect(body.topServices[1].name).toBe('Barba')
  })

  it('always returns exactly 6 months in monthlyRevenue', async () => {
    mockClient.mockReturnValue(
      createSupabaseMock({
        businesses: { data: { owner_id: 'owner-uid' }, error: null },
        bookings:   [
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
        ],
      }, OWNER)
    )
    const res = await GET(req(), PARAMS)
    const body = await res.json()
    expect(body.monthlyRevenue).toHaveLength(6)
  })
})
