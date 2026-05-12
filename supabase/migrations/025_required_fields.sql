-- Adiciona coluna required_for na tabela lead_field_definitions
-- Armazena array de {pipeline_id, stage_id} que requerem este campo preenchido

ALTER TABLE lead_field_definitions
  ADD COLUMN IF NOT EXISTS required_for jsonb NOT NULL DEFAULT '[]'::jsonb;
