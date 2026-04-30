-- ============================================================
-- 004_deals.sql
-- Deals do pipeline Kanban — isolados por workspace
-- ============================================================

create type public.deal_stage as enum (
  'novo_lead',
  'contato_realizado',
  'proposta_enviada',
  'negociacao',
  'fechado_ganho',
  'fechado_perdido'
);

create table if not exists public.deals (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  title         text not null,
  value         numeric(12, 2) not null default 0,
  stage         public.deal_stage not null default 'novo_lead',
  lead_id       uuid references public.leads(id) on delete set null,
  owner_id      uuid references public.profiles(id) on delete set null,
  due_date      date,
  position      integer not null default 0,
  created_at    timestamptz not null default now()
);

create index on public.deals (workspace_id);
create index on public.deals (stage);
create index on public.deals (lead_id);
create index on public.deals (owner_id);

-- ── RLS: deals ──────────────────────────────────────────────

alter table public.deals enable row level security;

create policy "deals: membros do workspace podem ver"
  on public.deals for select
  using (public.is_workspace_member(workspace_id));

create policy "deals: membros podem criar"
  on public.deals for insert
  with check (public.is_workspace_member(workspace_id));

create policy "deals: membros podem editar"
  on public.deals for update
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "deals: membros podem deletar"
  on public.deals for delete
  using (public.is_workspace_member(workspace_id));
