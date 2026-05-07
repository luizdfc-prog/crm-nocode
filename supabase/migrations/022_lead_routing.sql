-- Tabela de contadores para distribuição round-robin ponderada de leads.
-- Cada linha registra quantos leads um pipeline já recebeu do agente.

CREATE TABLE IF NOT EXISTS lead_routing_counters (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  pipeline_id   uuid NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  count         integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, pipeline_id)
);

ALTER TABLE lead_routing_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can read routing counters"
  ON lead_routing_counters FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE profile_id = auth.uid()
    )
  );

-- Service role gerencia os contadores (via webhook/cron)
CREATE POLICY "service role manages routing counters"
  ON lead_routing_counters FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
