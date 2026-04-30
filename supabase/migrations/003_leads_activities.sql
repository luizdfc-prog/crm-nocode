-- ============================================================
-- 003_leads_activities.sql
-- Leads e atividades — isolados por workspace
-- ============================================================

create type public.lead_status as enum (
  'novo',
  'contato',
  'proposta',
  'negociacao',
  'ganho',
  'perdido'
);

create type public.activity_type as enum (
  'ligacao',
  'email',
  'reuniao',
  'nota'
);

create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  name          text not null,
  email         text,
  phone         text,
  company       text,
  role          text,
  status        public.lead_status not null default 'novo',
  owner_id      uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index on public.leads (workspace_id);
create index on public.leads (status);
create index on public.leads (owner_id);

create table if not exists public.activities (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspaces(id) on delete cascade,
  lead_id        uuid not null references public.leads(id) on delete cascade,
  type           public.activity_type not null,
  description    text not null,
  author_id      uuid references public.profiles(id) on delete set null,
  activity_date  timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

create index on public.activities (workspace_id);
create index on public.activities (lead_id);

-- ── Helper: verifica se usuário é membro do workspace ───────

create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id
      and profile_id = auth.uid()
  )
$$;

-- ── RLS: leads ──────────────────────────────────────────────

alter table public.leads enable row level security;

create policy "leads: membros do workspace podem ver"
  on public.leads for select
  using (public.is_workspace_member(workspace_id));

create policy "leads: membros podem criar"
  on public.leads for insert
  with check (public.is_workspace_member(workspace_id));

create policy "leads: membros podem editar"
  on public.leads for update
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "leads: membros podem deletar"
  on public.leads for delete
  using (public.is_workspace_member(workspace_id));

-- ── RLS: activities ─────────────────────────────────────────

alter table public.activities enable row level security;

create policy "activities: membros do workspace podem ver"
  on public.activities for select
  using (public.is_workspace_member(workspace_id));

create policy "activities: membros podem criar"
  on public.activities for insert
  with check (public.is_workspace_member(workspace_id));

create policy "activities: membros podem deletar"
  on public.activities for delete
  using (public.is_workspace_member(workspace_id));
