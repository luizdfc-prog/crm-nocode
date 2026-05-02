-- ============================================================
-- 007_workspace_invites.sql
-- Renomeia `invites` → `workspace_invites` e adiciona índice
-- por email para facilitar queries de "convites pendentes para X"
-- ============================================================

alter table if exists public.invites rename to workspace_invites;

-- Índice adicional por email (convites pendentes para um endereço)
create index if not exists workspace_invites_email_idx
  on public.workspace_invites (email);

-- Renomear policies para refletir o novo nome da tabela
-- (Postgres não renomeia policies automaticamente ao renomear tabela)
alter policy "invites: admin pode criar"
  on public.workspace_invites
  rename to "workspace_invites: admin pode criar";

alter policy "invites: admin pode ver"
  on public.workspace_invites
  rename to "workspace_invites: admin pode ver";

alter policy "invites: admin pode deletar"
  on public.workspace_invites
  rename to "workspace_invites: admin pode deletar";

alter policy "invites: update de accepted_at"
  on public.workspace_invites
  rename to "workspace_invites: update de accepted_at";
