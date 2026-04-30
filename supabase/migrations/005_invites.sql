-- ============================================================
-- 005_invites.sql
-- Convites por e-mail para workspaces
-- ============================================================

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

create index on public.invites (token);
create index on public.invites (workspace_id);

-- ── RLS: invites ─────────────────────────────────────────────

alter table public.invites enable row level security;

-- Admin do workspace cria convites
create policy "invites: admin pode criar"
  on public.invites for insert
  with check (
    exists (
      select 1 from public.workspace_members
      where workspace_id = invites.workspace_id
        and profile_id = auth.uid()
        and role = 'admin'
    )
  );

-- Admin vê convites do próprio workspace
create policy "invites: admin pode ver"
  on public.invites for select
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = invites.workspace_id
        and profile_id = auth.uid()
        and role = 'admin'
    )
  );

-- Qualquer pessoa pode ler pelo token (para aceite — service role faz o join)
-- A API route de aceite usa service_role e valida o token server-side

-- Admin pode revogar convite
create policy "invites: admin pode deletar"
  on public.invites for delete
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = invites.workspace_id
        and profile_id = auth.uid()
        and role = 'admin'
    )
  );

-- Permite marcar convite como aceito (update de accepted_at)
create policy "invites: update de accepted_at permitido"
  on public.invites for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);
