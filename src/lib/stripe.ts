import Stripe from 'stripe'

// Lazy init — called inside route handlers, never at module load time.
// Prevents build failures when STRIPE_SECRET_KEY is not set.
export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured')
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-05-27.dahlia',
  })
}
