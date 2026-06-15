-- Phase 6: Marca própria — cor de destaque + upload de logo/capa
-- Antes só era possível colar um URL de imagem; agora a barbearia pode
-- enviar ficheiros (guardados no bucket business-assets) e escolher uma
-- cor de destaque aplicada à sua página pública de marcações.

alter table public.businesses
  add column if not exists brand_color text;

insert into storage.buckets (id, name, public)
values ('business-assets', 'business-assets', true)
on conflict (id) do nothing;

-- Caminho dos ficheiros: "<business_id>/<ficheiro>" — a primeira pasta
-- identifica a barbearia, e só o dono dessa barbearia pode escrever lá.
create policy "business_assets_public_read"
  on storage.objects for select
  using (bucket_id = 'business-assets');

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
