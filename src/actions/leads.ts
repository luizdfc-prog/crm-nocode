"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient as createServerClient } from "@/lib/supabase/server"
import type { Lead, LeadStatus } from "@/types"

// ── Schemas ─────────────────────────────────────────────────────────────────

const LEAD_STATUSES = ["novo", "contato", "proposta", "negociacao", "ganho", "perdido"] as const

const createLeadSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  email: z.string().email("E-mail inválido").or(z.literal("")).optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  role: z.string().optional(),
  status: z.enum(LEAD_STATUSES).default("novo"),
  owner_id: z.string().uuid().optional().nullable(),
})

const updateLeadSchema = createLeadSchema.partial().extend({
  id: z.string().uuid(),
})

type CreateLeadInput = z.infer<typeof createLeadSchema>
type UpdateLeadInput = z.infer<typeof updateLeadSchema>

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getWorkspaceId(supabase: Awaited<ReturnType<typeof createServerClient>>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("profile_id", user.id)
    .limit(1)
    .single()

  return data?.workspace_id ?? null
}

// ── Actions ──────────────────────────────────────────────────────────────────

export async function getLeads(params?: {
  search?: string
  status?: LeadStatus | "all"
  owner_id?: string | "all"
}): Promise<Lead[]> {
  const supabase = await createServerClient()
  const workspaceId = await getWorkspaceId(supabase)
  if (!workspaceId) return []

  let query = supabase
    .from("leads")
    .select(`
      id, workspace_id, name, email, phone, company, role, status, owner_id, created_at,
      owner:profiles!leads_owner_id_fkey(id, name, email, avatar_url, created_at)
    `)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })

  if (params?.status && params.status !== "all") {
    query = query.eq("status", params.status)
  }

  if (params?.owner_id && params.owner_id !== "all") {
    query = query.eq("owner_id", params.owner_id)
  }

  if (params?.search) {
    // Escapa caracteres especiais do PostgREST antes de montar o filtro
    const safe = params.search.replace(/[%_\\]/g, "\\$&").trim()
    const q = `%${safe}%`
    query = query.or(`name.ilike.${q},company.ilike.${q},email.ilike.${q}`)
  }

  const { data, error } = await query
  if (error) {
    console.error("[getLeads]", error)
    return []
  }

  return (data ?? []) as unknown as Lead[]
}

export async function getLead(id: string): Promise<Lead | null> {
  const supabase = await createServerClient()
  const workspaceId = await getWorkspaceId(supabase)
  if (!workspaceId) return null

  const { data, error } = await supabase
    .from("leads")
    .select(`
      id, workspace_id, name, email, phone, company, role, status, owner_id, created_at,
      owner:profiles!leads_owner_id_fkey(id, name, email, avatar_url, created_at)
    `)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .single()

  if (error || !data) return null
  return data as unknown as Lead
}

export async function createLead(input: CreateLeadInput): Promise<ActionResult<Lead>> {
  const parsed = createLeadSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  const supabase = await createServerClient()
  const workspaceId = await getWorkspaceId(supabase)
  if (!workspaceId) return { success: false, error: "Não autenticado" }

  // Verificar limite plano Free (50 leads)
  const { count } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("plan")
    .eq("id", workspaceId)
    .single()

  if (workspace?.plan === "free" && (count ?? 0) >= 50) {
    return { success: false, error: "Limite de 50 leads atingido no plano Free. Faça upgrade para Pro." }
  }

  const { data, error } = await supabase
    .from("leads")
    .insert({
      workspace_id: workspaceId,
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      company: parsed.data.company || null,
      role: parsed.data.role || null,
      status: parsed.data.status,
      owner_id: parsed.data.owner_id || null,
    })
    .select(`
      id, workspace_id, name, email, phone, company, role, status, owner_id, created_at,
      owner:profiles!leads_owner_id_fkey(id, name, email, avatar_url, created_at)
    `)
    .single()

  if (error || !data) {
    return { success: false, error: error?.message ?? "Erro ao criar lead" }
  }

  revalidatePath("/leads")
  revalidatePath("/dashboard")
  return { success: true, data: data as unknown as Lead }
}

export async function updateLead(input: UpdateLeadInput): Promise<ActionResult<Lead>> {
  const parsed = updateLeadSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  const supabase = await createServerClient()
  const workspaceId = await getWorkspaceId(supabase)
  if (!workspaceId) return { success: false, error: "Não autenticado" }

  const { id, ...fields } = parsed.data

  const { data, error } = await supabase
    .from("leads")
    .update({
      ...(fields.name !== undefined && { name: fields.name }),
      ...(fields.email !== undefined && { email: fields.email || null }),
      ...(fields.phone !== undefined && { phone: fields.phone || null }),
      ...(fields.company !== undefined && { company: fields.company || null }),
      ...(fields.role !== undefined && { role: fields.role || null }),
      ...(fields.status !== undefined && { status: fields.status }),
      ...(fields.owner_id !== undefined && { owner_id: fields.owner_id || null }),
    })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select(`
      id, workspace_id, name, email, phone, company, role, status, owner_id, created_at,
      owner:profiles!leads_owner_id_fkey(id, name, email, avatar_url, created_at)
    `)
    .single()

  if (error || !data) {
    return { success: false, error: error?.message ?? "Erro ao atualizar lead" }
  }

  revalidatePath("/leads")
  revalidatePath(`/leads/${id}`)
  revalidatePath("/dashboard")
  return { success: true, data: data as unknown as Lead }
}

export async function deleteLead(id: string): Promise<ActionResult> {
  const supabase = await createServerClient()
  const workspaceId = await getWorkspaceId(supabase)
  if (!workspaceId) return { success: false, error: "Não autenticado" }

  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId)

  if (error) return { success: false, error: error.message }

  revalidatePath("/leads")
  revalidatePath("/dashboard")
  return { success: true, data: undefined }
}

export async function getWorkspaceMembers() {
  const supabase = await createServerClient()
  const workspaceId = await getWorkspaceId(supabase)
  if (!workspaceId) return []

  const { data } = await supabase
    .from("workspace_members")
    .select("profile_id, profiles(id, name, email, avatar_url, created_at)")
    .eq("workspace_id", workspaceId)

  type MemberWithProfile = { profiles: { id: string; name: string; email: string; avatar_url: string | null; created_at: string } | null }
  return (data ?? []).map((m: MemberWithProfile) => m.profiles).filter(Boolean) as {
    id: string; name: string; email: string; avatar_url: string | null; created_at: string
  }[]
}
