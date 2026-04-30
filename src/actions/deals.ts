"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient as createServerClient } from "@/lib/supabase/server"
import type { Deal, DealStage } from "@/types"

const DEAL_STAGES = [
  "novo_lead",
  "contato_realizado",
  "proposta_enviada",
  "negociacao",
  "fechado_ganho",
  "fechado_perdido",
] as const

const createDealSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  value: z.coerce.number().min(0, "Valor deve ser positivo").default(0),
  stage: z.enum(DEAL_STAGES).default("novo_lead"),
  lead_id: z.string().uuid().nullable().optional(),
  owner_id: z.string().uuid().nullable().optional(),
  due_date: z.string().nullable().optional(),
})

const updateDealSchema = createDealSchema.partial().extend({
  id: z.string().uuid(),
})

const moveDealSchema = z.object({
  id: z.string().uuid(),
  stage: z.enum(DEAL_STAGES),
  position: z.number().int().min(0),
})

type CreateDealInput = z.infer<typeof createDealSchema>
type UpdateDealInput = z.infer<typeof updateDealSchema>
type MoveDealInput = z.infer<typeof moveDealSchema>

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

const DEAL_SELECT = `
  id, workspace_id, title, value, stage, lead_id, owner_id, due_date, position, created_at,
  lead:leads!deals_lead_id_fkey(
    id, workspace_id, name, email, phone, company, role, status, owner_id, created_at
  ),
  owner:profiles!deals_owner_id_fkey(id, name, email, avatar_url, created_at)
`

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

export async function getDeals(): Promise<Deal[]> {
  const supabase = await createServerClient()
  const ctx = await getWorkspaceAndUser(supabase)
  if (!ctx) return []

  const { data, error } = await supabase
    .from("deals")
    .select(DEAL_SELECT)
    .eq("workspace_id", ctx.workspaceId)
    .order("position", { ascending: true })

  if (error) {
    console.error("[getDeals]", error)
    return []
  }

  return (data ?? []) as unknown as Deal[]
}

export async function getDealsByStage(stage: DealStage): Promise<Deal[]> {
  const supabase = await createServerClient()
  const ctx = await getWorkspaceAndUser(supabase)
  if (!ctx) return []

  const { data } = await supabase
    .from("deals")
    .select(DEAL_SELECT)
    .eq("workspace_id", ctx.workspaceId)
    .eq("stage", stage)
    .order("position", { ascending: true })

  return (data ?? []) as unknown as Deal[]
}

export async function createDeal(input: CreateDealInput): Promise<ActionResult<Deal>> {
  const parsed = createDealSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  const supabase = await createServerClient()
  const ctx = await getWorkspaceAndUser(supabase)
  if (!ctx) return { success: false, error: "Não autenticado" }

  // Calcular posição como último da coluna
  const { count } = await supabase
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", ctx.workspaceId)
    .eq("stage", parsed.data.stage)

  const position = count ?? 0

  const { data, error } = await supabase
    .from("deals")
    .insert({
      workspace_id: ctx.workspaceId,
      title: parsed.data.title,
      value: parsed.data.value,
      stage: parsed.data.stage,
      lead_id: parsed.data.lead_id ?? null,
      owner_id: parsed.data.owner_id ?? null,
      due_date: parsed.data.due_date
        ? `${parsed.data.due_date}T00:00:00Z`
        : null,
      position,
    })
    .select(DEAL_SELECT)
    .single()

  if (error || !data) {
    return { success: false, error: error?.message ?? "Erro ao criar negócio" }
  }

  revalidatePath("/pipeline")
  revalidatePath("/dashboard")
  return { success: true, data: data as unknown as Deal }
}

export async function updateDeal(input: UpdateDealInput): Promise<ActionResult<Deal>> {
  const parsed = updateDealSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  const supabase = await createServerClient()
  const ctx = await getWorkspaceAndUser(supabase)
  if (!ctx) return { success: false, error: "Não autenticado" }

  const { id, ...fields } = parsed.data

  const { data, error } = await supabase
    .from("deals")
    .update({
      ...(fields.title !== undefined && { title: fields.title }),
      ...(fields.value !== undefined && { value: fields.value }),
      ...(fields.stage !== undefined && { stage: fields.stage }),
      ...(fields.lead_id !== undefined && { lead_id: fields.lead_id ?? null }),
      ...(fields.owner_id !== undefined && { owner_id: fields.owner_id ?? null }),
      ...(fields.due_date !== undefined && {
        due_date: fields.due_date ? `${fields.due_date}T00:00:00Z` : null,
      }),
    })
    .eq("id", id)
    .eq("workspace_id", ctx.workspaceId)
    .select(DEAL_SELECT)
    .single()

  if (error || !data) {
    return { success: false, error: error?.message ?? "Erro ao atualizar negócio" }
  }

  revalidatePath("/pipeline")
  revalidatePath("/dashboard")
  return { success: true, data: data as unknown as Deal }
}

export async function moveDeal(input: MoveDealInput): Promise<ActionResult> {
  const parsed = moveDealSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: "Dados inválidos" }
  }

  const supabase = await createServerClient()
  const ctx = await getWorkspaceAndUser(supabase)
  if (!ctx) return { success: false, error: "Não autenticado" }

  const { error } = await supabase
    .from("deals")
    .update({ stage: parsed.data.stage, position: parsed.data.position })
    .eq("id", parsed.data.id)
    .eq("workspace_id", ctx.workspaceId)

  if (error) return { success: false, error: error.message }

  revalidatePath("/pipeline")
  revalidatePath("/dashboard")
  return { success: true, data: undefined }
}

export async function reorderDeals(
  updates: { id: string; position: number; stage: DealStage }[]
): Promise<ActionResult> {
  const supabase = await createServerClient()
  const ctx = await getWorkspaceAndUser(supabase)
  if (!ctx) return { success: false, error: "Não autenticado" }

  const promises = updates.map(({ id, position, stage }) =>
    supabase
      .from("deals")
      .update({ position, stage })
      .eq("id", id)
      .eq("workspace_id", ctx.workspaceId)
  )

  const results = await Promise.all(promises)
  const failed = results.find((r: { error: { message: string } | null }) => r.error)
  if (failed?.error) return { success: false, error: (failed.error as { message: string }).message }

  revalidatePath("/pipeline")
  return { success: true, data: undefined }
}

export async function deleteDeal(id: string): Promise<ActionResult> {
  const supabase = await createServerClient()
  const ctx = await getWorkspaceAndUser(supabase)
  if (!ctx) return { success: false, error: "Não autenticado" }

  const { error } = await supabase
    .from("deals")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspaceId)

  if (error) return { success: false, error: error.message }

  revalidatePath("/pipeline")
  revalidatePath("/dashboard")
  return { success: true, data: undefined }
}

type LeadRow = { id: string; status: string; created_at: string }
type DealRow = {
  id: string; stage: string; value: number | null; due_date: string | null
  lead_id: string | null; owner_id: string | null; title: string
  position: number; workspace_id: string; created_at: string
}

export async function getDashboardMetrics() {
  const supabase = await createServerClient()
  const ctx = await getWorkspaceAndUser(supabase)
  if (!ctx) return null

  const [leadsResult, dealsResult] = await Promise.all([
    supabase
      .from("leads")
      .select("id, status, created_at")
      .eq("workspace_id", ctx.workspaceId),
    supabase
      .from("deals")
      .select("id, stage, value, due_date, lead_id, owner_id, title, position, workspace_id, created_at")
      .eq("workspace_id", ctx.workspaceId)
      .order("position", { ascending: true }),
  ])

  const leads = (leadsResult.data ?? []) as LeadRow[]
  const deals = (dealsResult.data ?? []) as DealRow[]

  const ACTIVE_STAGES: DealStage[] = ["novo_lead", "contato_realizado", "proposta_enviada", "negociacao"]
  const openDeals = deals.filter((d) => ACTIVE_STAGES.includes(d.stage as DealStage))
  const closedDeals = deals.filter((d) => d.stage === "fechado_ganho" || d.stage === "fechado_perdido")
  const wonDeals = deals.filter((d) => d.stage === "fechado_ganho")

  const pipelineValue = openDeals.reduce((sum: number, d: DealRow) => sum + (d.value ?? 0), 0)
  const wonValue = wonDeals.reduce((sum: number, d: DealRow) => sum + (d.value ?? 0), 0)
  const conversionRate = closedDeals.length > 0
    ? Math.round((wonDeals.length / closedDeals.length) * 100)
    : 0

  const FUNNEL_STAGES: { key: DealStage; label: string }[] = [
    { key: "novo_lead", label: "Novo Lead" },
    { key: "contato_realizado", label: "Contato Realizado" },
    { key: "proposta_enviada", label: "Proposta Enviada" },
    { key: "negociacao", label: "Negociação" },
    { key: "fechado_ganho", label: "Fechado Ganho" },
  ]

  const funnelData = FUNNEL_STAGES.map(({ key, label }) => {
    const stageDeals = deals.filter((d: DealRow) => d.stage === key)
    return {
      stage: label,
      count: stageDeals.length,
      value: stageDeals.reduce((sum: number, d: DealRow) => sum + (d.value ?? 0), 0),
    }
  })

  const now = new Date().setHours(0, 0, 0, 0)
  const in30Days = now + 30 * 86_400_000
  const upcomingDeals = deals
    .filter((d: DealRow) => {
      if (!d.due_date) return false
      if (!ACTIVE_STAGES.includes(d.stage as DealStage)) return false
      const due = new Date(d.due_date).setHours(0, 0, 0, 0)
      return due <= in30Days
    })
    .sort((a: DealRow, b: DealRow) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const newLeadsThisWeek = leads.filter(
    (l: LeadRow) => new Date(l.created_at) >= sevenDaysAgo
  ).length

  return {
    totalLeads: leads.length,
    newLeadsThisWeek,
    openDealsCount: openDeals.length,
    pipelineValue,
    wonValue,
    conversionRate,
    wonDealsCount: wonDeals.length,
    closedDealsCount: closedDeals.length,
    funnelData,
    upcomingDeals: upcomingDeals as unknown as Deal[],
  }
}
