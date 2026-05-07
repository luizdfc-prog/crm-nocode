"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient as createServerClient } from "@/lib/supabase/server"
import type { Deal, DealStage } from "@/types"
import { getMyPermissions } from "./permissions"

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
  // stage (enum legado) — opcional, usado quando não há pipeline_id/stage_id
  stage: z.enum(DEAL_STAGES).default("novo_lead"),
  // novos campos para multi-pipeline
  pipeline_id: z.string().uuid().nullable().optional(),
  stage_id: z.string().uuid().nullable().optional(),
  lead_id: z.string().uuid().nullable().optional(),
  owner_id: z.string().uuid().nullable().optional(),
  due_date: z.string().nullable().optional(),
})

const updateDealSchema = createDealSchema.partial().extend({
  id: z.string().uuid(),
})

const moveDealSchema = z.object({
  id: z.string().uuid(),
  // Suporte legado via enum + novo via stage_id/pipeline_id
  stage: z.enum(DEAL_STAGES).optional(),
  stage_id: z.string().uuid().nullable().optional(),
  pipeline_id: z.string().uuid().nullable().optional(),
  position: z.number().int().min(0),
})

type CreateDealInput = z.infer<typeof createDealSchema>
type UpdateDealInput = z.infer<typeof updateDealSchema>
type MoveDealInput = z.infer<typeof moveDealSchema>

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

// Seleciona os campos do deal incluindo pipeline_stage para cores dinâmicas
const DEAL_SELECT = `
  id, workspace_id, title, value, stage, pipeline_id, stage_id, lead_id, owner_id, due_date, position, created_at,
  lead:leads!deals_lead_id_fkey(
    id, workspace_id, name, email, phone, company, role, status, owner_id, created_at
  ),
  owner:profiles!deals_owner_id_fkey(id, name, email, avatar_url, created_at),
  pipeline_stage:pipeline_stages!deals_stage_id_fkey(id, pipeline_id, name, color, position, created_at)
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

/**
 * Retorna todos os deals do workspace. Se pipeline_id for fornecido, filtra por ele.
 */
export async function getDeals(pipeline_id?: string): Promise<Deal[]> {
  const supabase = await createServerClient()
  const ctx = await getWorkspaceAndUser(supabase)
  if (!ctx) return []

  const perms = await getMyPermissions()
  if (perms?.deals_view === "none") return []

  let query = supabase
    .from("deals")
    .select(DEAL_SELECT)
    .eq("workspace_id", ctx.workspaceId)
    .order("position", { ascending: true })

  if (perms?.deals_view === "own") {
    query = query.eq("owner_id", ctx.userId)
  }

  if (pipeline_id) {
    query = query.eq("pipeline_id", pipeline_id)
  }

  const { data, error } = await query

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

/**
 * Cria um deal. Aceita pipeline_id + stage_id (multi-pipeline) ou stage (legado).
 * Se pipeline_id não for informado, tenta usar o primeiro pipeline do workspace.
 */
export async function createDeal(input: CreateDealInput): Promise<ActionResult<Deal>> {
  const parsed = createDealSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  const supabase = await createServerClient()
  const ctx = await getWorkspaceAndUser(supabase)
  if (!ctx) return { success: false, error: "Não autenticado" }

  const perms = await getMyPermissions()
  if (perms && !perms.deals_create) return { success: false, error: "Sem permissão para criar negócios" }

  // Resolver pipeline e stage_id quando não informados
  let resolvedPipelineId = parsed.data.pipeline_id ?? null
  let resolvedStageId = parsed.data.stage_id ?? null

  if (!resolvedPipelineId) {
    // Usar primeiro pipeline disponível
    const { data: firstPipeline } = await supabase
      .from("pipelines")
      .select("id")
      .eq("workspace_id", ctx.workspaceId)
      .order("position", { ascending: true })
      .limit(1)
      .single()

    if (firstPipeline) {
      resolvedPipelineId = firstPipeline.id
    }
  }

  if (resolvedPipelineId && !resolvedStageId) {
    // Usar primeira stage do pipeline
    const { data: firstStage } = await supabase
      .from("pipeline_stages")
      .select("id")
      .eq("pipeline_id", resolvedPipelineId)
      .order("position", { ascending: true })
      .limit(1)
      .single()

    if (firstStage) {
      resolvedStageId = firstStage.id
    }
  }

  // Calcular posição: prioriza stage_id (novo), cai para stage (legado)
  let positionQuery = supabase
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", ctx.workspaceId)

  if (resolvedStageId) {
    positionQuery = positionQuery.eq("stage_id", resolvedStageId)
  } else {
    positionQuery = positionQuery.eq("stage", parsed.data.stage)
  }

  const { count } = await positionQuery
  const position = count ?? 0

  const { data, error } = await supabase
    .from("deals")
    .insert({
      workspace_id: ctx.workspaceId,
      title: parsed.data.title,
      value: parsed.data.value,
      stage: parsed.data.stage,
      pipeline_id: resolvedPipelineId,
      stage_id: resolvedStageId,
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
      ...(fields.pipeline_id !== undefined && { pipeline_id: fields.pipeline_id ?? null }),
      ...(fields.stage_id !== undefined && { stage_id: fields.stage_id ?? null }),
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

/**
 * Move deal para uma stage (enum legado ou stage_id novo).
 */
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
    .update({
      ...(parsed.data.stage !== undefined && { stage: parsed.data.stage }),
      ...(parsed.data.stage_id !== undefined && { stage_id: parsed.data.stage_id ?? null }),
      ...(parsed.data.pipeline_id !== undefined && { pipeline_id: parsed.data.pipeline_id ?? null }),
      position: parsed.data.position,
    })
    .eq("id", parsed.data.id)
    .eq("workspace_id", ctx.workspaceId)

  if (error) return { success: false, error: error.message }

  revalidatePath("/pipeline")
  revalidatePath("/dashboard")
  return { success: true, data: undefined }
}

/**
 * Reordena deals em batch. Suporta stage_id (novo) e stage (legado).
 */
export async function reorderDeals(
  updates: { id: string; position: number; stage: DealStage; stage_id?: string | null }[]
): Promise<ActionResult> {
  if (updates.length === 0) return { success: true, data: undefined }

  const supabase = await createServerClient()
  const ctx = await getWorkspaceAndUser(supabase)
  if (!ctx) return { success: false, error: "Não autenticado" }

  const results = await Promise.all(
    updates.map(({ id, position, stage, stage_id }) =>
      supabase
        .from("deals")
        .update({
          position,
          stage,
          ...(stage_id !== undefined && { stage_id: stage_id ?? null }),
        })
        .eq("id", id)
        .eq("workspace_id", ctx.workspaceId)
    )
  )

  const failed = results.find((r) => r.error)
  if (failed?.error) return { success: false, error: failed.error.message }

  revalidatePath("/pipeline")
  revalidatePath("/dashboard")
  return { success: true, data: undefined }
}

export async function deleteDeal(id: string): Promise<ActionResult> {
  const supabase = await createServerClient()
  const ctx = await getWorkspaceAndUser(supabase)
  if (!ctx) return { success: false, error: "Não autenticado" }

  const perms = await getMyPermissions()
  if (perms && !perms.deals_delete) return { success: false, error: "Sem permissão para excluir negócios" }

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

export interface DashboardFilters {
  pipelineId?: string
  stageId?: string
  dealStage?: string
  dateFrom?: string
  dateTo?: string
}

export async function getDashboardMetrics(filters?: DashboardFilters) {
  const supabase = await createServerClient()
  const ctx = await getWorkspaceAndUser(supabase)
  if (!ctx) return null

  // Busca deals com filtros aplicados
  let dealsQuery = supabase
    .from("deals")
    .select("id, stage, value, due_date, lead_id, owner_id, title, position, workspace_id, created_at, stage_id, pipeline_id")
    .eq("workspace_id", ctx.workspaceId)
    .order("position", { ascending: true })

  if (filters?.pipelineId) dealsQuery = dealsQuery.eq("pipeline_id", filters.pipelineId)
  if (filters?.stageId) dealsQuery = dealsQuery.eq("stage_id", filters.stageId)
  if (filters?.dealStage) dealsQuery = dealsQuery.eq("stage", filters.dealStage as DealStage)
  if (filters?.dateFrom) dealsQuery = dealsQuery.gte("created_at", filters.dateFrom)
  if (filters?.dateTo) dealsQuery = dealsQuery.lte("created_at", filters.dateTo)

  const dealsResult = await dealsQuery
  const deals = (dealsResult.data ?? []) as DealRow[]

  // Leads: quando há filtro de pipeline/etapa, usa lead_ids dos deals filtrados
  // Quando só há filtro de data, aplica direto nos leads
  let leads: LeadRow[] = []
  const hasPipelineFilter = filters?.pipelineId || filters?.stageId || filters?.dealStage

  if (hasPipelineFilter) {
    const leadIds = [...new Set(deals.map((d) => d.lead_id).filter(Boolean))] as string[]
    if (leadIds.length > 0) {
      let leadsQuery = supabase
        .from("leads")
        .select("id, status, created_at")
        .eq("workspace_id", ctx.workspaceId)
        .in("id", leadIds)
      if (filters?.dateFrom) leadsQuery = leadsQuery.gte("created_at", filters.dateFrom)
      if (filters?.dateTo) leadsQuery = leadsQuery.lte("created_at", filters.dateTo)
      const { data } = await leadsQuery
      leads = (data ?? []) as LeadRow[]
    }
  } else {
    let leadsQuery = supabase
      .from("leads")
      .select("id, status, created_at")
      .eq("workspace_id", ctx.workspaceId)
    if (filters?.dateFrom) leadsQuery = leadsQuery.gte("created_at", filters.dateFrom)
    if (filters?.dateTo) leadsQuery = leadsQuery.lte("created_at", filters.dateTo)
    const { data } = await leadsQuery
    leads = (data ?? []) as LeadRow[]
  }

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

  // Funil: quando filtrando por etapa específica, mostra só ela; senão, todas as etapas padrão
  const funnelData = FUNNEL_STAGES.map(({ key, label }) => {
    const stageDeals = deals.filter((d: DealRow) => d.stage === key)
    return {
      stage: label,
      count: stageDeals.length,
      value: stageDeals.reduce((sum: number, d: DealRow) => sum + (d.value ?? 0), 0),
    }
  }).filter((d) => d.count > 0 || !filters?.stageId)

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

  // "novos no período": usa dateFrom se disponível, senão últimos 7 dias
  const periodStart = filters?.dateFrom
    ? new Date(filters.dateFrom)
    : (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d })()
  const newLeadsInPeriod = leads.filter((l: LeadRow) => new Date(l.created_at) >= periodStart).length

  return {
    totalLeads: leads.length,
    newLeadsThisWeek: newLeadsInPeriod,
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
