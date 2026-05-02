-- ============================================================
-- 008_fix_delete_rls.sql
-- Corrige recursão infinita na policy DELETE de workspace_members.
--
-- Causa: a policy de delete consultava workspace_members dentro
-- de si mesma → loop infinito no RLS do Postgres.
-- Solução: função security definer is_admin_of_workspace() que
-- bypassa RLS internamente ao verificar papel do usuário.
-- ============================================================

create or replace function public.is_admin_of_workspace(ws_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id
      and profile_id = auth.uid()
      and role = 'admin'
  );
$$;

drop policy if exists "workspace_members: admin remove ou membro sai"
  on public.workspace_members;

create policy "workspace_members: admin remove ou membro sai"
  on public.workspace_members for delete
  using (
    profile_id = auth.uid()
    or public.is_admin_of_workspace(workspace_id)
  );
