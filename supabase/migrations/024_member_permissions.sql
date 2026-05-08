-- 024_member_permissions.sql
-- Tabela de permissões granulares por membro do workspace.
-- Admin não tem restrições — lógica aplicada apenas para role = 'member'.

create table if not exists public.member_permissions (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,

  -- Leads
  leads_create    boolean not null default true,
  leads_view      text    not null default 'all' check (leads_view in ('all', 'own', 'none')),
  leads_edit      text    not null default 'all' check (leads_edit in ('all', 'own', 'none')),
  leads_delete    boolean not null default false,
  leads_export    boolean not null default false,

  -- Conversas WhatsApp
  convs_view      text    not null default 'all' check (convs_view in ('all', 'own', 'none')),
  convs_delete    boolean not null default false,

  -- Deals (cards do pipeline)
  deals_create    boolean not null default true,
  deals_view      text    not null default 'all' check (deals_view in ('all', 'own', 'none')),
  deals_edit      text    not null default 'all' check (deals_edit in ('all', 'own', 'none')),
  deals_delete    boolean not null default false,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (workspace_id, profile_id)
);

-- Permissões por pipeline: quais pipelines o membro pode ver e editar
create table if not exists public.pipeline_permissions (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  pipeline_id   uuid not null references public.pipelines(id) on delete cascade,
  can_view      boolean not null default true,
  can_edit      boolean not null default true,
  created_at    timestamptz not null default now(),

  unique (workspace_id, profile_id, pipeline_id)
);

-- RLS
alter table public.member_permissions enable row level security;
alter table public.pipeline_permissions enable row level security;

-- Admin lê e escreve tudo no workspace
create policy "member_permissions: admin gerencia"
  on public.member_permissions for all
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = member_permissions.workspace_id
        and wm.profile_id = auth.uid()
        and wm.role = 'admin'
    )
  );

-- Membro lê as próprias permissões
create policy "member_permissions: membro lê as próprias"
  on public.member_permissions for select
  using (profile_id = auth.uid());

-- Admin gerencia pipeline_permissions
create policy "pipeline_permissions: admin gerencia"
  on public.pipeline_permissions for all
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = pipeline_permissions.workspace_id
        and wm.profile_id = auth.uid()
        and wm.role = 'admin'
    )
  );

-- Membro lê as próprias pipeline_permissions
create policy "pipeline_permissions: membro lê as próprias"
  on public.pipeline_permissions for select
  using (profile_id = auth.uid());

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger member_permissions_updated_at
  before update on public.member_permissions
  for each row execute function public.set_updated_at();
