-- Fila de envio de mensagens do salesbot (com suporte a delay entre passos)
CREATE TABLE salesbot_send_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  step_id UUID REFERENCES salesbot_steps(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'media')),
  message TEXT,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'audio')),
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_salesbot_queue_pending ON salesbot_send_queue(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_salesbot_queue_workspace ON salesbot_send_queue(workspace_id);

ALTER TABLE salesbot_send_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members manage send queue"
  ON salesbot_send_queue FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));
