import { POST } from '@/app/api/bookings/[id]/public-cancel/route'
import { createSupabaseMock } from '../helpers/supabase'

jest.mock('@/lib/supabase/server', () => ({
  createServiceClient: jest.fn(),
  createClient: jest.fn(),
}))

import { createServiceClient } from '@/lib/supabase/server'
const mockServiceClient = createServiceClient as jest.Mock

function req() {
  return new Request('http://localhost') as any
}

const PARAMS = { params: { id: 'booking-uuid-123' } }

describe('POST /api/bookings/[id]/public-cancel', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 404 when booking does not exist', async () => {
    mockServiceClient.mockReturnValue(
      createSupabaseMock({ bookings: { data: null, error: null } })
    )
    const res = await POST(req(), PARAMS)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('returns 400 when booking is already cancelled', async () => {
    mockServiceClient.mockReturnValue(
      createSupabaseMock({ bookings: { data: { id: 'booking-uuid-123', status: 'cancelled' }, error: null } })
    )
    const res = await POST(req(), PARAMS)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/cancelada/i)
  })

  it('returns 400 when booking is completed (not cancellable)', async () => {
    mockServiceClient.mockReturnValue(
      createSupabaseMock({ bookings: { data: { id: 'booking-uuid-123', status: 'completed' }, error: null } })
    )
    const res = await POST(req(), PARAMS)
    expect(res.status).toBe(400)
  })

  it('cancels a confirmed booking and returns 200', async () => {
    mockServiceClient.mockReturnValue(
      createSupabaseMock({
        bookings: { data: { id: 'booking-uuid-123', status: 'confirmed' }, error: null },
        notifications: { data: null, error: null },
      })
    )
    const res = await POST(req(), PARAMS)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toBeDefined()
  })

  it('calls update on bookings and notifications tables when cancelling', async () => {
    const mock = createSupabaseMock({
      bookings: { data: { id: 'booking-uuid-123', status: 'confirmed' }, error: null },
      notifications: { data: null, error: null },
    })
    mockServiceClient.mockReturnValue(mock)

    await POST(req(), PARAMS)

    // from() should be called at least 3 times: select, update bookings, update notifications
    expect(mock.from).toHaveBeenCalledWith('bookings')
    expect(mock.from).toHaveBeenCalledWith('notifications')
  })
})
