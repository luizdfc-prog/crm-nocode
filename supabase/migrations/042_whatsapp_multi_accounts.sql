-- Migration 042: múltiplos WhatsApp por workspace
-- Cada número pode ser vinculado a um pipeline (1 usuário = 1 WhatsApp)
-- e pode ser desativado do rodízio sem desconectar

-- Remover constraint UNIQUE(workspace_id) — agora permite múltiplos números
ALTER TABLE whatsapp_accounts DROP CONSTRAINT IF EXISTS whatsapp_accounts_workspace_id_key;

-- Vincular número a um pipeline específico
ALTER TABLE whatsapp_accounts
  ADD COLUMN IF NOT EXISTS pipeline_id uuid REFERENCES pipelines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS active_in_routing boolean NOT NULL DEFAULT true;

-- Índice para busca por workspace
CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_workspace ON whatsapp_accounts(workspace_id);
