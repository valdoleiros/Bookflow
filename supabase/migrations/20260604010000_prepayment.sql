-- Phase 5: Pré-pagamento das marcações (anti-faltas)
-- O cliente final paga o serviço (total ou sinal) por MB WAY/cartão ao marcar.
-- Cada barbearia configura se exige pré-pagamento e quanto.

-- ── Config por barbearia ─────────────────────────────────────
alter table public.businesses
  -- 'off' | 'full' | 'deposit_fixed' | 'deposit_percent'
  add column if not exists prepayment_mode  text not null default 'off',
  -- euros (deposit_fixed) ou percentagem 1-100 (deposit_percent); ignorado nos outros modos
  add column if not exists prepayment_value numeric;

-- ── Estado de pagamento por marcação ─────────────────────────
alter table public.bookings
  -- 'none' = não exigiu pagamento; 'paid' = pré-pago via Stripe
  add column if not exists payment_status    text not null default 'none',
  add column if not exists amount_paid        numeric,
  add column if not exists stripe_session_id  text;
