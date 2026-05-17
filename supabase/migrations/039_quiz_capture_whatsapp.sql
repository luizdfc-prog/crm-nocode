-- Adiciona campo capture_whatsapp ao quiz de qualificação do catálogo
ALTER TABLE catalog_quiz
  ADD COLUMN IF NOT EXISTS capture_whatsapp boolean NOT NULL DEFAULT false;
