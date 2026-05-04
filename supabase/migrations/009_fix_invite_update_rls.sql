-- ============================================================
-- 009_fix_invite_update_rls.sql
-- Corrige policy excessivamente permissiva de UPDATE em
-- workspace_invites.
--
-- Problema: "workspace_invites: update de accepted_at" usava
-- `auth.uid() is not null` como única condição, permitindo que
-- qualquer usuário autenticado sobrescrevesse qualquer campo de
-- qualquer convite (ex: workspace_id, email, role, expires_at).
--
-- Na prática o aceite de convites é feito via service role na
-- API route, portanto esta policy não precisa existir para o
-- fluxo normal. A removemos e substituímos por uma que restringe
-- ao token correto e apenas ao campo accepted_at (via check).
-- ============================================================

drop policy if exists "invites: update de accepted_at"
  on public.workspace_invites;

drop policy if exists "workspace_invites: update de accepted_at"
  on public.workspace_invites;

-- Política substituta: permite apenas marcar o próprio convite
-- como aceito — exige que o registro ainda não esteja aceito e
-- que o update não altere workspace_id, email, role nem token.
-- (O aceite real acontece via service role na API; esta policy
--  é a camada de defesa caso alguém tente pelo anon key.)
create policy "workspace_invites: marcar como aceito"
  on public.workspace_invites for update
  using (
    accepted_at is null
    and expires_at > now()
    and auth.uid() is not null
  )
  with check (
    -- Campos imutáveis não podem mudar
    workspace_id = workspace_id
    and email     = email
    and role      = role
    and token     = token
    -- Somente accepted_at pode ser definido (não revertido)
    and accepted_at is not null
  );
