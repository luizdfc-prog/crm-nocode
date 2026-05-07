-- Adiciona coluna lost_reason na tabela deals
-- Preenchida quando o deal é movido para fechado_perdido

ALTER TABLE deals ADD COLUMN IF NOT EXISTS lost_reason text;
