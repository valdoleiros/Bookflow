-- ============================================================
-- BookFlow – Seed de DEMONSTRAÇÃO
-- ============================================================
-- COMO USAR (lê antes de correr):
--
--   1. supabase start   (Docker tem de estar a correr)
--   2. npm run dev
--   3. Regista conta em http://localhost:3000/register
--      → Nome: Barbearia do Zé
--      → Slug: barbearia-ze          ← IMPORTANTE, exactamente assim
--      → Email: o teu email
--      → Password: à tua escolha (mín. 8 chars)
--   4. A confirmação de email está DESACTIVADA localmente (config.toml:
--      enable_confirmations = false) — entras logo após o registo.
--      (Se quiseres ver os emails enviados, abre o Mailpit: http://localhost:54324)
--   5. Depois de entrares no dashboard, copia o UUID da URL:
--      http://localhost:3000/dashboard/  ←→  XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
--   6. Abre o SQL Editor do Supabase Studio: http://localhost:54323
--      → SQL Editor → New query
--   7. Cola este ficheiro, substitui 'COLE_O_UUID_AQUI' pelo teu UUID
--   8. Clica Run (F5)
--   9. Recarrega o dashboard — tens 50+ marcações e 15 clientes prontos
-- ============================================================

do $$
declare
  -- ══════════════════════════════════════════════════
  --  SUBSTITUI AQUI pelo UUID da URL do dashboard
  -- ══════════════════════════════════════════════════
  v_biz uuid := 'COLE_O_UUID_AQUI';
  -- ══════════════════════════════════════════════════

  v_svc1  uuid;  v_svc2  uuid;  v_svc3  uuid;
  v_svc4  uuid;  v_svc5  uuid;  v_svc6  uuid;
  v_st1   uuid;  v_st2   uuid;  v_st3   uuid;
begin

  -- ── 1. Enriquecer a barbearia ────────────────────
  update public.businesses set
    name                = 'Barbearia do Zé',
    slug                = 'barbearia-ze',
    phone               = '+351912345678',
    address             = 'Rua Augusta 47, 1100-048 Lisboa',
    description         = 'A barbearia clássica do Chiado desde 1998. Cortes, barbas e muito bom ambiente.',
    cover_url           = 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&q=80',
    trial_ends_at       = now() + interval '90 days',
    subscription_status = 'active',
    -- Pré-pagamento anti-faltas: sinal de 5€ por marcação (MB WAY/cartão)
    prepayment_mode     = 'deposit_fixed',
    prepayment_value    = 5.00
  where id = v_biz;

  -- ── 2. Serviços ──────────────────────────────────
  delete from public.services where business_id = v_biz;

  insert into public.services (business_id, name, duration_minutes, price, is_active) values
    (v_biz, 'Corte Clássico',       30, 12.00, true),
    (v_biz, 'Corte + Barba',        50, 18.00, true),
    (v_biz, 'Barba & Bigode',       25,  9.00, true),
    (v_biz, 'Corte Infantil',       25,  8.00, true),
    (v_biz, 'Degradê + Acabamento', 40, 15.00, true),
    (v_biz, 'Serviço Completo',     75, 28.00, true);

  -- ── 3. Horários ──────────────────────────────────
  delete from public.availability where business_id = v_biz;

  insert into public.availability (business_id, day_of_week, start_hour, end_hour, is_active) values
    (v_biz, 1, '09:00', '19:00', true),
    (v_biz, 2, '09:00', '19:00', true),
    (v_biz, 3, '09:00', '19:00', true),
    (v_biz, 4, '09:00', '19:00', true),
    (v_biz, 5, '09:00', '19:00', true),
    (v_biz, 6, '09:00', '16:00', true);

  -- ── 4. Staff ─────────────────────────────────────
  delete from public.staff where business_id = v_biz;

  insert into public.staff (business_id, name, is_active) values
    (v_biz, 'Zé Silva',       true),
    (v_biz, 'Miguel Ferreira',true),
    (v_biz, 'Rui Costa',      true);

  -- ── 5. Clientes ──────────────────────────────────
  insert into public.customers (id, name, phone, email, sms_consent, sms_consent_at, created_at)
  values
    ('cccc0001-0000-0000-0000-000000000001','João Rodrigues',  '+351912111001','joao.rodrigues@email.com', true, now()-interval '90 days', now()-interval '90 days'),
    ('cccc0001-0000-0000-0000-000000000002','Pedro Almeida',   '+351912111002','pedro.almeida@email.com',  true, now()-interval '80 days', now()-interval '80 days'),
    ('cccc0001-0000-0000-0000-000000000003','Carlos Santos',   '+351912111003','carlos.santos@email.com',  true, now()-interval '75 days', now()-interval '75 days'),
    ('cccc0001-0000-0000-0000-000000000004','Tiago Ferreira',  '+351912111004', null,                      true, now()-interval '70 days', now()-interval '70 days'),
    ('cccc0001-0000-0000-0000-000000000005','Bruno Costa',     '+351912111005','bruno.costa@email.com',    true, now()-interval '65 days', now()-interval '65 days'),
    ('cccc0001-0000-0000-0000-000000000006','André Martins',   '+351912111006', null,                      false,null,                      now()-interval '60 days'),
    ('cccc0001-0000-0000-0000-000000000007','Filipe Oliveira', '+351912111007','filipe.oliveira@email.com',true, now()-interval '55 days', now()-interval '55 days'),
    ('cccc0001-0000-0000-0000-000000000008','Ricardo Sousa',   '+351912111008','ricardo.sousa@email.com',  true, now()-interval '50 days', now()-interval '50 days'),
    ('cccc0001-0000-0000-0000-000000000009','Nuno Pereira',    '+351912111009', null,                      false,null,                      now()-interval '45 days'),
    ('cccc0001-0000-0000-0000-000000000010','Diogo Carvalho',  '+351912111010','diogo.carvalho@email.com', true, now()-interval '40 days', now()-interval '40 days'),
    ('cccc0001-0000-0000-0000-000000000011','Sérgio Lopes',    '+351912111011', null,                      true, now()-interval '35 days', now()-interval '35 days'),
    ('cccc0001-0000-0000-0000-000000000012','Marco Gomes',     '+351912111012','marco.gomes@email.com',    true, now()-interval '30 days', now()-interval '30 days'),
    ('cccc0001-0000-0000-0000-000000000013','Luís Pinto',      '+351912111013', null,                      false,null,                      now()-interval '25 days'),
    ('cccc0001-0000-0000-0000-000000000014','Rui Mendes',      '+351912111014','rui.mendes@email.com',     true, now()-interval '20 days', now()-interval '20 days'),
    ('cccc0001-0000-0000-0000-000000000015','Hugo Nascimento', '+351912111015', null,                      true, now()-interval '15 days', now()-interval '15 days')
  on conflict (id) do nothing;

  -- Associar todos os clientes de demo a esta barbearia (isolamento por business_id).
  -- Sem isto, a exportação CSV e o reengagement não os encontram.
  update public.customers set business_id = v_biz where id::text like 'cccc0001-%';

  -- Guardar IDs dos serviços e staff
  select id into v_svc1 from public.services where business_id = v_biz and name = 'Corte Clássico'       limit 1;
  select id into v_svc2 from public.services where business_id = v_biz and name = 'Corte + Barba'        limit 1;
  select id into v_svc3 from public.services where business_id = v_biz and name = 'Barba & Bigode'       limit 1;
  select id into v_svc4 from public.services where business_id = v_biz and name = 'Corte Infantil'       limit 1;
  select id into v_svc5 from public.services where business_id = v_biz and name = 'Degradê + Acabamento' limit 1;
  select id into v_svc6 from public.services where business_id = v_biz and name = 'Serviço Completo'     limit 1;
  select id into v_st1  from public.staff    where business_id = v_biz and name = 'Zé Silva'             limit 1;
  select id into v_st2  from public.staff    where business_id = v_biz and name = 'Miguel Ferreira'      limit 1;
  select id into v_st3  from public.staff    where business_id = v_biz and name = 'Rui Costa'            limit 1;

  -- ── 6. Marcações históricas (8 semanas) + futuras ──
  insert into public.bookings (business_id, service_id, customer_id, staff_id, start_time, end_time, status, reminder_sent) values
    -- Semana -8
    (v_biz,v_svc1,'cccc0001-0000-0000-0000-000000000001',v_st1, now()-interval'56 days'+time'09:30', now()-interval'56 days'+time'10:00','completed',true),
    (v_biz,v_svc2,'cccc0001-0000-0000-0000-000000000002',v_st2, now()-interval'56 days'+time'10:00', now()-interval'56 days'+time'10:50','completed',true),
    (v_biz,v_svc3,'cccc0001-0000-0000-0000-000000000003',v_st3, now()-interval'55 days'+time'14:00', now()-interval'55 days'+time'14:25','completed',true),
    (v_biz,v_svc1,'cccc0001-0000-0000-0000-000000000004',v_st1, now()-interval'55 days'+time'15:00', now()-interval'55 days'+time'15:30','no_show',  true),
    (v_biz,v_svc5,'cccc0001-0000-0000-0000-000000000005',v_st2, now()-interval'54 days'+time'11:00', now()-interval'54 days'+time'11:40','completed',true),
    (v_biz,v_svc6,'cccc0001-0000-0000-0000-000000000006',v_st3, now()-interval'54 days'+time'16:00', now()-interval'54 days'+time'17:15','completed',true),
    (v_biz,v_svc1,'cccc0001-0000-0000-0000-000000000007',v_st1, now()-interval'53 days'+time'09:00', now()-interval'53 days'+time'09:30','completed',true),
    (v_biz,v_svc2,'cccc0001-0000-0000-0000-000000000008',v_st2, now()-interval'53 days'+time'10:30', now()-interval'53 days'+time'11:20','completed',true),
    -- Semana -7
    (v_biz,v_svc1,'cccc0001-0000-0000-0000-000000000009',v_st1, now()-interval'49 days'+time'09:00', now()-interval'49 days'+time'09:30','completed',true),
    (v_biz,v_svc3,'cccc0001-0000-0000-0000-000000000010',v_st3, now()-interval'49 days'+time'11:00', now()-interval'49 days'+time'11:25','completed',true),
    (v_biz,v_svc2,'cccc0001-0000-0000-0000-000000000001',v_st2, now()-interval'48 days'+time'10:00', now()-interval'48 days'+time'10:50','completed',true),
    (v_biz,v_svc4,'cccc0001-0000-0000-0000-000000000011',v_st1, now()-interval'48 days'+time'14:00', now()-interval'48 days'+time'14:25','completed',true),
    (v_biz,v_svc5,'cccc0001-0000-0000-0000-000000000012',v_st2, now()-interval'47 days'+time'15:30', now()-interval'47 days'+time'16:10','completed',true),
    (v_biz,v_svc1,'cccc0001-0000-0000-0000-000000000013',v_st3, now()-interval'47 days'+time'17:00', now()-interval'47 days'+time'17:30','no_show',  true),
    (v_biz,v_svc6,'cccc0001-0000-0000-0000-000000000002',v_st1, now()-interval'46 days'+time'09:30', now()-interval'46 days'+time'10:45','completed',true),
    (v_biz,v_svc3,'cccc0001-0000-0000-0000-000000000014',v_st3, now()-interval'45 days'+time'11:00', now()-interval'45 days'+time'11:25','completed',true),
    -- Semana -6
    (v_biz,v_svc1,'cccc0001-0000-0000-0000-000000000003',v_st2, now()-interval'42 days'+time'09:00', now()-interval'42 days'+time'09:30','completed',true),
    (v_biz,v_svc2,'cccc0001-0000-0000-0000-000000000004',v_st1, now()-interval'42 days'+time'10:00', now()-interval'42 days'+time'10:50','completed',true),
    (v_biz,v_svc5,'cccc0001-0000-0000-0000-000000000005',v_st3, now()-interval'41 days'+time'14:30', now()-interval'41 days'+time'15:10','completed',true),
    (v_biz,v_svc1,'cccc0001-0000-0000-0000-000000000006',v_st2, now()-interval'40 days'+time'11:00', now()-interval'40 days'+time'11:30','completed',true),
    (v_biz,v_svc3,'cccc0001-0000-0000-0000-000000000007',v_st1, now()-interval'40 days'+time'16:00', now()-interval'40 days'+time'16:25','completed',true),
    (v_biz,v_svc6,'cccc0001-0000-0000-0000-000000000008',v_st3, now()-interval'39 days'+time'09:00', now()-interval'39 days'+time'10:15','completed',true),
    -- Semana -5
    (v_biz,v_svc2,'cccc0001-0000-0000-0000-000000000015',v_st2, now()-interval'35 days'+time'10:30', now()-interval'35 days'+time'11:20','completed',true),
    (v_biz,v_svc1,'cccc0001-0000-0000-0000-000000000009',v_st1, now()-interval'35 days'+time'14:00', now()-interval'35 days'+time'14:30','completed',true),
    (v_biz,v_svc4,'cccc0001-0000-0000-0000-000000000010',v_st3, now()-interval'34 days'+time'15:00', now()-interval'34 days'+time'15:25','cancelled', false),
    (v_biz,v_svc5,'cccc0001-0000-0000-0000-000000000011',v_st2, now()-interval'33 days'+time'11:00', now()-interval'33 days'+time'11:40','completed',true),
    -- Semana -4
    (v_biz,v_svc1,'cccc0001-0000-0000-0000-000000000012',v_st1, now()-interval'28 days'+time'09:00', now()-interval'28 days'+time'09:30','completed',true),
    (v_biz,v_svc2,'cccc0001-0000-0000-0000-000000000013',v_st2, now()-interval'28 days'+time'10:00', now()-interval'28 days'+time'10:50','completed',true),
    (v_biz,v_svc6,'cccc0001-0000-0000-0000-000000000001',v_st3, now()-interval'27 days'+time'14:00', now()-interval'27 days'+time'15:15','completed',true),
    (v_biz,v_svc3,'cccc0001-0000-0000-0000-000000000014',v_st1, now()-interval'27 days'+time'16:00', now()-interval'27 days'+time'16:25','completed',true),
    (v_biz,v_svc5,'cccc0001-0000-0000-0000-000000000002',v_st2, now()-interval'26 days'+time'09:30', now()-interval'26 days'+time'10:10','no_show',  true),
    (v_biz,v_svc1,'cccc0001-0000-0000-0000-000000000015',v_st3, now()-interval'26 days'+time'11:00', now()-interval'26 days'+time'11:30','completed',true),
    -- Semana -3
    (v_biz,v_svc2,'cccc0001-0000-0000-0000-000000000003',v_st1, now()-interval'21 days'+time'10:00', now()-interval'21 days'+time'10:50','completed',true),
    (v_biz,v_svc4,'cccc0001-0000-0000-0000-000000000004',v_st2, now()-interval'21 days'+time'14:30', now()-interval'21 days'+time'14:55','completed',true),
    (v_biz,v_svc1,'cccc0001-0000-0000-0000-000000000005',v_st3, now()-interval'20 days'+time'11:00', now()-interval'20 days'+time'11:30','completed',true),
    (v_biz,v_svc6,'cccc0001-0000-0000-0000-000000000006',v_st1, now()-interval'20 days'+time'15:00', now()-interval'20 days'+time'16:15','completed',true),
    (v_biz,v_svc3,'cccc0001-0000-0000-0000-000000000007',v_st2, now()-interval'19 days'+time'09:00', now()-interval'19 days'+time'09:25','completed',true),
    (v_biz,v_svc5,'cccc0001-0000-0000-0000-000000000008',v_st3, now()-interval'19 days'+time'16:30', now()-interval'19 days'+time'17:10','completed',true),
    -- Semana -2
    (v_biz,v_svc1,'cccc0001-0000-0000-0000-000000000009',v_st1, now()-interval'14 days'+time'09:00', now()-interval'14 days'+time'09:30','completed',true),
    (v_biz,v_svc2,'cccc0001-0000-0000-0000-000000000010',v_st2, now()-interval'14 days'+time'11:00', now()-interval'14 days'+time'11:50','completed',true),
    (v_biz,v_svc6,'cccc0001-0000-0000-0000-000000000011',v_st3, now()-interval'13 days'+time'10:00', now()-interval'13 days'+time'11:15','completed',true),
    (v_biz,v_svc1,'cccc0001-0000-0000-0000-000000000012',v_st1, now()-interval'12 days'+time'14:00', now()-interval'12 days'+time'14:30','completed',true),
    (v_biz,v_svc3,'cccc0001-0000-0000-0000-000000000013',v_st2, now()-interval'12 days'+time'15:30', now()-interval'12 days'+time'15:55','completed',true),
    (v_biz,v_svc5,'cccc0001-0000-0000-0000-000000000014',v_st3, now()-interval'11 days'+time'09:30', now()-interval'11 days'+time'10:10','completed',true),
    -- Semana passada
    (v_biz,v_svc2,'cccc0001-0000-0000-0000-000000000015',v_st1, now()-interval'7 days'+time'10:00',  now()-interval'7 days'+time'10:50', 'completed',true),
    (v_biz,v_svc1,'cccc0001-0000-0000-0000-000000000001',v_st2, now()-interval'7 days'+time'14:00',  now()-interval'7 days'+time'14:30', 'completed',true),
    (v_biz,v_svc6,'cccc0001-0000-0000-0000-000000000002',v_st3, now()-interval'6 days'+time'11:00',  now()-interval'6 days'+time'12:15', 'completed',true),
    (v_biz,v_svc4,'cccc0001-0000-0000-0000-000000000003',v_st1, now()-interval'6 days'+time'15:00',  now()-interval'6 days'+time'15:25', 'completed',true),
    (v_biz,v_svc3,'cccc0001-0000-0000-0000-000000000004',v_st2, now()-interval'5 days'+time'09:00',  now()-interval'5 days'+time'09:25', 'no_show',  true),
    (v_biz,v_svc2,'cccc0001-0000-0000-0000-000000000005',v_st3, now()-interval'5 days'+time'10:30',  now()-interval'5 days'+time'11:20', 'completed',true),
    -- Hoje
    (v_biz,v_svc1,'cccc0001-0000-0000-0000-000000000006',v_st1, (current_date+time'09:30')::timestamptz, (current_date+time'10:00')::timestamptz,'confirmed',false),
    (v_biz,v_svc2,'cccc0001-0000-0000-0000-000000000007',v_st2, (current_date+time'10:00')::timestamptz, (current_date+time'10:50')::timestamptz,'confirmed',false),
    (v_biz,v_svc5,'cccc0001-0000-0000-0000-000000000008',v_st3, (current_date+time'11:30')::timestamptz, (current_date+time'12:10')::timestamptz,'confirmed',false),
    (v_biz,v_svc3,'cccc0001-0000-0000-0000-000000000009',v_st1, (current_date+time'14:00')::timestamptz, (current_date+time'14:25')::timestamptz,'confirmed',false),
    (v_biz,v_svc6,'cccc0001-0000-0000-0000-000000000010',v_st2, (current_date+time'15:00')::timestamptz, (current_date+time'16:15')::timestamptz,'confirmed',false),
    -- Amanhã
    (v_biz,v_svc1,'cccc0001-0000-0000-0000-000000000011',v_st3, (current_date+1+time'09:00')::timestamptz,(current_date+1+time'09:30')::timestamptz,'confirmed',false),
    (v_biz,v_svc2,'cccc0001-0000-0000-0000-000000000012',v_st1, (current_date+1+time'10:00')::timestamptz,(current_date+1+time'10:50')::timestamptz,'confirmed',false),
    (v_biz,v_svc4,'cccc0001-0000-0000-0000-000000000013',v_st2, (current_date+1+time'11:30')::timestamptz,(current_date+1+time'11:55')::timestamptz,'confirmed',false),
    -- Depois de amanhã
    (v_biz,v_svc5,'cccc0001-0000-0000-0000-000000000014',v_st3, (current_date+2+time'14:00')::timestamptz,(current_date+2+time'14:40')::timestamptz,'confirmed',false),
    (v_biz,v_svc6,'cccc0001-0000-0000-0000-000000000015',v_st1, (current_date+2+time'16:00')::timestamptz,(current_date+2+time'17:15')::timestamptz,'confirmed',false);

end $$;

-- Confirmação: deves ver clientes=15, marcacoes_total≈60, receita≈650€
select
  (select count(*) from public.customers)                              as clientes,
  (select count(*) from public.bookings where business_id = (select id from public.businesses where slug='barbearia-ze' limit 1)) as marcacoes_total,
  (select count(*) from public.bookings b join public.businesses biz on biz.id=b.business_id where biz.slug='barbearia-ze' and b.status='completed') as completadas,
  (select count(*) from public.bookings b join public.businesses biz on biz.id=b.business_id where biz.slug='barbearia-ze' and b.status='confirmed') as futuras,
  (select count(*) from public.bookings b join public.businesses biz on biz.id=b.business_id where biz.slug='barbearia-ze' and b.status='no_show')   as no_shows,
  (select round(sum(s.price)::numeric,2)
   from public.bookings b
   join public.businesses biz on biz.id=b.business_id
   join public.services s on s.id=b.service_id
   where biz.slug='barbearia-ze' and b.status='completed')            as receita_eur;
