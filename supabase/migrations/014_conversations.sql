-- Tabela de conversas WhatsApp
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  phone_number text not null,
  phone_number_id text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  assigned_to uuid references profiles(id) on delete set null,
  ai_active boolean not null default true,
  last_message_at timestamptz,
  unread_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- Tabela de mensagens
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  whatsapp_message_id text unique,
  direction text not null check (direction in ('inbound', 'outbound')),
  type text not null default 'text',
  content text,
  status text not null default 'sent' check (status in ('sent', 'delivered', 'read', 'failed')),
  sender_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Índices
create index if not exists conversations_workspace_id_idx on conversations(workspace_id);
create index if not exists conversations_phone_number_idx on conversations(phone_number);
create index if not exists conversations_lead_id_idx on conversations(lead_id);
create index if not exists messages_conversation_id_idx on messages(conversation_id);
create index if not exists messages_workspace_id_idx on messages(workspace_id);

-- RLS
alter table conversations enable row level security;
alter table messages enable row level security;

-- Policies conversations
create policy "workspace members can view conversations"
  on conversations for select
  using (is_workspace_member(workspace_id));

create policy "workspace members can insert conversations"
  on conversations for insert
  with check (is_workspace_member(workspace_id));

create policy "workspace members can update conversations"
  on conversations for update
  using (is_workspace_member(workspace_id));

-- Policies messages
create policy "workspace members can view messages"
  on messages for select
  using (is_workspace_member(workspace_id));

create policy "workspace members can insert messages"
  on messages for insert
  with check (is_workspace_member(workspace_id));
