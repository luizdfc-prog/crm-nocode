-- Salesbots: bots reutilizáveis entre automações
CREATE TABLE salesbots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Passos de cada salesbot (sequência de mensagens)
CREATE TABLE salesbot_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salesbot_id UUID NOT NULL REFERENCES salesbots(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  -- tipo: text | media
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'media')),
  -- conteúdo de texto (pode conter {{nome}}, {{empresa}}, etc)
  message TEXT,
  -- mídia: url pública no storage
  media_url TEXT,
  -- tipo de mídia: image | video | audio
  media_type TEXT CHECK (media_type IN ('image', 'video', 'audio')),
  -- delay antes deste passo (em minutos, 0 = imediato)
  delay_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Automações por etapa do pipeline
CREATE TABLE pipeline_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  -- null = etapa especial "Leads de Entrada" (on_create)
  stage_id UUID REFERENCES pipeline_stages(id) ON DELETE CASCADE,
  -- tipo de ação
  action_type TEXT NOT NULL CHECK (action_type IN (
    'salesbot',     -- Robô de vendas
    'add_task',     -- Adicionar tarefa
    'webhook',      -- Webhook
    'change_stage', -- Mudar etapa
    'change_user'   -- Alterar usuário
  )),
  -- quando executar: immediate | delay | daily | inactivity
  trigger_type TEXT NOT NULL DEFAULT 'immediate' CHECK (trigger_type IN (
    'immediate',   -- imediatamente ao entrar/criar
    'delay',       -- após X minutos
    'daily',       -- diariamente às HH:MM
    'inactivity'   -- X horas sem resposta
  )),
  trigger_delay_minutes INTEGER,    -- usado em trigger_type = 'delay'
  trigger_daily_time TIME,          -- usado em trigger_type = 'daily'
  trigger_inactivity_hours INTEGER, -- usado em trigger_type = 'inactivity'

  -- horário de funcionamento
  schedule_always BOOLEAN NOT NULL DEFAULT true,
  schedule_days TEXT[] DEFAULT ARRAY['mon','tue','wed','thu','fri','sat','sun'],
  schedule_start TIME,
  schedule_end TIME,

  -- condição (opcional) — campo + operador + valor
  condition_field TEXT,   -- ex: 'tag', 'source', 'custom:campo_id'
  condition_op TEXT,      -- ex: 'eq', 'contains', 'not_eq'
  condition_value TEXT,

  -- dados da ação (JSONB flexível por tipo)
  -- salesbot:     { salesbot_id: uuid }
  -- add_task:     { title: string, assignee_id: uuid|null, type: string, comment: string, deadline_type: 'immediate'|'hours'|'days', deadline_value: int }
  -- webhook:      { url: string }
  -- change_stage: { target_pipeline_id: uuid, target_stage_id: uuid }
  -- change_user:  { member_id: uuid }
  action_data JSONB NOT NULL DEFAULT '{}',

  -- aplicar a leads já na etapa ao salvar
  apply_to_existing BOOLEAN NOT NULL DEFAULT false,

  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Log de execuções para evitar duplicatas e para auditoria
CREATE TABLE automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES pipeline_automations(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  -- scheduled_at: quando deve executar (para delays/crons)
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  executed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'failed', 'skipped')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(automation_id, deal_id, scheduled_at)
);

-- Índices
CREATE INDEX idx_salesbots_workspace ON salesbots(workspace_id);
CREATE INDEX idx_salesbot_steps_bot ON salesbot_steps(salesbot_id, position);
CREATE INDEX idx_pipeline_automations_pipeline ON pipeline_automations(pipeline_id);
CREATE INDEX idx_pipeline_automations_stage ON pipeline_automations(stage_id);
CREATE INDEX idx_automation_executions_pending ON automation_executions(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_automation_executions_deal ON automation_executions(deal_id);

-- RLS
ALTER TABLE salesbots ENABLE ROW LEVEL SECURITY;
ALTER TABLE salesbot_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members manage salesbots"
  ON salesbots FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE profile_id = auth.uid()
  ));

CREATE POLICY "workspace members manage salesbot steps"
  ON salesbot_steps FOR ALL
  USING (salesbot_id IN (
    SELECT id FROM salesbots WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE profile_id = auth.uid()
    )
  ));

CREATE POLICY "workspace members manage automations"
  ON pipeline_automations FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE profile_id = auth.uid()
  ));

CREATE POLICY "workspace members view executions"
  ON automation_executions FOR ALL
  USING (automation_id IN (
    SELECT id FROM pipeline_automations WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE profile_id = auth.uid()
    )
  ));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER salesbots_updated_at BEFORE UPDATE ON salesbots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER pipeline_automations_updated_at BEFORE UPDATE ON pipeline_automations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
