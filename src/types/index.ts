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

export type LeadStatus =
  | "new"
  | "contact"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

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

export type ActivityType = "call" | "email" | "meeting" | "note";

export interface Activity {
  id: string;
  workspace_id: string;
  lead_id: string;
  type: ActivityType;
  description: string;
  author_id: string;
  activity_date: string;
  created_at: string;
  author?: Profile;
}

export type DealStage =
  | "new_lead"
  | "contact_made"
  | "proposal_sent"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

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

export interface Invite {
  id: string;
  workspace_id: string;
  email: string;
  role: "admin" | "member";
  token: string;
  expires_at: string;
  accepted_at: string | null;
}
