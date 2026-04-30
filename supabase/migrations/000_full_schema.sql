-- ============================================================
-- PipeFlow CRM — Schema completo
-- Cole este arquivo inteiro no SQL Editor do Supabase Studio
-- Ordem: profiles → workspaces → leads/activities → deals → invites
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. PROFILES
-- ──────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null default '',
  email       text not null default '',
  avatar_url  text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: usuário lê o próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: usuário edita o próprio perfil"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.email, '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ──────────────────────────────────────────────────────────────
-- 2. WORKSPACES & MEMBERS
-- ──────────────────────────────────────────────────────────────

create type public.workspace_plan as enum ('free', 'pro');
create type public.member_role    as enum ('admin', 'member');

create table if not exists public.workspaces (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null,
  plan                    public.workspace_plan not null default 'free',
  stripe_customer_id      text,
  stripe_subscription_id  text,
  created_at              timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  role          public.member_role not null default 'member',
  created_at    timestamptz not null default now(),
  unique (workspace_id, profile_id)
);

create index if not exists workspace_members_workspace_id_idx on public.workspace_members (workspace_id);
create index if not exists workspace_members_profile_id_idx  on public.workspace_members (profile_id);

-- RLS workspaces
alter table public.workspaces enable row level security;

create policy "workspaces: membros podem ver"
  on public.workspaces for select
  using (id in (select public.current_user_workspace_ids()));

create policy "workspaces: usuário autenticado pode criar"
  on public.workspaces for insert
  with check (auth.uid() is not null);

create policy "workspaces: admin pode editar"
  on public.workspaces for update
  using (
    id in (select public.current_user_workspace_ids())
    and exists (
      select 1 from public.workspace_members
      where workspace_id = workspaces.id
        and profile_id = auth.uid()
        and role = 'admin'
    )
  )
  with check (
    id in (select public.current_user_workspace_ids())
    and exists (
      select 1 from public.workspace_members
      where workspace_id = workspaces.id
        and profile_id = auth.uid()
        and role = 'admin'
    )
  );

-- RLS workspace_members
alter table public.workspace_members enable row level security;

-- Nota: usa current_user_workspace_ids() para evitar recursão infinita
-- (políticas que consultam a própria tabela causam loop no RLS do PostgreSQL)
create policy "workspace_members: membros podem ver"
  on public.workspace_members for select
  using (workspace_id in (select public.current_user_workspace_ids()));

create policy "workspace_members: inserção para autenticados"
  on public.workspace_members for insert
  with check (auth.uid() is not null);

create policy "workspace_members: admin remove ou membro sai"
  on public.workspace_members for delete
  using (
    profile_id = auth.uid()
    or (
      workspace_id in (select public.current_user_workspace_ids())
      and exists (
        select 1 from public.workspace_members wm
        where wm.workspace_id = workspace_members.workspace_id
          and wm.profile_id = auth.uid()
          and wm.role = 'admin'
      )
    )
  );

create policy "workspace_members: admin pode editar papel"
  on public.workspace_members for update
  using (
    workspace_id in (select public.current_user_workspace_ids())
    and exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.profile_id = auth.uid()
        and wm.role = 'admin'
    )
  );

-- Trigger: criador vira admin automaticamente
create or replace function public.handle_workspace_created()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.workspace_members (workspace_id, profile_id, role)
  values (new.id, auth.uid(), 'admin');
  return new;
end;
$$;

drop trigger if exists on_workspace_created on public.workspaces;
create trigger on_workspace_created
  after insert on public.workspaces
  for each row execute procedure public.handle_workspace_created();

-- ──────────────────────────────────────────────────────────────
-- 3. HELPERS (security definer — bypassam RLS internamente)
-- ──────────────────────────────────────────────────────────────

-- Retorna todos os workspace_ids do usuário atual (sem recursão RLS)
create or replace function public.current_user_workspace_ids()
returns setof uuid
language sql
stable
security definer set search_path = public
as $$
  select workspace_id
  from public.workspace_members
  where profile_id = auth.uid()
$$;

-- Verifica se o usuário é membro de um workspace específico
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

-- ──────────────────────────────────────────────────────────────
-- 4. LEADS & ACTIVITIES
-- ──────────────────────────────────────────────────────────────

create type public.lead_status as enum (
  'novo', 'contato', 'proposta', 'negociacao', 'ganho', 'perdido'
);

create type public.activity_type as enum (
  'ligacao', 'email', 'reuniao', 'nota'
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

create index if not exists leads_workspace_id_idx on public.leads (workspace_id);
create index if not exists leads_status_idx       on public.leads (status);
create index if not exists leads_owner_id_idx     on public.leads (owner_id);

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

create index if not exists activities_workspace_id_idx on public.activities (workspace_id);
create index if not exists activities_lead_id_idx      on public.activities (lead_id);

-- RLS leads
alter table public.leads enable row level security;

create policy "leads: membros podem ver"
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

-- RLS activities
alter table public.activities enable row level security;

create policy "activities: membros podem ver"
  on public.activities for select
  using (public.is_workspace_member(workspace_id));

create policy "activities: membros podem criar"
  on public.activities for insert
  with check (public.is_workspace_member(workspace_id));

create policy "activities: membros podem deletar"
  on public.activities for delete
  using (public.is_workspace_member(workspace_id));

-- ──────────────────────────────────────────────────────────────
-- 5. DEALS (Pipeline Kanban)
-- ──────────────────────────────────────────────────────────────

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

create index if not exists deals_workspace_id_idx on public.deals (workspace_id);
create index if not exists deals_stage_idx        on public.deals (stage);
create index if not exists deals_lead_id_idx      on public.deals (lead_id);

-- RLS deals
alter table public.deals enable row level security;

create policy "deals: membros podem ver"
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

-- ──────────────────────────────────────────────────────────────
-- 6. INVITES
-- ──────────────────────────────────────────────────────────────

create table if not exists public.invites (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  email         text not null,
  role          public.member_role not null default 'member',
  token         text not null unique default encode(gen_random_bytes(32), 'hex'),
  expires_at    timestamptz not null default (now() + interval '7 days'),
  accepted_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists invites_token_idx        on public.invites (token);
create index if not exists invites_workspace_id_idx on public.invites (workspace_id);

-- RLS invites
alter table public.invites enable row level security;

create policy "invites: admin pode criar"
  on public.invites for insert
  with check (
    workspace_id in (select public.current_user_workspace_ids())
    and exists (
      select 1 from public.workspace_members
      where workspace_id = invites.workspace_id
        and profile_id = auth.uid()
        and role = 'admin'
    )
  );

create policy "invites: admin pode ver"
  on public.invites for select
  using (
    workspace_id in (select public.current_user_workspace_ids())
    and exists (
      select 1 from public.workspace_members
      where workspace_id = invites.workspace_id
        and profile_id = auth.uid()
        and role = 'admin'
    )
  );

create policy "invites: admin pode deletar"
  on public.invites for delete
  using (
    workspace_id in (select public.current_user_workspace_ids())
    and exists (
      select 1 from public.workspace_members
      where workspace_id = invites.workspace_id
        and profile_id = auth.uid()
        and role = 'admin'
    )
  );

create policy "invites: update de accepted_at"
  on public.invites for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);
