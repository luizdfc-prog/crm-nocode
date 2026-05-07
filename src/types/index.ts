export interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

export type WorkspacePlan = "free" | "starter" | "pro" | "scale"

export const PLAN_LIMITS: Record<WorkspacePlan, number | null> = {
  free: 50,
  starter: 300,
  pro: 1000,
  scale: null,
}

export const PLAN_LABELS: Record<WorkspacePlan, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  scale: "Scale",
}

export const PLAN_PRICES: Record<WorkspacePlan, string> = {
  free: "Grátis",
  starter: "R$49/mês",
  pro: "R$149/mês",
  scale: "R$299/mês",
}

export interface Workspace {
  id: string;
  name: string;
  plan: WorkspacePlan;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
}

export interface Member {
  id: string;
  workspace_id: string;
  profile_id: string;
  role: "admin" | "member";
  created_at: string;
  profile?: Profile;
}

// Enums alinhados com o banco PostgreSQL (português)
export type LeadStatus =
  | "novo"
  | "contato"
  | "proposta"
  | "negociacao"
  | "ganho"
  | "perdido";

export interface Lead {
  id: string;
  workspace_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
  status: LeadStatus;
  owner_id: string | null;
  created_at: string;
  owner?: Profile;
}

export type ActivityType = "ligacao" | "email" | "reuniao" | "nota";

export interface Activity {
  id: string;
  workspace_id: string;
  lead_id: string;
  type: ActivityType;
  description: string;
  author_id: string | null;
  activity_date: string;
  created_at: string;
  author?: Profile;
}

export type DealStage =
  | "novo_lead"
  | "contato_realizado"
  | "proposta_enviada"
  | "negociacao"
  | "fechado_ganho"
  | "fechado_perdido";

export interface Pipeline {
  id: string;
  workspace_id: string;
  name: string;
  type: "sales" | "agent" | "custom";
  position: number;
  created_at: string;
  stages?: PipelineStage[];
}

export interface PipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  color: string;
  position: number;
  created_at: string;
}

export interface Deal {
  id: string;
  workspace_id: string;
  title: string;
  value: number;
  stage: DealStage;
  pipeline_id: string | null;
  stage_id: string | null;
  lead_id: string | null;
  owner_id: string | null;
  due_date: string | null;
  position: number;
  created_at: string;
  lead?: Lead;
  owner?: Profile;
  pipeline_stage?: PipelineStage;
}

export type PermissionLevel = 'all' | 'own' | 'none'

export interface MemberPermissions {
  id: string
  workspace_id: string
  profile_id: string
  leads_create: boolean
  leads_view: PermissionLevel
  leads_edit: PermissionLevel
  leads_delete: boolean
  convs_view: PermissionLevel
  convs_delete: boolean
  deals_create: boolean
  deals_view: PermissionLevel
  deals_edit: PermissionLevel
  deals_delete: boolean
}

export interface WorkspaceInvite {
  id: string;
  workspace_id: string;
  email: string;
  role: "admin" | "member";
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface AgentBusinessHours {
  enabled: boolean;
  start: string;
  end: string;
  timezone: string;
}

export interface AgentConfig {
  enabled: boolean;
  prompt: string;
  knowledge: string;
  qualification_rules: string;
  business_hours: AgentBusinessHours;
  out_of_hours_message: string;
}

export type CustomFieldType = "text" | "number" | "date" | "select" | "multiselect"

export interface LeadFieldDefinition {
  id: string
  workspace_id: string
  name: string
  field_key: string
  field_type: CustomFieldType
  options: string[]
  position: number
  created_at: string
}

export interface LeadFieldValue {
  id: string
  workspace_id: string
  lead_id: string
  field_id: string
  value: string | null
  created_at: string
  updated_at: string
}

export interface LeadFieldWithValue extends LeadFieldDefinition {
  value: string | null
}

export type ConversationStatus = "open" | "closed";
export type MessageDirection = "inbound" | "outbound";
export type MessageStatus = "sent" | "delivered" | "read" | "failed";

export interface Conversation {
  id: string;
  workspace_id: string;
  lead_id: string | null;
  phone_number: string;
  phone_number_id: string;
  status: ConversationStatus;
  assigned_to: string | null;
  ai_active: boolean;
  last_message_at: string | null;
  unread_count: number;
  needs_reply: boolean;
  last_message_content: string | null;
  last_message_direction: string | null;
  created_at: string;
  lead?: Lead;
  assignee?: Profile;
  last_message?: Message;
}

export interface Message {
  id: string;
  conversation_id: string;
  workspace_id: string;
  whatsapp_message_id: string | null;
  direction: MessageDirection;
  type: string;
  content: string | null;
  media_id: string | null;
  media_url: string | null;
  filename: string | null;
  status: MessageStatus;
  sender_id: string | null;
  created_at: string;
  sender?: Profile;
}
