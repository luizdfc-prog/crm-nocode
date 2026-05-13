-- ============================================================
-- 026_catalog.sql
-- Catálogo público por workspace: config + categorias + produtos
-- ============================================================

-- Config geral do catálogo (1 por workspace)
create table if not exists public.catalog_config (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null unique references public.workspaces(id) on delete cascade,
  slug            text not null unique,           -- URL pública: /c/{slug}
  enabled         boolean not null default false,
  title           text not null default '',
  description     text not null default '',
  whatsapp_number text not null default '',        -- número sem +55, ex: 11999990000
  banner_url      text,                            -- imagem de capa (Supabase Storage)
  logo_url        text,                            -- logo da empresa
  accent_color    text not null default '#CAFF33', -- cor principal do catálogo
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Categorias do catálogo
create table if not exists public.catalog_categories (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  name          text not null,
  emoji         text not null default '📦',
  position      integer not null default 0,
  created_at    timestamptz not null default now()
);

create index on public.catalog_categories (workspace_id, position);

-- Produtos
create table if not exists public.catalog_products (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  category_id     uuid references public.catalog_categories(id) on delete set null,
  name            text not null,
  description     text not null default '',
  price           numeric(10,2),                   -- null = sem preço exibido
  image_url       text,
  badge           text,                            -- ex: "Novidade", "Mais vendido"
  active          boolean not null default true,
  position        integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index on public.catalog_products (workspace_id, category_id, position);
create index on public.catalog_products (workspace_id, active);

-- ── RLS: catalog_config ──────────────────────────────────────

alter table public.catalog_config enable row level security;

-- Leitura pública por slug (catálogo público)
create policy "catalog_config_public_read"
  on public.catalog_config for select
  using (enabled = true);

-- Membros do workspace podem ler mesmo desativado (para edição)
create policy "catalog_config_member_read"
  on public.catalog_config for select
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where profile_id = auth.uid()
    )
  );

-- Apenas admins podem inserir/atualizar/deletar
create policy "catalog_config_admin_write"
  on public.catalog_config for all
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where profile_id = auth.uid() and role = 'admin'
    )
  );

-- ── RLS: catalog_categories ──────────────────────────────────

alter table public.catalog_categories enable row level security;

create policy "catalog_categories_public_read"
  on public.catalog_categories for select
  using (
    workspace_id in (
      select workspace_id from public.catalog_config where enabled = true
    )
  );

create policy "catalog_categories_member_read"
  on public.catalog_categories for select
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where profile_id = auth.uid()
    )
  );

create policy "catalog_categories_admin_write"
  on public.catalog_categories for all
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where profile_id = auth.uid() and role = 'admin'
    )
  );

-- ── RLS: catalog_products ────────────────────────────────────

alter table public.catalog_products enable row level security;

create policy "catalog_products_public_read"
  on public.catalog_products for select
  using (
    active = true and
    workspace_id in (
      select workspace_id from public.catalog_config where enabled = true
    )
  );

create policy "catalog_products_member_read"
  on public.catalog_products for select
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where profile_id = auth.uid()
    )
  );

create policy "catalog_products_admin_write"
  on public.catalog_products for all
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where profile_id = auth.uid() and role = 'admin'
    )
  );

-- ── Storage bucket para imagens do catálogo ──────────────────

insert into storage.buckets (id, name, public)
values ('catalog-images', 'catalog-images', true)
on conflict (id) do nothing;

create policy "catalog_images_public_read"
  on storage.objects for select
  using (bucket_id = 'catalog-images');

create policy "catalog_images_member_upload"
  on storage.objects for insert
  with check (
    bucket_id = 'catalog-images' and
    auth.uid() is not null
  );

create policy "catalog_images_member_delete"
  on storage.objects for delete
  using (
    bucket_id = 'catalog-images' and
    auth.uid() is not null
  );
