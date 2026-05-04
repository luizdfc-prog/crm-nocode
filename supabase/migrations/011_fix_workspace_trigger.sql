-- ============================================================
-- 011_fix_workspace_trigger.sql
-- O trigger on_workspace_created usava auth.uid() que retorna
-- NULL quando chamado via cliente browser em produção.
-- Solução: remover o trigger e fazer o onboarding inserir o
-- membro via Server Action com service role.
-- ============================================================

drop trigger if exists on_workspace_created on public.workspaces;
drop function if exists public.handle_workspace_created();
