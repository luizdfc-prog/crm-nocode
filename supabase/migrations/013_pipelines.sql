-- Migration 013: Pipelines múltiplos
-- Cria tabelas pipelines e pipeline_stages, adiciona pipeline_id e stage_id em deals

-- ── Tabela pipelines ──────────────────────────────────────────────────────────
create table public.pipelines (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name         text not null,
  type         text not null default 'sales' check (type in ('sales', 'agent', 'custom')),
  position     integer not null default 0,
  created_at   timestamptz not null default now()
);

-- ── Tabela pipeline_stages ────────────────────────────────────────────────────
create table public.pipeline_stages (
  id          uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references public.pipelines(id) on delete cascade,
  name        text not null,
  color       text not null default '#5B7FFF',
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ── Função is_workspace_admin ─────────────────────────────────────────────────
create or replace function public.is_workspace_admin(p_workspace_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id
      and profile_id = auth.uid()
      and role = 'admin'
  )
$$;

-- ── RLS pipelines ─────────────────────────────────────────────────────────────
alter table public.pipelines enable row level security;

create policy "pipelines: membros podem ver"
  on public.pipelines for select
  using (public.is_workspace_member(workspace_id));

create policy "pipelines: admin pode criar"
  on public.pipelines for insert
  with check (public.is_workspace_admin(workspace_id));

create policy "pipelines: admin pode editar"
  on public.pipelines for update
  using (public.is_workspace_admin(workspace_id));

create policy "pipelines: admin pode deletar"
  on public.pipelines for delete
  using (public.is_workspace_admin(workspace_id));

-- ── RLS pipeline_stages ───────────────────────────────────────────────────────
alter table public.pipeline_stages enable row level security;

create policy "pipeline_stages: membros podem ver"
  on public.pipeline_stages for select
  using (
    exists (
      select 1 from public.pipelines p
      where p.id = pipeline_id
        and public.is_workspace_member(p.workspace_id)
    )
  );

create policy "pipeline_stages: admin pode criar"
  on public.pipeline_stages for insert
  with check (
    exists (
      select 1 from public.pipelines p
      where p.id = pipeline_id
        and public.is_workspace_admin(p.workspace_id)
    )
  );

create policy "pipeline_stages: admin pode editar"
  on public.pipeline_stages for update
  using (
    exists (
      select 1 from public.pipelines p
      where p.id = pipeline_id
        and public.is_workspace_admin(p.workspace_id)
    )
  );

create policy "pipeline_stages: admin pode deletar"
  on public.pipeline_stages for delete
  using (
    exists (
      select 1 from public.pipelines p
      where p.id = pipeline_id
        and public.is_workspace_admin(p.workspace_id)
    )
  );

-- ── Adicionar colunas em deals ────────────────────────────────────────────────
alter table public.deals
  add column if not exists pipeline_id uuid references public.pipelines(id) on delete set null;

alter table public.deals
  add column if not exists stage_id uuid references public.pipeline_stages(id) on delete set null;

-- ── Índices ───────────────────────────────────────────────────────────────────
create index if not exists pipelines_workspace_id_idx      on public.pipelines(workspace_id);
create index if not exists pipeline_stages_pipeline_id_idx on public.pipeline_stages(pipeline_id);
create index if not exists deals_pipeline_id_idx           on public.deals(pipeline_id);
create index if not exists deals_stage_id_idx              on public.deals(stage_id);
