-- ============================================================
-- 034_catalog_quiz.sql
-- Quiz de Qualificação do catálogo público
-- ============================================================

-- Tabela principal do quiz por workspace
create table if not exists public.catalog_quiz (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references public.workspaces(id) on delete cascade,
  enabled               boolean not null default false,
  questions             jsonb not null default '[]'::jsonb,
  -- Estrutura de questions:
  -- [
  --   {
  --     "id": "uuid",
  --     "text": "Qual sua cidade?",
  --     "options": [
  --       { "id": "uuid", "label": "São Paulo", "qualifies": true },
  --       { "id": "uuid", "label": "Outra cidade", "qualifies": false }
  --     ]
  --   }
  -- ]
  disqualified_message  text not null default 'Infelizmente não atendemos seu perfil no momento. Mas fique à vontade para entrar em contato!',
  show_contact_anyway   boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique(workspace_id)
);

-- Campos adicionais em catalog_events para rastrear respostas do quiz
alter table public.catalog_events
  add column if not exists quiz_question_index  integer,   -- índice da pergunta (0, 1, 2)
  add column if not exists quiz_question_text   text,      -- texto da pergunta
  add column if not exists quiz_answer_label    text,      -- resposta escolhida
  add column if not exists quiz_passed          boolean;   -- true = qualificou, false = não qualificou

-- Índices para queries de analytics
create index if not exists catalog_events_quiz_idx
  on public.catalog_events (workspace_id, event_type, quiz_passed, created_at desc);

-- RLS
alter table public.catalog_quiz enable row level security;

-- Leitura pública (para exibir o quiz ao visitante sem autenticação)
create policy "catalog_quiz_public_read"
  on public.catalog_quiz for select
  using (
    workspace_id in (
      select workspace_id from public.catalog_config where enabled = true
    )
  );

-- Leitura para membros do workspace
create policy "catalog_quiz_member_read"
  on public.catalog_quiz for select
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where profile_id = auth.uid()
    )
  );

-- Apenas admins podem criar/editar o quiz
create policy "catalog_quiz_admin_write"
  on public.catalog_quiz for all
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where profile_id = auth.uid() and role = 'admin'
    )
  )
  with check (
    workspace_id in (
      select workspace_id from public.workspace_members
      where profile_id = auth.uid() and role = 'admin'
    )
  );

-- Trigger para atualizar updated_at
create or replace function public.update_catalog_quiz_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger catalog_quiz_updated_at
  before update on public.catalog_quiz
  for each row execute function public.update_catalog_quiz_updated_at();
