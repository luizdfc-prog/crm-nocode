// Gerado manualmente a partir de supabase/migrations/000_full_schema.sql
// Substituir por: npx supabase gen types typescript --project-id sjaibytzqpxbvkvxwhoh > src/types/supabase.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ── Enums ────────────────────────────────────────────────────

export type WorkspacePlan = 'free' | 'pro'
export type MemberRole    = 'admin' | 'member'
export type LeadStatus    = 'novo' | 'contato' | 'proposta' | 'negociacao' | 'ganho' | 'perdido'
export type ActivityType  = 'ligacao' | 'email' | 'reuniao' | 'nota'
export type DealStage     =
  | 'novo_lead'
  | 'contato_realizado'
  | 'proposta_enviada'
  | 'negociacao'
  | 'fechado_ganho'
  | 'fechado_perdido'

// ── Database schema ──────────────────────────────────────────

export interface Database {
  PostgrestVersion: "12"
  public: {
    Tables: {
      profiles: {
        Row: {
          id:         string
          name:       string
          email:      string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id:          string
          name?:       string
          email?:      string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          name?:       string
          email?:      string
          avatar_url?: string | null
        }
        Relationships: []
      }

      workspaces: {
        Row: {
          id:                     string
          name:                   string
          plan:                   WorkspacePlan
          stripe_customer_id:     string | null
          stripe_subscription_id: string | null
          created_at:             string
        }
        Insert: {
          id?:                     string
          name:                    string
          plan?:                   WorkspacePlan
          stripe_customer_id?:     string | null
          stripe_subscription_id?: string | null
          created_at?:             string
        }
        Update: {
          name?:                   string
          plan?:                   WorkspacePlan
          stripe_customer_id?:     string | null
          stripe_subscription_id?: string | null
        }
        Relationships: []
      }

      workspace_members: {
        Row: {
          id:           string
          workspace_id: string
          profile_id:   string
          role:         MemberRole
          created_at:   string
        }
        Insert: {
          id?:           string
          workspace_id:  string
          profile_id:    string
          role?:         MemberRole
          created_at?:   string
        }
        Update: {
          role?: MemberRole
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }

      leads: {
        Row: {
          id:           string
          workspace_id: string
          name:         string
          email:        string | null
          phone:        string | null
          company:      string | null
          role:         string | null
          status:       LeadStatus
          owner_id:     string | null
          created_at:   string
        }
        Insert: {
          id?:          string
          workspace_id: string
          name:         string
          email?:       string | null
          phone?:       string | null
          company?:     string | null
          role?:        string | null
          status?:      LeadStatus
          owner_id?:    string | null
          created_at?:  string
        }
        Update: {
          name?:      string
          email?:     string | null
          phone?:     string | null
          company?:   string | null
          role?:      string | null
          status?:    LeadStatus
          owner_id?:  string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }

      activities: {
        Row: {
          id:            string
          workspace_id:  string
          lead_id:       string
          type:          ActivityType
          description:   string
          author_id:     string | null
          activity_date: string
          created_at:    string
        }
        Insert: {
          id?:            string
          workspace_id:   string
          lead_id:        string
          type:           ActivityType
          description:    string
          author_id?:     string | null
          activity_date?: string
          created_at?:    string
        }
        Update: {
          type?:          ActivityType
          description?:   string
          activity_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          }
        ]
      }

      deals: {
        Row: {
          id:           string
          workspace_id: string
          title:        string
          value:        number
          stage:        DealStage
          lead_id:      string | null
          owner_id:     string | null
          due_date:     string | null
          position:     number
          created_at:   string
        }
        Insert: {
          id?:          string
          workspace_id: string
          title:        string
          value?:       number
          stage?:       DealStage
          lead_id?:     string | null
          owner_id?:    string | null
          due_date?:    string | null
          position?:    number
          created_at?:  string
        }
        Update: {
          title?:    string
          value?:    number
          stage?:    DealStage
          lead_id?:  string | null
          owner_id?: string | null
          due_date?: string | null
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "deals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }

      invites: {
        Row: {
          id:           string
          workspace_id: string
          email:        string
          role:         MemberRole
          token:        string
          expires_at:   string
          accepted_at:  string | null
          created_at:   string
        }
        Insert: {
          id?:           string
          workspace_id:  string
          email:         string
          role?:         MemberRole
          token?:        string
          expires_at?:   string
          accepted_at?:  string | null
          created_at?:   string
        }
        Update: {
          accepted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
    }

    Views: {
      [_ in never]: never
    }

    Functions: {
      is_workspace_member: {
        Args:    { ws_id: string }
        Returns: boolean
      }
      current_user_workspace_ids: {
        Args:    Record<string, never>
        Returns: string[]
      }
    }

    Enums: {
      workspace_plan: WorkspacePlan
      member_role:    MemberRole
      lead_status:    LeadStatus
      activity_type:  ActivityType
      deal_stage:     DealStage
    }
  }
}

// ── Helpers de tipo (Row aliases) ────────────────────────────

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type ProfileRow          = Tables<'profiles'>
export type WorkspaceRow        = Tables<'workspaces'>
export type WorkspaceMemberRow  = Tables<'workspace_members'>
export type LeadRow             = Tables<'leads'>
export type ActivityRow         = Tables<'activities'>
export type DealRow             = Tables<'deals'>
export type InviteRow           = Tables<'invites'>
