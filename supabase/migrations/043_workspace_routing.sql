-- Migration 043: routing_config independente do agente IA
-- Armazena configuração do Distribuidor de Leads e estado do rodízio

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS routing_config jsonb,
  ADD COLUMN IF NOT EXISTS routing_last_pipeline_id text;

-- routing_config exemplo:
-- {
--   "enabled": true,
--   "pipelines": [
--     { "pipeline_id": "uuid-antonio", "weight": 60 },
--     { "pipeline_id": "uuid-joana",   "weight": 40 }
--   ]
-- }
