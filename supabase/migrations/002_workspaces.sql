-- ============================================================
-- 002_workspaces.sql
-- Workspaces (multi-tenancy) e membros
-- ============================================================

create type public.workspace_plan as enum ('free', 'pro');
create type public.member_role as enum ('admin', 'member');

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

create index on public.workspace_members (workspace_id);
create index on public.workspace_members (profile_id);

-- ── RLS: workspaces ─────────────────────────────────────────

alter table public.workspaces enable row level security;

-- Membro do workspace pode ver o workspace
create policy "workspaces: membros podem ver"
  on public.workspaces for select
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = workspaces.id
        and profile_id = auth.uid()
    )
  );

-- Qualquer usuário autenticado pode criar workspace (ele vira admin no trigger)
create policy "workspaces: usuário autenticado pode criar"
  on public.workspaces for insert
  with check (auth.uid() is not null);

-- Apenas admin pode editar
create policy "workspaces: admin pode editar"
  on public.workspaces for update
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = workspaces.id
        and profile_id = auth.uid()
        and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.workspace_members
      where workspace_id = workspaces.id
        and profile_id = auth.uid()
        and role = 'admin'
    )
  );

-- ── RLS: workspace_members ──────────────────────────────────

alter table public.workspace_members enable row level security;

-- Membros do workspace veem os outros membros
create policy "workspace_members: membros podem ver"
  on public.workspace_members for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.profile_id = auth.uid()
    )
  );

-- Qualquer autenticado pode se inserir (para aceitar convite)
create policy "workspace_members: inserção permitida para autenticados"
  on public.workspace_members for insert
  with check (auth.uid() is not null);

-- Admin pode remover membros; membro pode sair
create policy "workspace_members: admin remove ou membro sai"
  on public.workspace_members for delete
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.profile_id = auth.uid()
        and wm.role = 'admin'
    )
  );

-- Admin pode alterar papel de membros
create policy "workspace_members: admin pode editar papel"
  on public.workspace_members for update
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.profile_id = auth.uid()
        and wm.role = 'admin'
    )
  );

-- ── Trigger: criador do workspace vira admin automaticamente ─

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
