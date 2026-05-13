-- Registra toda movimentação de deals entre etapas do pipeline.
-- Usado para calcular eficiência real do follow-up no dashboard com filtro de período.

CREATE TABLE IF NOT EXISTS deal_stage_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  deal_id         uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  pipeline_id     uuid NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  from_stage_id   uuid REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  to_stage_id     uuid NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
  from_stage_name text,
  to_stage_name   text,
  moved_by        text NOT NULL DEFAULT 'user',  -- 'cron', 'webhook', 'user'
  lead_id         uuid REFERENCES leads(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Índices para queries do dashboard
CREATE INDEX IF NOT EXISTS deal_stage_logs_workspace_created
  ON deal_stage_logs (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS deal_stage_logs_to_stage
  ON deal_stage_logs (workspace_id, to_stage_id, created_at DESC);

CREATE INDEX IF NOT EXISTS deal_stage_logs_deal
  ON deal_stage_logs (deal_id, created_at DESC);

-- RLS
ALTER TABLE deal_stage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can read stage logs"
  ON deal_stage_logs FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "service role full access stage logs"
  ON deal_stage_logs FOR ALL
  USING (true)
  WITH CHECK (true);
