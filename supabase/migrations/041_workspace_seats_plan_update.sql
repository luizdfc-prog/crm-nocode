-- Migration 041: novos planos LeadLoop + seats + stripe_addon_item_id

-- Adicionar coluna seats (quantidade de usuários pagos na assinatura)
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS seats integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS stripe_addon_item_id text;

-- Atualizar enum de planos para os novos valores
-- Como o plano é armazenado como text (não enum nativo), basta atualizar os registros existentes
-- e ajustar o check constraint se existir.

-- Remover check constraint antigo se existir
ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS workspaces_plan_check;

-- Adicionar novo check constraint com os 4 planos LeadLoop
ALTER TABLE workspaces
  ADD CONSTRAINT workspaces_plan_check
  CHECK (plan IN ('essencial', 'catalogo', 'pro_ia', 'scale_ia'));

-- Migrar workspaces que ainda estão no plano antigo para 'essencial'
-- (free/starter → essencial, pro → pro_ia, scale → scale_ia)
UPDATE workspaces SET plan = 'essencial' WHERE plan IN ('free', 'starter');
UPDATE workspaces SET plan = 'pro_ia'    WHERE plan = 'pro';
UPDATE workspaces SET plan = 'scale_ia'  WHERE plan = 'scale';
