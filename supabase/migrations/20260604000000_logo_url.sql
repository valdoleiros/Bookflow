-- Phase 4: Logótipo da barbearia
-- A dashboard (Definições) já permite definir um logótipo; faltava a coluna.

alter table public.businesses
  add column if not exists logo_url text;
