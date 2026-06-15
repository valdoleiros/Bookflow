-- ============================================================
-- Phase 1 Security Fixes
-- 1. business_id on customers  → isolate PII per business (GDPR)
-- 2. bookings_no_double_booking → race condition / double-booking prevention
-- ============================================================

-- ── 1. Add business_id to customers ──────────────────────────
alter table public.customers
  add column if not exists business_id uuid references public.businesses(id) on delete cascade;

-- Backfill: assign each customer to the business of their earliest booking
update public.customers c
set business_id = (
  select b.business_id
  from public.bookings b
  where b.customer_id = c.id
  order by b.created_at asc
  limit 1
)
where c.business_id is null;

-- Unique customer per (business, phone) — replaces the global phone index
drop index if exists idx_customers_phone;
create index if not exists idx_customers_phone on public.customers(phone);
create unique index if not exists idx_customers_business_phone
  on public.customers(business_id, phone)
  where business_id is not null;

-- Update RLS: customer records are now scoped to their business owner
drop policy if exists "Owner read customers" on public.customers;
create policy "Owner manage customers"
  on public.customers for all
  using (public.owns_business(business_id));

-- ── 2. Anti-double-booking constraint ───────────────────────
-- Unique confirmed booking per (business, staff, start_time).
-- NULL staff_id uses sentinel UUID so two null-staff bookings
-- at the same time are also caught.
create unique index if not exists bookings_no_double_booking
  on public.bookings (
    business_id,
    coalesce(staff_id, '00000000-0000-0000-0000-000000000000'::uuid),
    start_time
  )
  where status != 'cancelled';
