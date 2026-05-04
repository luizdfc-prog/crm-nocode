export interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  plan: "free" | "pro";
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

export interface Deal {
  id: string;
  workspace_id: string;
  title: string;
  value: number;
  stage: DealStage;
  lead_id: string | null;
  owner_id: string | null;
  due_date: string | null;
  position: number;
  created_at: string;
  lead?: Lead;
  owner?: Profile;
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
