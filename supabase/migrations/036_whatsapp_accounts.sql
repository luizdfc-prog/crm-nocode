-- Conta WhatsApp Business API (Meta Cloud) por workspace
-- Substitui o uso do Baileys — cada workspace tem seu próprio número e token
CREATE TABLE IF NOT EXISTS whatsapp_accounts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  phone_number_id   text NOT NULL,          -- ID do número na Meta API
  phone_number      text NOT NULL,          -- número E.164 ex: +5534991803634
  display_name      text,                   -- nome exibido no WhatsApp Business
  access_token      text NOT NULL,          -- token do System User (não expira)
  waba_id           text,                   -- WhatsApp Business Account ID
  status            text NOT NULL DEFAULT 'active', -- active | disconnected
  connected_at      timestamptz DEFAULT now(),
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  UNIQUE (workspace_id)                     -- 1 número por workspace por enquanto
);

-- RLS
ALTER TABLE whatsapp_accounts ENABLE ROW LEVEL SECURITY;

-- Admins do workspace leem/escrevem
CREATE POLICY "members read own whatsapp_account"
  ON whatsapp_accounts FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "admins manage whatsapp_account"
  ON whatsapp_accounts FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE profile_id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER whatsapp_accounts_updated_at
  BEFORE UPDATE ON whatsapp_accounts
  FOR EACH ROW EXECUTE FUNCTION update_whatsapp_accounts_updated_at();
