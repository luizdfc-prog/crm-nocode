"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient as createServerClient } from "@/lib/supabase/server"
import type { Activity, Lead, Profile } from "@/types"

export interface ScheduledActivity extends Activity {
  lead: Pick<Lead, "id" | "name" | "company" | "phone" | "status"> & { owner?: Pick<Profile, "id" | "name"> | null }
}

const ACTIVITY_TYPES = ["ligacao", "email", "reuniao", "nota"] as const

const createActivitySchema = z.object({
  lead_id: z.string().uuid(),
  type: z.enum(ACTIVITY_TYPES),
  description: z.string().min(5, "Descrição deve ter ao menos 5 caracteres"),
  activity_date: z.string().min(1, "Data obrigatória"),
})

type CreateActivityInput = z.infer<typeof createActivitySchema>

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

async function getWorkspaceAndUser(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("profile_id", user.id)
    .limit(1)
    .single()

  if (!data) return null
  return { userId: user.id, workspaceId: data.workspace_id }
}

export async function getActivitiesForLead(leadId: string): Promise<Activity[]> {
  const supabase = await createServerClient()
  const ctx = await getWorkspaceAndUser(supabase)
  if (!ctx) return []

  const { data, error } = await supabase
    .from("activities")
    .select(`
      id, workspace_id, lead_id, type, description, author_id, activity_date, created_at,
      author:profiles!activities_author_id_fkey(id, name, email, avatar_url, created_at)
    `)
    .eq("lead_id", leadId)
    .eq("workspace_id", ctx.workspaceId)
    .order("activity_date", { ascending: false })

  if (error) {
    console.error("[getActivitiesForLead]", error)
    return []
  }

  return (data ?? []) as unknown as Activity[]
}

export async function createActivity(input: CreateActivityInput): Promise<ActionResult<Activity>> {
  const parsed = createActivitySchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  const supabase = await createServerClient()
  const ctx = await getWorkspaceAndUser(supabase)
  if (!ctx) return { success: false, error: "Não autenticado" }

  const { data, error } = await supabase
    .from("activities")
    .insert({
      workspace_id: ctx.workspaceId,
      lead_id: parsed.data.lead_id,
      type: parsed.data.type,
      description: parsed.data.description,
      activity_date: parsed.data.activity_date,
      author_id: ctx.userId,
    })
    .select(`
      id, workspace_id, lead_id, type, description, author_id, activity_date, created_at,
      author:profiles!activities_author_id_fkey(id, name, email, avatar_url, created_at)
    `)
    .single()

  if (error || !data) {
    return { success: false, error: error?.message ?? "Erro ao registrar atividade" }
  }

  revalidatePath(`/leads/${parsed.data.lead_id}`)
  revalidatePath("/dashboard")
  return { success: true, data: data as unknown as Activity }
}

export async function deleteActivity(id: string, leadId: string): Promise<ActionResult> {
  const supabase = await createServerClient()
  const ctx = await getWorkspaceAndUser(supabase)
  if (!ctx) return { success: false, error: "Não autenticado" }

  const { error } = await supabase
    .from("activities")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspaceId)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/leads/${leadId}`)
  revalidatePath("/dashboard")
  return { success: true, data: undefined }
}

export async function getScheduledActivities(): Promise<ScheduledActivity[]> {
  const supabase = await createServerClient()
  const ctx = await getWorkspaceAndUser(supabase)
  if (!ctx) return []

  // Atividades de hoje em diante (futuras agendadas)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from("activities")
    .select(`
      id, workspace_id, lead_id, type, description, author_id, activity_date, created_at,
      author:profiles!activities_author_id_fkey(id, name, email, avatar_url, created_at),
      lead:leads!activities_lead_id_fkey(
        id, name, company, phone, status,
        owner:profiles!leads_owner_id_fkey(id, name)
      )
    `)
    .eq("workspace_id", ctx.workspaceId)
    .gte("activity_date", todayStart.toISOString())
    .order("activity_date", { ascending: true })
    .limit(200)

  if (error) {
    console.error("[getScheduledActivities]", error)
    return []
  }

  return (data ?? []) as unknown as ScheduledActivity[]
}

export async function getRecentActivities(limit = 6): Promise<Activity[]> {
  const supabase = await createServerClient()
  const ctx = await getWorkspaceAndUser(supabase)
  if (!ctx) return []

  const { data } = await supabase
    .from("activities")
    .select(`
      id, workspace_id, lead_id, type, description, author_id, activity_date, created_at,
      author:profiles!activities_author_id_fkey(id, name, email, avatar_url, created_at)
    `)
    .eq("workspace_id", ctx.workspaceId)
    .order("activity_date", { ascending: false })
    .limit(limit)

  return (data ?? []) as unknown as Activity[]
}
