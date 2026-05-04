-- ============================================================
-- 010_fix_invite_update_rls.sql
-- Remove a policy WITH CHECK auto-comparativa da migração 009
-- que não protegia nenhum campo (coluna = coluna sempre é TRUE).
--
-- O aceite de convites é feito exclusivamente via service role
-- na API route, portanto nenhuma policy de UPDATE é necessária
-- para o anon key. Remover é mais seguro que manter defeituosa.
-- ============================================================

drop policy if exists "workspace_invites: marcar como aceito"
  on public.workspace_invites;
