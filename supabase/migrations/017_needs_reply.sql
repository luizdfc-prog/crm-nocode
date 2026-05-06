-- Adiciona campo needs_reply para rastrear conversas aguardando resposta do vendedor
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS needs_reply boolean NOT NULL DEFAULT false;
