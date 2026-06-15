-- ============================================================
-- Phase 3: Billing, no-show tracking, reengagement, branding
-- ============================================================

-- ── Subscription / trial on businesses ───────────────────────
alter table public.businesses
  add column if not exists trial_ends_at           timestamptz default (now() + interval '14 days'),
  add column if not exists subscription_status     text        not null default 'trial',
  add column if not exists stripe_customer_id      text,
  add column if not exists stripe_subscription_id  text,
  add column if not exists logo_url                text;

-- Backfill: existing businesses get 14 days from now
update public.businesses
set trial_ends_at = now() + interval '14 days'
where trial_ends_at is null;

-- ── Reengagement tracking on customers ───────────────────────
alter table public.customers
  add column if not exists last_reengagement_at timestamptz;
