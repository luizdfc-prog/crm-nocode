-- ============================================================
-- 028_catalog_tracking.sql
-- Rastreamento nativo do catálogo público + config de pixels
-- ============================================================

-- Configuração de pixels e UTMs por workspace
ALTER TABLE public.catalog_config
  ADD COLUMN IF NOT EXISTS meta_pixel_id      text,
  ADD COLUMN IF NOT EXISTS gtm_container_id   text,
  ADD COLUMN IF NOT EXISTS ga4_measurement_id text,
  ADD COLUMN IF NOT EXISTS tiktok_pixel_id    text,
  ADD COLUMN IF NOT EXISTS utm_source         text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_medium         text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_campaign       text NOT NULL DEFAULT '';

-- Eventos nativos do catálogo (view de página, view de produto, clique no WhatsApp)
create table if not exists public.catalog_events (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  event_type    text not null,   -- 'page_view' | 'product_view' | 'whatsapp_click'
  product_id    uuid references public.catalog_products(id) on delete set null,
  product_name  text,            -- snapshot do nome (produto pode ser deletado)
  referrer      text,            -- de onde veio o visitante
  user_agent    text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  created_at    timestamptz not null default now()
);

create index on public.catalog_events (workspace_id, event_type, created_at desc);
create index on public.catalog_events (workspace_id, product_id, created_at desc);

-- RLS: inserção pública (visitantes anônimos registram eventos)
alter table public.catalog_events enable row level security;

create policy "catalog_events_public_insert"
  on public.catalog_events for insert
  with check (
    workspace_id in (
      select workspace_id from public.catalog_config where enabled = true
    )
  );

-- Membros do workspace leem seus próprios eventos
create policy "catalog_events_member_read"
  on public.catalog_events for select
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where profile_id = auth.uid()
    )
  );
