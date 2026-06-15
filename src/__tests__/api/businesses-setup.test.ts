import { POST } from '@/app/api/businesses/setup/route'
import { createSupabaseMock } from '../helpers/supabase'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}))

import { createClient, createServiceClient } from '@/lib/supabase/server'
const mockClient        = createClient as jest.Mock
const mockServiceClient = createServiceClient as jest.Mock

function req(body: object) {
  return {
    json: jest.fn().mockResolvedValue(body),
    headers: { get: jest.fn().mockReturnValue(null) },
  } as any
}

const OWNER = { id: 'owner-uid', email: 'owner@test.com' }

describe('POST /api/businesses/setup', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when user is not authenticated', async () => {
    mockClient.mockReturnValue(createSupabaseMock({}, null))
    const res = await POST(req({ name: 'Barbearia Test', slug: 'test', timezone: 'Europe/Lisbon' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when name is missing', async () => {
    mockClient.mockReturnValue(createSupabaseMock({}, OWNER))
    const res = await POST(req({ slug: 'test' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when slug is missing', async () => {
    mockClient.mockReturnValue(createSupabaseMock({}, OWNER))
    const res = await POST(req({ name: 'Test Barber' }))
    expect(res.status).toBe(400)
  })

  it('returns 409 when owner already has a business', async () => {
    mockClient.mockReturnValue(createSupabaseMock({}, OWNER))
    // Existing-business check runs on the service client (works in the Bearer-token path)
    mockServiceClient.mockReturnValue(
      createSupabaseMock({ businesses: { data: { id: 'existing-biz' }, error: null } })
    )
    const res = await POST(req({ name: 'Barber', slug: 'barber', timezone: 'Europe/Lisbon' }))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/registada/i)
  })

  it('returns 409 when slug is already taken (unique constraint)', async () => {
    mockClient.mockReturnValue(createSupabaseMock({}, OWNER))
    // Service client: first call (existing check) → null, second call (insert) → 23505
    mockServiceClient.mockReturnValue(
      createSupabaseMock({
        businesses: [
          { data: null, error: null },
          { data: null, error: { code: '23505', message: 'duplicate key' } },
        ],
      })
    )
    const res = await POST(req({ name: 'Barber', slug: 'taken-slug', timezone: 'Europe/Lisbon' }))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/uso/i)
  })

  it('creates business + services + availability and returns 200 with businessId', async () => {
    mockClient.mockReturnValue(createSupabaseMock({}, OWNER))

    const newBusiness = { id: 'new-biz-id' }
    mockServiceClient.mockReturnValue(
      createSupabaseMock({
        // first call (existing check) → null, second call (insert) → new business
        businesses: [
          { data: null, error: null },
          { data: newBusiness, error: null },
        ],
        services:   { data: null, error: null },
        availability: { data: null, error: null },
      })
    )

    const res = await POST(req({ name: 'Barbearia Nova', slug: 'nova', timezone: 'Europe/Lisbon' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.businessId).toBe('new-biz-id')
  })
})
