-- Tabela de logs de consumo por workspace
-- Registra uso de IA (tokens Claude), transcrições (minutos Whisper) e mensagens WhatsApp
create table if not exists usage_logs (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  event_type    text not null, -- 'ai_tokens' | 'whisper_minutes' | 'whatsapp_message'
  -- Tokens Claude
  input_tokens  integer,
  output_tokens integer,
  -- Áudio
  audio_seconds integer,
  -- WhatsApp
  message_direction text, -- 'inbound' | 'outbound'
  -- Custo estimado em USD (calculado no momento do registro)
  cost_usd      numeric(10, 6) default 0,
  created_at    timestamptz not null default now()
);

-- Índices para queries do painel admin
create index if not exists usage_logs_workspace_id_idx on usage_logs(workspace_id);
create index if not exists usage_logs_event_type_idx on usage_logs(event_type);
create index if not exists usage_logs_created_at_idx on usage_logs(created_at);

-- RLS: somente service role pode inserir/ler (painel admin usa service role)
alter table usage_logs enable row level security;

create policy "service_role_all" on usage_logs
  for all
  to service_role
  using (true)
  with check (true);
