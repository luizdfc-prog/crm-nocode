-- =====================================================================
-- 047: Tags de lead + reestruturação salesbot_steps para grafo
--      + salesbot_executions + colunas extras na salesbot_send_queue
-- =====================================================================

-- -----------------------------------------------------------------------
-- 1. TAGS
-- -----------------------------------------------------------------------

CREATE TABLE lead_tags_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#5B7FFF',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, name)
);

CREATE TABLE lead_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES lead_tags_definitions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lead_id, tag_id)
);

CREATE INDEX idx_lead_tags_definitions_workspace ON lead_tags_definitions(workspace_id);
CREATE INDEX idx_lead_tags_lead ON lead_tags(lead_id);
CREATE INDEX idx_lead_tags_tag ON lead_tags(tag_id);

ALTER TABLE lead_tags_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members manage tag definitions"
  ON lead_tags_definitions FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE profile_id = auth.uid()
  ));

CREATE POLICY "workspace members manage lead tags"
  ON lead_tags FOR ALL
  USING (tag_id IN (
    SELECT id FROM lead_tags_definitions WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE profile_id = auth.uid()
    )
  ));

-- -----------------------------------------------------------------------
-- 2. SALESBOT_STEPS — novos tipos e colunas de grafo
-- -----------------------------------------------------------------------

ALTER TABLE salesbot_steps
  DROP CONSTRAINT IF EXISTS salesbot_steps_type_check;
ALTER TABLE salesbot_steps
  ADD CONSTRAINT salesbot_steps_type_check
  CHECK (type IN ('text', 'media', 'wait', 'action', 'condition'));

ALTER TABLE salesbot_steps ADD COLUMN IF NOT EXISTS next_step_id UUID REFERENCES salesbot_steps(id) ON DELETE SET NULL;
ALTER TABLE salesbot_steps ADD COLUMN IF NOT EXISTS timeout_step_id UUID REFERENCES salesbot_steps(id) ON DELETE SET NULL;
ALTER TABLE salesbot_steps ADD COLUMN IF NOT EXISTS no_match_step_id UUID REFERENCES salesbot_steps(id) ON DELETE SET NULL;

-- config JSONB:
--   wait:      { mode: 'reply'|'timer', hours, minutes, seconds }
--   action:    { action: 'add_note'|'add_task'|'set_field'|'webhook'|'manage_tags'|'meta_capi'|'change_stage'|'change_user', ...params }
--   condition: { conditions: [{ field, op: 'eq'|'neq'|'contains', value }] }
ALTER TABLE salesbot_steps ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE salesbot_steps ADD COLUMN IF NOT EXISTS label TEXT;

-- -----------------------------------------------------------------------
-- 3. SALESBOT_EXECUTIONS — controle de estado para Pausar/Condição
-- -----------------------------------------------------------------------

CREATE TABLE salesbot_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  salesbot_id UUID NOT NULL REFERENCES salesbots(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  waiting_step_id UUID REFERENCES salesbot_steps(id) ON DELETE SET NULL,
  timeout_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'waiting', 'done', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_salesbot_executions_waiting ON salesbot_executions(status, timeout_at) WHERE status = 'waiting';
CREATE INDEX idx_salesbot_executions_lead ON salesbot_executions(lead_id);
CREATE INDEX idx_salesbot_executions_deal ON salesbot_executions(deal_id);

ALTER TABLE salesbot_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members manage salesbot executions"
  ON salesbot_executions FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE profile_id = auth.uid()
  ));

CREATE TRIGGER salesbot_executions_updated_at BEFORE UPDATE ON salesbot_executions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------
-- 4. SALESBOT_SEND_QUEUE — colunas adicionais e fix RLS
-- -----------------------------------------------------------------------

ALTER TABLE salesbot_send_queue
  ADD COLUMN IF NOT EXISTS execution_id UUID REFERENCES salesbot_executions(id) ON DELETE SET NULL;
ALTER TABLE salesbot_send_queue
  ADD COLUMN IF NOT EXISTS action_config JSONB;

ALTER TABLE salesbot_send_queue
  DROP CONSTRAINT IF EXISTS salesbot_send_queue_type_check;
ALTER TABLE salesbot_send_queue
  ADD CONSTRAINT salesbot_send_queue_type_check
  CHECK (type IN ('text', 'media', 'action'));

-- Fix: política anterior usava user_id, deve ser profile_id
DROP POLICY IF EXISTS "workspace members manage send queue" ON salesbot_send_queue;
CREATE POLICY "workspace members manage send queue"
  ON salesbot_send_queue FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE profile_id = auth.uid()
  ));
