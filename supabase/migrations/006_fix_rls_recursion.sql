-- ============================================================
-- 006_fix_rls_recursion.sql
-- Corrige recursão infinita nas políticas de workspace_members,
-- workspaces e invites.
--
-- Causa: políticas SELECT em workspace_members consultavam a
-- própria tabela → loop infinito no RLS.
-- Solução: função security definer que bypassa RLS internamente.
-- ============================================================

-- Helper que não sofre recursão (security definer = bypassa RLS)
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

-- ── Recriar políticas de workspace_members ───────────────────

drop policy if exists "workspace_members: membros podem ver"         on public.workspace_members;
drop policy if exists "workspace_members: inserção para autenticados" on public.workspace_members;
drop policy if exists "workspace_members: inserção permitida para autenticados" on public.workspace_members;
drop policy if exists "workspace_members: admin remove ou membro sai" on public.workspace_members;
drop policy if exists "workspace_members: admin pode editar papel"    on public.workspace_members;

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

-- ── Recriar políticas de workspaces (usa workspace_members) ──

drop policy if exists "workspaces: membros podem ver"  on public.workspaces;
drop policy if exists "workspaces: admin pode editar"  on public.workspaces;

create policy "workspaces: membros podem ver"
  on public.workspaces for select
  using (id in (select public.current_user_workspace_ids()));

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

-- ── Recriar políticas de invites (usa workspace_members) ─────

drop policy if exists "invites: admin pode criar"   on public.invites;
drop policy if exists "invites: admin pode ver"     on public.invites;
drop policy if exists "invites: admin pode deletar" on public.invites;

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

-- ── Atualizar is_workspace_member para usar o mesmo helper ───

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
