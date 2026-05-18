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

export type WorkspacePlan = 'essencial' | 'catalogo' | 'pro_ia' | 'scale_ia'
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
          seats:                  number
          stripe_customer_id:     string | null
          stripe_subscription_id: string | null
          stripe_addon_item_id:   string | null
          agent_config:           import("@/types").AgentConfig
          created_at:             string
        }
        Insert: {
          id?:                     string
          name:                    string
          plan?:                   WorkspacePlan
          seats?:                  number
          stripe_customer_id?:     string | null
          stripe_subscription_id?: string | null
          stripe_addon_item_id?:   string | null
          agent_config?:           import("@/types").AgentConfig
          created_at?:             string
        }
        Update: {
          name?:                   string
          plan?:                   WorkspacePlan
          seats?:                  number
          stripe_customer_id?:     string | null
          stripe_subscription_id?: string | null
          stripe_addon_item_id?:   string | null
          agent_config?:           import("@/types").AgentConfig
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

      pipelines: {
        Row: {
          id:           string
          workspace_id: string
          name:         string
          type:         'sales' | 'agent' | 'custom'
          position:     number
          created_at:   string
        }
        Insert: {
          id?:          string
          workspace_id: string
          name:         string
          type?:        'sales' | 'agent' | 'custom'
          position?:    number
          created_at?:  string
        }
        Update: {
          name?:     string
          type?:     'sales' | 'agent' | 'custom'
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "pipelines_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }

      pipeline_stages: {
        Row: {
          id:          string
          pipeline_id: string
          name:        string
          color:       string
          position:    number
          created_at:  string
        }
        Insert: {
          id?:         string
          pipeline_id: string
          name:        string
          color?:      string
          position?:   number
          created_at?: string
        }
        Update: {
          name?:     string
          color?:    string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
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
          pipeline_id:  string | null
          stage_id:     string | null
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
          pipeline_id?: string | null
          stage_id?:    string | null
          lead_id?:     string | null
          owner_id?:    string | null
          due_date?:    string | null
          position?:    number
          created_at?:  string
        }
        Update: {
          title?:       string
          value?:       number
          stage?:       DealStage
          pipeline_id?: string | null
          stage_id?:    string | null
          lead_id?:     string | null
          owner_id?:    string | null
          due_date?:    string | null
          position?:    number
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

      workspace_invites: {
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
            foreignKeyName: "workspace_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }

      conversations: {
        Row: {
          id:                    string
          workspace_id:          string
          lead_id:               string | null
          phone_number:          string
          phone_number_id:       string
          status:                'open' | 'closed'
          assigned_to:           string | null
          ai_active:             boolean
          last_message_at:       string | null
          last_message_content:  string | null
          last_message_direction: 'inbound' | 'outbound' | null
          unread_count:          number
          needs_reply:           boolean
          created_at:            string
        }
        Insert: {
          id?:                    string
          workspace_id:           string
          lead_id?:               string | null
          phone_number:           string
          phone_number_id:        string
          status?:                'open' | 'closed'
          assigned_to?:           string | null
          ai_active?:             boolean
          last_message_at?:       string | null
          last_message_content?:  string | null
          last_message_direction?: 'inbound' | 'outbound' | null
          unread_count?:          number
          needs_reply?:           boolean
          created_at?:            string
        }
        Update: {
          lead_id?:               string | null
          status?:                'open' | 'closed'
          assigned_to?:           string | null
          ai_active?:             boolean
          last_message_at?:       string | null
          last_message_content?:  string | null
          last_message_direction?: 'inbound' | 'outbound' | null
          unread_count?:          number
          needs_reply?:           boolean
        }
        Relationships: []
      }

      messages: {
        Row: {
          id:                  string
          conversation_id:     string
          workspace_id:        string
          whatsapp_message_id: string | null
          direction:           'inbound' | 'outbound'
          type:                string
          content:             string | null
          status:              'sent' | 'delivered' | 'read' | 'failed'
          sender_id:           string | null
          media_id:            string | null
          media_url:           string | null
          filename:            string | null
          created_at:          string
        }
        Insert: {
          id?:                  string
          conversation_id:      string
          workspace_id:         string
          whatsapp_message_id?: string | null
          direction:            'inbound' | 'outbound'
          type?:                string
          content?:             string | null
          status?:              'sent' | 'delivered' | 'read' | 'failed'
          sender_id?:           string | null
          media_id?:            string | null
          media_url?:           string | null
          filename?:            string | null
          created_at?:          string
        }
        Update: {
          status?:    'sent' | 'delivered' | 'read' | 'failed'
          content?:   string | null
          media_url?: string | null
        }
        Relationships: []
      }

      lead_field_definitions: {
        Row: {
          id:           string
          workspace_id: string
          name:         string
          field_key:    string
          field_type:   'text' | 'number' | 'date' | 'select' | 'multiselect'
          options:      string[]
          position:     number
          required_for: { pipeline_id: string; stage_id: string }[]
          created_at:   string
        }
        Insert: {
          id?:           string
          workspace_id:  string
          name:          string
          field_key:     string
          field_type:    'text' | 'number' | 'date' | 'select' | 'multiselect'
          options?:      string[]
          position?:     number
          required_for?: { pipeline_id: string; stage_id: string }[]
          created_at?:   string
        }
        Update: {
          name?:         string
          options?:      string[]
          position?:     number
          required_for?: { pipeline_id: string; stage_id: string }[]
        }
        Relationships: []
      }

      lead_field_values: {
        Row: {
          id:           string
          workspace_id: string
          lead_id:      string
          field_id:     string
          value:        string | null
          created_at:   string
        }
        Insert: {
          id?:          string
          workspace_id: string
          lead_id:      string
          field_id:     string
          value?:       string | null
          created_at?:  string
        }
        Update: {
          value?: string | null
        }
        Relationships: []
      }

      usage_logs: {
        Row: {
          id:                string
          workspace_id:      string
          event_type:        string
          input_tokens:      number | null
          output_tokens:     number | null
          audio_seconds:     number | null
          message_direction: string | null
          cost_usd:          number | null
          created_at:        string
        }
        Insert: {
          id?:                string
          workspace_id:       string
          event_type:         string
          input_tokens?:      number | null
          output_tokens?:     number | null
          audio_seconds?:     number | null
          message_direction?: string | null
          cost_usd?:          number | null
          created_at?:        string
        }
        Update: {
          cost_usd?: number | null
        }
        Relationships: []
      }

      member_permissions: {
        Row: {
          id:            string
          workspace_id:  string
          profile_id:    string
          leads_create:  boolean
          leads_view:    string
          leads_edit:    string
          leads_delete:  boolean
          convs_view:    string
          convs_delete:  boolean
          deals_create:  boolean
          deals_view:    string
          deals_edit:    string
          deals_delete:  boolean
          created_at:    string
        }
        Insert: {
          id?:            string
          workspace_id:   string
          profile_id:     string
          leads_create?:  boolean
          leads_view?:    string
          leads_edit?:    string
          leads_delete?:  boolean
          convs_view?:    string
          convs_delete?:  boolean
          deals_create?:  boolean
          deals_view?:    string
          deals_edit?:    string
          deals_delete?:  boolean
          created_at?:    string
        }
        Update: {
          leads_create?:  boolean
          leads_view?:    string
          leads_edit?:    string
          leads_delete?:  boolean
          convs_view?:    string
          convs_delete?:  boolean
          deals_create?:  boolean
          deals_view?:    string
          deals_edit?:    string
          deals_delete?:  boolean
        }
        Relationships: []
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
      is_workspace_admin: {
        Args:    { p_workspace_id: string }
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
export type WorkspaceInviteRow  = Tables<'workspace_invites'>
export type PipelineRow         = Tables<'pipelines'>
export type PipelineStageRow    = Tables<'pipeline_stages'>
