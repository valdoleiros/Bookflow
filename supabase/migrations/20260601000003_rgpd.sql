-- RGPD: consentimento SMS + direito ao esquecimento
alter table public.customers
  add column if not exists sms_consent    boolean     not null default false,
  add column if not exists sms_consent_at timestamptz;
