-- ============================================================
-- BookFlow SaaS – Supabase Schema (complete reference)
-- ============================================================
-- For NEW deployments: run this file in full.
-- For EXISTING deployments: see "Migration" section at the bottom.
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- BUSINESSES
-- ============================================================
create table public.businesses (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid references auth.users(id) on delete set null,
  name        text not null,
  email       text not null unique,
  phone       text,
  slug        text not null unique,
  timezone    text not null default 'Europe/Lisbon',
  created_at  timestamptz not null default now()
);

create index idx_businesses_slug     on public.businesses(slug);
create index idx_businesses_owner    on public.businesses(owner_id);

-- ============================================================
-- STAFF
-- ============================================================
create table public.staff (
  id          uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name        text not null,
  avatar_url  text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index idx_staff_business on public.staff(business_id);

-- ============================================================
-- SERVICES
-- ============================================================
create table public.services (
  id                uuid primary key default uuid_generate_v4(),
  business_id       uuid not null references public.businesses(id) on delete cascade,
  name              text not null,
  duration_minutes  integer not null default 30,
  price             numeric(10,2),
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);

create index idx_services_business on public.services(business_id);

-- ============================================================
-- AVAILABILITY (weekly schedule – per business or per staff)
-- ============================================================
create table public.availability (
  id           uuid primary key default uuid_generate_v4(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  staff_id     uuid references public.staff(id) on delete cascade,
  day_of_week  integer not null check (day_of_week between 0 and 6),
  start_hour   time not null,
  end_hour     time not null,
  is_active    boolean not null default true,
  constraint availability_hours_check check (end_hour > start_hour)
);

create unique index idx_availability_unique on public.availability(business_id, day_of_week) where staff_id is null;
create index idx_availability_business on public.availability(business_id);

-- ============================================================
-- CLOSED PERIODS (vacations, holidays, partial closures)
-- ============================================================
create table public.closed_periods (
  id           uuid primary key default uuid_generate_v4(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  staff_id     uuid references public.staff(id) on delete cascade,
  date         date not null,
  start_time   time,
  end_time     time,
  reason       text,
  created_at   timestamptz not null default now()
);

create index idx_closed_periods_business on public.closed_periods(business_id, date);

-- ============================================================
-- CUSTOMERS
-- ============================================================
create table public.customers (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  phone       text not null,
  email       text,
  created_at  timestamptz not null default now()
);

create index idx_customers_phone on public.customers(phone);

-- ============================================================
-- BOOKINGS
-- ============================================================
create type booking_status as enum ('confirmed', 'cancelled', 'completed', 'no_show');

create table public.bookings (
  id             uuid primary key default uuid_generate_v4(),
  business_id    uuid not null references public.businesses(id) on delete cascade,
  service_id     uuid not null references public.services(id),
  customer_id    uuid not null references public.customers(id),
  staff_id       uuid references public.staff(id) on delete set null,
  start_time     timestamptz not null,
  end_time       timestamptz not null,
  status         booking_status not null default 'confirmed',
  reminder_sent  boolean not null default false,
  notes          text,
  created_at     timestamptz not null default now(),
  constraint bookings_time_check check (end_time > start_time)
);

create index idx_bookings_business           on public.bookings(business_id);
create index idx_bookings_start_time         on public.bookings(start_time);
create index idx_bookings_status             on public.bookings(status);
create index idx_bookings_staff              on public.bookings(staff_id);
create index idx_bookings_business_time      on public.bookings(business_id, start_time) where status != 'cancelled';

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create type notification_type    as enum ('confirmation', 'reminder_24h', 'reminder_2h');
create type notification_status  as enum ('pending', 'sent', 'failed');
create type notification_channel as enum ('email', 'sms');

create table public.notifications (
  id              uuid primary key default uuid_generate_v4(),
  booking_id      uuid not null references public.bookings(id) on delete cascade,
  type            notification_type not null,
  channel         notification_channel not null default 'email',
  scheduled_time  timestamptz not null,
  sent_at         timestamptz,
  status          notification_status not null default 'pending',
  error_message   text,
  created_at      timestamptz not null default now()
);

create index idx_notifications_booking on public.notifications(booking_id);
create index idx_notifications_pending on public.notifications(scheduled_time) where status = 'pending';

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.businesses    enable row level security;
alter table public.staff         enable row level security;
alter table public.services      enable row level security;
alter table public.availability  enable row level security;
alter table public.closed_periods enable row level security;
alter table public.customers     enable row level security;
alter table public.bookings      enable row level security;
alter table public.notifications enable row level security;

-- Helper: check if current user owns a given business
create or replace function public.owns_business(bid uuid)
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from public.businesses where id = bid and owner_id = auth.uid()
  );
$$;

-- businesses – public read (needed for slug lookup / booking page)
create policy "Public read businesses"
  on public.businesses for select using (true);

create policy "Owner update business"
  on public.businesses for update using (owner_id = auth.uid());

-- staff – active staff visible to public (clients select a barber); owner manages
create policy "Public read active staff"
  on public.staff for select using (is_active = true);

create policy "Owner manage staff"
  on public.staff for all using (public.owns_business(business_id));

-- services – active services visible to public
create policy "Public read active services"
  on public.services for select using (is_active = true);

create policy "Owner manage services"
  on public.services for all using (public.owns_business(business_id));

-- availability – public read (slot engine needs this); owner manages
create policy "Public read availability"
  on public.availability for select using (true);

create policy "Owner manage availability"
  on public.availability for all using (public.owns_business(business_id));

-- closed_periods – owner only (internal management data)
create policy "Owner manage closed periods"
  on public.closed_periods for all using (public.owns_business(business_id));

-- customers – owner only (GDPR: contains PII)
create policy "Owner read customers"
  on public.customers for select using (
    exists (
      select 1 from public.bookings b
      where b.customer_id = customers.id
        and public.owns_business(b.business_id)
    )
  );

-- bookings – owner only (contains PII via customer join)
create policy "Owner read bookings"
  on public.bookings for select using (public.owns_business(business_id));

create policy "Owner update bookings"
  on public.bookings for update using (public.owns_business(business_id));

-- notifications – service_role only (cron jobs use service_role which bypasses RLS)
-- No anon/authenticated policies: prevents direct browser access to notification data.

-- ============================================================
-- SEED: demo business (remove before production)
-- ============================================================
-- Note: owner_id left null – set after creating the auth user manually.
insert into public.businesses (id, name, email, phone, slug, timezone)
values (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Barbearia do Zé',
  'ze@barbearia.pt',
  '+351912345678',
  'barbearia-ze',
  'Europe/Lisbon'
) on conflict (id) do nothing;

insert into public.services (business_id, name, duration_minutes, price)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Corte de Cabelo', 30, 12.00),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Barba', 20, 8.00),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Corte + Barba', 50, 18.00)
on conflict do nothing;

insert into public.availability (business_id, day_of_week, start_hour, end_hour)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 1, '09:00', '19:00'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 2, '09:00', '19:00'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 3, '09:00', '19:00'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 4, '09:00', '19:00'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 5, '09:00', '19:00'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 6, '09:00', '14:00')
on conflict do nothing;

-- ============================================================
-- MIGRATION (run on existing databases)
-- ============================================================
/*
-- 1. Add owner_id to businesses
alter table public.businesses add column if not exists owner_id uuid references auth.users(id) on delete set null;
create index if not exists idx_businesses_owner on public.businesses(owner_id);

-- 2. Add staff table (if not exists)
-- (run the CREATE TABLE above)

-- 3. Add staff_id to availability
alter table public.availability add column if not exists staff_id uuid references public.staff(id) on delete cascade;

-- 4. Add missing columns to bookings
alter table public.bookings add column if not exists staff_id uuid references public.staff(id) on delete set null;
alter table public.bookings add column if not exists reminder_sent boolean not null default false;

-- 5. Add 'no_show' to booking_status enum
alter type booking_status add value if not exists 'no_show';

-- 6. Add closed_periods table (if not exists)
-- (run the CREATE TABLE above)

-- 7. Drop old permissive policies and create new ones
-- (run the RLS section above, first dropping old policies by name)
drop policy if exists "Public can read bookings" on public.bookings;
drop policy if exists "Public can insert bookings" on public.bookings;
drop policy if exists "Public can read own customer" on public.customers;
drop policy if exists "Public can insert customers" on public.customers;
drop policy if exists "System can manage notifications" on public.notifications;
drop policy if exists "Public can insert notifications" on public.notifications;
-- (then create new policies from above)
*/
