-- Adiciona Follow-up 04 e 05 ao pipeline do Agente IA de todos os workspaces existentes.
-- Também remove o campo enabled global do follow_up config (migração de dados JSONB).
-- As etapas ficam desativadas por default — a UI de configuração controla quais aparecem.

DO $$
DECLARE
  r RECORD;
  transferido_pos integer;
BEGIN
  FOR r IN
    SELECT p.id AS pipeline_id
    FROM pipelines p
    WHERE p.type = 'agent'
  LOOP
    -- Posição de referência: Transferido fica em 98, Fechado Perdido em 99
    -- Follow-up 04 em 6, Follow-up 05 em 7 (se FU01-03 estão em 2,3,4)

    -- Garante FU04
    INSERT INTO pipeline_stages (pipeline_id, name, color, position)
    SELECT r.pipeline_id, 'Follow-up 04', '#FF6B35', 6
    WHERE NOT EXISTS (
      SELECT 1 FROM pipeline_stages
      WHERE pipeline_id = r.pipeline_id AND name = 'Follow-up 04'
    );

    -- Garante FU05
    INSERT INTO pipeline_stages (pipeline_id, name, color, position)
    SELECT r.pipeline_id, 'Follow-up 05', '#FF6B35', 7
    WHERE NOT EXISTS (
      SELECT 1 FROM pipeline_stages
      WHERE pipeline_id = r.pipeline_id AND name = 'Follow-up 05'
    );

    -- Garante posições corretas de Transferido (98) e Fechado Perdido (99)
    UPDATE pipeline_stages SET position = 98
    WHERE pipeline_id = r.pipeline_id AND name = 'Transferido';

    UPDATE pipeline_stages SET position = 99
    WHERE pipeline_id = r.pipeline_id AND name = 'Fechado Perdido';
  END LOOP;
END $$;

-- Migra follow_up config: adiciona enabled:true nas steps existentes (sem campo enabled)
-- e adiciona FU04/05 com enabled:false para workspaces que ainda usam formato antigo
UPDATE workspaces
SET agent_config = jsonb_set(
  agent_config,
  '{follow_up}',
  (
    SELECT jsonb_build_object(
      'silence_hours', COALESCE((agent_config->'follow_up'->>'silence_hours')::int, 2),
      'steps', (
        SELECT jsonb_agg(
          CASE
            WHEN step->>'enabled' IS NULL THEN step || '{"enabled": true}'::jsonb
            ELSE step
          END
        )
        FROM jsonb_array_elements(
          COALESCE(agent_config->'follow_up'->'steps', '[]'::jsonb)
        ) AS step
      )
    )
  )
)
WHERE agent_config ? 'follow_up'
  AND agent_config->'follow_up' ? 'steps';
