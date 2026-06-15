// Mock side-effectful modules so importing bookings.ts (which pulls in
// notifications -> Resend) doesn't fail at load time without env keys.
jest.mock('resend', () => ({ Resend: jest.fn().mockImplementation(() => ({ emails: { send: jest.fn() } })) }))
jest.mock('@/lib/sms', () => ({ sendSms: jest.fn() }))
jest.mock('@/lib/supabase/server', () => ({ createServiceClient: jest.fn() }))

import { computePrepaymentCents } from '@/lib/bookings'

// Pre-payment is money-critical: it decides how much a customer is charged at
// booking time. These tests pin down every mode and the safety edges.
describe('computePrepaymentCents', () => {
  const svc = (price: number | null) => ({ price })
  const biz = (mode: string | null, value?: number | null) => ({
    prepayment_mode: mode,
    prepayment_value: value ?? null,
  })

  describe("mode 'off' / unset", () => {
    it('returns 0 when mode is off', () => {
      expect(computePrepaymentCents(biz('off'), svc(20))).toBe(0)
    })
    it('returns 0 when mode is null (defaults to off)', () => {
      expect(computePrepaymentCents(biz(null), svc(20))).toBe(0)
    })
    it('returns 0 for an unknown mode', () => {
      expect(computePrepaymentCents(biz('bananas'), svc(20))).toBe(0)
    })
  })

  describe("mode 'full'", () => {
    it('charges the whole service price', () => {
      expect(computePrepaymentCents(biz('full'), svc(20))).toBe(2000)
    })
    it('handles cents in the price without float drift', () => {
      expect(computePrepaymentCents(biz('full'), svc(12.99))).toBe(1299)
    })
  })

  describe("mode 'deposit_fixed'", () => {
    it('charges the fixed euro amount', () => {
      expect(computePrepaymentCents(biz('deposit_fixed', 5), svc(20))).toBe(500)
    })
    it('never exceeds the service price', () => {
      // 50€ deposit on a 20€ service is nonsensical — cap at the price.
      expect(computePrepaymentCents(biz('deposit_fixed', 50), svc(20))).toBe(2000)
    })
  })

  describe("mode 'deposit_percent'", () => {
    it('charges the given percentage of the price', () => {
      expect(computePrepaymentCents(biz('deposit_percent', 30), svc(20))).toBe(600)
    })
    it('rounds to the nearest cent', () => {
      // 33% of 9.99€ = 3.2967€ -> 330 cents
      expect(computePrepaymentCents(biz('deposit_percent', 33), svc(9.99))).toBe(330)
    })
    it('100% equals the full price', () => {
      expect(computePrepaymentCents(biz('deposit_percent', 100), svc(20))).toBe(2000)
    })
  })

  describe('Stripe minimum (0.50€)', () => {
    it('returns 0 when the computed amount is below 50 cents', () => {
      // 1% of 20€ = 0.20€ -> below the MB WAY/card minimum.
      expect(computePrepaymentCents(biz('deposit_percent', 1), svc(20))).toBe(0)
    })
    it('allows exactly 50 cents', () => {
      expect(computePrepaymentCents(biz('deposit_fixed', 0.5), svc(20))).toBe(50)
    })
  })

  describe('degenerate inputs', () => {
    it('returns 0 when the service price is missing', () => {
      expect(computePrepaymentCents(biz('full'), svc(null))).toBe(0)
    })
    it('returns 0 when a percentage deposit has no value', () => {
      expect(computePrepaymentCents(biz('deposit_percent', null), svc(20))).toBe(0)
    })
    it('returns 0 for a free (0€) service even in full mode', () => {
      expect(computePrepaymentCents(biz('full'), svc(0))).toBe(0)
    })
  })
})
