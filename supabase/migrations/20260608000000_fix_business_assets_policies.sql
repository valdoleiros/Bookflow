-- Corrige as políticas de storage.objects de 20260607000000_branding.sql:
-- "name" dentro do EXISTS ficava ambíguo com businesses.name (alias b) e o
-- Postgres resolvia para o nome da barbearia em vez do caminho do ficheiro
-- ("<business_id>/...") — por isso o upload falhava sempre com 403 RLS.
-- Aqui qualificamos explicitamente storage.objects.name.

drop policy if exists "business_assets_owner_insert" on storage.objects;
drop policy if exists "business_assets_owner_update" on storage.objects;
drop policy if exists "business_assets_owner_delete" on storage.objects;

create policy "business_assets_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'business-assets'
    and exists (
      select 1 from public.businesses b
      where b.id::text = (storage.foldername(storage.objects.name))[1]
        and b.owner_id = auth.uid()
    )
  );

create policy "business_assets_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'business-assets'
    and exists (
      select 1 from public.businesses b
      where b.id::text = (storage.foldername(storage.objects.name))[1]
        and b.owner_id = auth.uid()
    )
  );

create policy "business_assets_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'business-assets'
    and exists (
      select 1 from public.businesses b
      where b.id::text = (storage.foldername(storage.objects.name))[1]
        and b.owner_id = auth.uid()
    )
  );
