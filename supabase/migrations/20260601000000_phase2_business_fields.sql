-- Phase 2: Business page fields
-- Adds morada, descrição e imagem de capa à tabela businesses

alter table public.businesses
  add column if not exists address     text,
  add column if not exists description text,
  add column if not exists cover_url   text;
