-- Remove a etapa "Aguardando Resposta" dos pipelines do Agente IA.
-- Deals que estejam nessa etapa são movidos para "Qualificando" antes da deleção.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT ps.id AS stage_id, ps.pipeline_id
    FROM pipeline_stages ps
    JOIN pipelines p ON p.id = ps.pipeline_id
    WHERE ps.name = 'Aguardando Resposta'
      AND p.type = 'agent'
  LOOP
    -- Move deals parados nessa etapa de volta para Qualificando
    UPDATE deals
    SET stage_id = (
      SELECT id FROM pipeline_stages
      WHERE pipeline_id = r.pipeline_id
        AND name = 'Qualificando'
      LIMIT 1
    )
    WHERE stage_id = r.stage_id;

    -- Reposiciona as etapas seguintes para fechar o gap
    UPDATE pipeline_stages
    SET position = position - 1
    WHERE pipeline_id = r.pipeline_id
      AND position > (
        SELECT position FROM pipeline_stages WHERE id = r.stage_id
      );

    -- Remove a etapa
    DELETE FROM pipeline_stages WHERE id = r.stage_id;
  END LOOP;
END $$;
