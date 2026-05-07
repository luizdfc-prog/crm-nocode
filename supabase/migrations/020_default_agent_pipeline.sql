-- Cria o pipeline do Agente IA para todos os workspaces que ainda não têm um.
-- Idempotente: usa INSERT ... WHERE NOT EXISTS.

DO $$
DECLARE
  ws RECORD;
  pipeline_id uuid;
BEGIN
  FOR ws IN
    SELECT id FROM workspaces
    WHERE id NOT IN (
      SELECT workspace_id FROM pipelines WHERE type = 'agent'
    )
  LOOP
    -- Cria pipeline
    INSERT INTO pipelines (workspace_id, name, type, position)
    VALUES (ws.id, 'Agente IA', 'agent', 99)
    RETURNING id INTO pipeline_id;

    -- Cria etapas fixas
    INSERT INTO pipeline_stages (pipeline_id, name, color, position) VALUES
      (pipeline_id, 'Atendimento Iniciado', '#5B7FFF', 0),
      (pipeline_id, 'Qualificando',         '#CAFF33', 1),
      (pipeline_id, 'Aguardando Resposta',  '#FF6B35', 2),
      (pipeline_id, 'Follow-up 01',         '#FF6B35', 3),
      (pipeline_id, 'Follow-up 02',         '#FF6B35', 4),
      (pipeline_id, 'Follow-up 03',         '#FF6B35', 5),
      (pipeline_id, 'Transferido',          '#2ED573', 6),
      (pipeline_id, 'Fechado Perdido',      '#FF4757', 7);
  END LOOP;
END $$;
