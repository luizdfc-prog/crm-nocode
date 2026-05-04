-- ============================================================
-- 012_agent_config.sql
-- Adiciona configuração do agente IA por workspace.
-- NOT NULL com default garante que workspaces existentes
-- já recebem a estrutura sem necessidade de backfill manual.
-- ============================================================

alter table public.workspaces
  add column if not exists agent_config jsonb not null default '{
    "enabled": false,
    "prompt": "",
    "knowledge": "",
    "qualification_rules": "",
    "business_hours": {
      "enabled": false,
      "start": "08:00",
      "end": "18:00",
      "timezone": "America/Sao_Paulo"
    },
    "out_of_hours_message": ""
  }'::jsonb;
