"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { logStageMovement, getLeadConversationId } from "@/lib/deal-stage-log"
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
  lost_reason: z.string().nullable().optional(),
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
  id, workspace_id, title, value, stage, pipeline_id, stage_id, lead_id, owner_id, due_date, position, is_return, created_at,
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

  const updatePayload: Record<string, unknown> = {
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
    ...(fields.lost_reason !== undefined && { lost_reason: fields.lost_reason ?? null }),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("deals").update(updatePayload as any) as ReturnType<typeof supabase.from>)
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
 * Ao mover para fechado_ganho ou fechado_perdido, encerra a conversa do lead vinculado.
 */
export async function reorderDeals(
  updates: { id: string; position: number; stage: DealStage; stage_id?: string | null; lost_reason?: string | null }[]
): Promise<ActionResult> {
  if (updates.length === 0) return { success: true, data: undefined }

  const supabase = await createServerClient()
  const ctx = await getWorkspaceAndUser(supabase)
  if (!ctx) return { success: false, error: "Não autenticado" }

  // Captura estado anterior dos deals que mudam de stage (para logar from_stage)
  const dealsChangingStage = updates.filter((u) => u.stage_id !== undefined)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: prevDeals } = await (supabase.from("deals").select("id, stage_id, pipeline_id, lead_id, pipeline_stage:pipeline_stages!deals_stage_id_fkey(id, name)") as any)
    .in("id", dealsChangingStage.map((u) => u.id))
    .eq("workspace_id", ctx.workspaceId)

  const prevMap = new Map<string, { stage_id: string | null; pipeline_id: string | null; lead_id: string | null; stageName: string | null }>(
    (prevDeals ?? []).map((d: { id: string; stage_id: string | null; pipeline_id: string | null; lead_id: string | null; pipeline_stage: { name: string } | null }) => [
      d.id,
      { stage_id: d.stage_id, pipeline_id: d.pipeline_id, lead_id: d.lead_id, stageName: d.pipeline_stage?.name ?? null },
    ])
  )

  const results = await Promise.all(
    updates.map(({ id, position, stage, stage_id, lost_reason }) => {
      const payload: Record<string, unknown> = {
        position,
        stage,
        ...(stage_id !== undefined && { stage_id: stage_id ?? null }),
        ...(lost_reason !== undefined && { lost_reason: lost_reason ?? null }),
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (supabase.from("deals").update(payload as any) as ReturnType<typeof supabase.from>)
        .eq("id", id)
        .eq("workspace_id", ctx.workspaceId)
    })
  )

  const failed = results.find((r) => r.error)
  if (failed?.error) return { success: false, error: failed.error.message }

  // Grava logs para deals que mudaram de etapa
  // Busca nomes das novas etapas de uma só vez
  const newStageIds = dealsChangingStage.map((u) => u.stage_id).filter(Boolean) as string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newStages } = newStageIds.length > 0
    ? await (supabase.from("pipeline_stages").select("id, name") as any).in("id", newStageIds)
    : { data: [] }
  const newStageMap = new Map<string, string>((newStages ?? []).map((s: { id: string; name: string }) => [s.id, s.name]))

  for (const u of dealsChangingStage) {
    const prev = prevMap.get(u.id)
    if (!prev || !u.stage_id || prev.stage_id === u.stage_id) continue
    const toStageName = newStageMap.get(u.stage_id) ?? u.stage_id
    const convId = await getLeadConversationId(supabase as Parameters<typeof getLeadConversationId>[0], ctx.workspaceId, prev.lead_id)
    void logStageMovement({
      workspaceId: ctx.workspaceId,
      dealId: u.id,
      pipelineId: prev.pipeline_id ?? "",
      leadId: prev.lead_id,
      fromStageId: prev.stage_id,
      fromStageName: prev.stageName,
      toStageId: u.stage_id,
      toStageName,
      movedBy: "user",
      conversationId: convId,
      supabaseClient: supabase as Parameters<typeof logStageMovement>[0]["supabaseClient"],
    })
  }

  // Encerra conversa dos leads cujos deals foram movidos para fechado
  const closedUpdates = updates.filter(
    (u) => u.stage === "fechado_ganho" || u.stage === "fechado_perdido"
  )
  if (closedUpdates.length > 0) {
    const closedDealIds = closedUpdates.map((u) => u.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: closedDeals } = await (supabase.from("deals").select("lead_id") as any)
      .in("id", closedDealIds)
      .eq("workspace_id", ctx.workspaceId)
    const leadIds = (closedDeals ?? [])
      .map((d: { lead_id: string | null }) => d.lead_id)
      .filter(Boolean) as string[]
    if (leadIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("conversations").update({ status: "closed", ai_active: false }) as any)
        .in("lead_id", leadIds)
        .eq("workspace_id", ctx.workspaceId)
        .eq("status", "open")
    }
  }

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

export interface SalesReportFilters {
  pipelineId?: string
  dateFrom?: string
  dateTo?: string
}

export interface SalesReportData {
  // KPIs
  totalRevenue: number
  wonDealsCount: number
  lostDealsCount: number
  avgTicket: number
  conversionRate: number
  openDealsCount: number
  openDealsValue: number
  // Evolução mensal: ganhos e perdidos por mês
  monthlyEvolution: { month: string; won: number; lost: number; revenue: number }[]
  // Distribuição por campo personalizado (origem, produto, motivo_perda, etc.)
  fieldDistributions: {
    fieldName: string
    fieldKey: string
    fieldType: string
    data: { label: string; count: number; value: number }[]
    total: number
  }[]
  // Resumo de pipeline
  funnelData: { stage: string; count: number; value: number }[]
}

export async function getSalesReport(filters?: SalesReportFilters): Promise<SalesReportData | null> {
  const supabase = await createServerClient()
  const ctx = await getWorkspaceAndUser(supabase)
  if (!ctx) return null

  // Busca todos os deals do workspace (ou do pipeline selecionado)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dealsQuery = (supabase as any)
    .from("deals")
    .select("id, stage, value, lead_id, created_at, pipeline_id, lost_reason")
    .eq("workspace_id", ctx.workspaceId)

  if (filters?.pipelineId) dealsQuery = dealsQuery.eq("pipeline_id", filters.pipelineId)
  if (filters?.dateFrom) dealsQuery = dealsQuery.gte("created_at", filters.dateFrom)
  if (filters?.dateTo) dealsQuery = dealsQuery.lte("created_at", filters.dateTo)

  const { data: allDeals } = await dealsQuery
  const deals = (allDeals ?? []) as { id: string; stage: string; value: number | null; lead_id: string | null; created_at: string; pipeline_id: string | null; lost_reason: string | null }[]

  const ACTIVE_STAGES: DealStage[] = ["novo_lead", "contato_realizado", "proposta_enviada", "negociacao"]
  const wonDeals = deals.filter((d) => d.stage === "fechado_ganho")
  const lostDeals = deals.filter((d) => d.stage === "fechado_perdido")
  const openDeals = deals.filter((d) => ACTIVE_STAGES.includes(d.stage as DealStage))
  const closedDeals = [...wonDeals, ...lostDeals]

  const totalRevenue = wonDeals.reduce((sum, d) => sum + (d.value ?? 0), 0)
  const avgTicket = wonDeals.length > 0 ? totalRevenue / wonDeals.length : 0
  const conversionRate = closedDeals.length > 0
    ? Math.round((wonDeals.length / closedDeals.length) * 100)
    : 0
  const openDealsValue = openDeals.reduce((sum, d) => sum + (d.value ?? 0), 0)

  // Evolução mensal agrupando por mês de criação
  const monthMap: Record<string, { won: number; lost: number; revenue: number }> = {}
  for (const d of deals) {
    const month = d.created_at.slice(0, 7) // "YYYY-MM"
    if (!monthMap[month]) monthMap[month] = { won: 0, lost: 0, revenue: 0 }
    if (d.stage === "fechado_ganho") {
      monthMap[month].won++
      monthMap[month].revenue += d.value ?? 0
    } else if (d.stage === "fechado_perdido") {
      monthMap[month].lost++
    }
  }
  const monthlyEvolution = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      ...v,
    }))

  // Funil completo
  const FUNNEL_STAGES: { key: DealStage; label: string }[] = [
    { key: "novo_lead", label: "Novo Lead" },
    { key: "contato_realizado", label: "Contato Realizado" },
    { key: "proposta_enviada", label: "Proposta Enviada" },
    { key: "negociacao", label: "Negociação" },
    { key: "fechado_ganho", label: "Fechado Ganho" },
    { key: "fechado_perdido", label: "Fechado Perdido" },
  ]
  const funnelData = FUNNEL_STAGES
    .map(({ key, label }) => {
      const stageDeals = deals.filter((d) => d.stage === key)
      return {
        stage: label,
        count: stageDeals.length,
        value: stageDeals.reduce((sum, d) => sum + (d.value ?? 0), 0),
      }
    })
    .filter((d) => d.count > 0)

  // Campos personalizados: apenas leads de deals ENCERRADOS (ganho ou perdido)
  const leadIds = [...new Set(closedDeals.map((d) => d.lead_id).filter(Boolean))] as string[]

  const fieldDistributions: SalesReportData["fieldDistributions"] = []

  if (leadIds.length > 0) {
    const { data: definitions } = await supabase
      .from("lead_field_definitions")
      .select("*")
      .eq("workspace_id", ctx.workspaceId)
      .in("field_type", ["select", "multiselect", "text"])
      .order("position", { ascending: true })

    if (definitions && definitions.length > 0) {
      // Mapa lead_id → valor do deal (para calcular receita por campo)
      const leadValueMap: Record<string, number> = {}
      for (const d of wonDeals) {
        if (d.lead_id) leadValueMap[d.lead_id] = (leadValueMap[d.lead_id] ?? 0) + (d.value ?? 0)
      }

      for (const def of definitions) {
        const { data: values } = await supabase
          .from("lead_field_values")
          .select("lead_id, value")
          .eq("field_id", def.id)
          .eq("workspace_id", ctx.workspaceId)
          .in("lead_id", leadIds)
          .not("value", "is", null)
          .neq("value", "")

        if (!values || values.length === 0) continue

        const counts: Record<string, { count: number; value: number }> = {}
        const labelByKey: Record<string, string> = {}

        for (const row of values as { lead_id: string; value: string }[]) {
          const addEntry = (raw: string) => {
            const key = raw.trim().toLowerCase()
            if (!counts[key]) counts[key] = { count: 0, value: 0 }
            if (!labelByKey[key]) labelByKey[key] = raw.trim()
            counts[key].count++
            counts[key].value += leadValueMap[row.lead_id] ?? 0
          }

          if (def.field_type === "multiselect") {
            try {
              const parsed = JSON.parse(row.value) as string[]
              for (const item of parsed) if (item) addEntry(item)
            } catch {
              addEntry(row.value)
            }
          } else {
            addEntry(row.value)
          }
        }

        const data = Object.entries(counts)
          .map(([key, { count, value }]) => ({ label: labelByKey[key] ?? key, count, value }))
          .sort((a, b) => b.count - a.count)

        if (data.length === 0) continue

        const total = data.reduce((sum, d) => sum + d.count, 0)
        fieldDistributions.push({
          fieldName: def.name as string,
          fieldKey: def.field_key as string,
          fieldType: def.field_type as string,
          data,
          total,
        })
      }
    }
  }

  // Distribuição de motivos de perda (coluna nativa lost_reason)
  const lostReasonCounts: Record<string, number> = {}
  for (const d of lostDeals) {
    const reason = d.lost_reason?.trim()
    if (reason) lostReasonCounts[reason] = (lostReasonCounts[reason] ?? 0) + 1
  }
  const lostReasonData = Object.entries(lostReasonCounts)
    .map(([label, count]) => ({ label, count, value: 0 }))
    .sort((a, b) => b.count - a.count)

  if (lostReasonData.length > 0) {
    fieldDistributions.unshift({
      fieldName: "Motivo de Perda",
      fieldKey: "_lost_reason",
      fieldType: "select",
      data: lostReasonData,
      total: lostReasonData.reduce((sum, d) => sum + d.count, 0),
    })
  }

  return {
    totalRevenue,
    wonDealsCount: wonDeals.length,
    lostDealsCount: lostDeals.length,
    avgTicket,
    conversionRate,
    openDealsCount: openDeals.length,
    openDealsValue,
    monthlyEvolution,
    fieldDistributions,
    funnelData,
  }
}

// ── Funil de Conversão por Pipeline ──────────────────────────────────────────

export interface FunnelStageStats {
  stageId: string
  stageName: string
  stageColor: string
  position: number
  count: number
  conversionFromPrev: number | null  // % em relação à etapa anterior
  conversionFromFirst: number | null // % em relação à primeira etapa
}

export interface PipelineFunnelStats {
  pipelineId: string
  pipelineName: string
  pipelineType: "sales" | "agent" | "custom"
  stages: FunnelStageStats[]
  totalDeals: number
  // Somente pipelines de agente:
  transferBreakdown?: { targetPipelineId: string; targetPipelineName: string; count: number }[]
  lostReasons?: { reason: string; count: number }[]
  agentOverview?: {
    totalAtendidos: number
    totalTransferidos: number
    taxaTransferencia: number
  }
  agentCoreFunnel?: { stageName: string; stageColor: string; count: number; pct: number }[]
  followUpEfficiency?: {
    stageName: string
    stageColor: string
    leadsParados: number
    leadsResponderam: number
    taxaResposta: number
    entradas: number
  }[]
}

export async function getFunnelStats(periodDays?: number): Promise<PipelineFunnelStats[]> {
  const supabase = await createServerClient()
  const ctx = await getWorkspaceAndUser(supabase)
  if (!ctx) return []

  // Busca todos os pipelines com suas stages
  const { data: pipelines } = await supabase
    .from("pipelines")
    .select("id, name, type, position, pipeline_stages(id, name, color, position)")
    .eq("workspace_id", ctx.workspaceId)
    .order("position", { ascending: true })

  if (!pipelines || pipelines.length === 0) return []

  // Busca todos os deals do workspace com stage_id, pipeline_id, lost_reason
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allDeals } = await (supabase as any)
    .from("deals")
    .select("id, pipeline_id, stage_id, lost_reason, stage")
    .eq("workspace_id", ctx.workspaceId)

  const deals = (allDeals ?? []) as {
    id: string
    pipeline_id: string | null
    stage_id: string | null
    lost_reason: string | null
    stage: string
  }[]

  // Para pipelines de agente: busca transferências (deals com stage="fechado_ganho" ou
  // stage_id de "Transferido") — a transferência move o deal para o pipeline de vendas,
  // então contamos os deals cujo pipeline_id aponta para um pipeline de vendas
  // e que vieram de um pipeline de agente (identificado pelo is_return ou pela origem).
  // Na prática, contamos deals em pipelines de vendas que foram originados via transfer.
  // Abordagem simples: contar deals em cada pipeline de vendas por pipeline de origem.
  // Como não há coluna de origem, usamos a contagem por pipeline_id destino para cada
  // deal que estava em "Transferido" em pipelines de agente.

  const result: PipelineFunnelStats[] = []

  for (const pipeline of pipelines) {
    const stages = (
      (pipeline.pipeline_stages as { id: string; name: string; color: string; position: number }[] | null) ?? []
    ).sort((a, b) => a.position - b.position)

    const pipelineDeals = deals.filter((d) => d.pipeline_id === pipeline.id)

    const stageStats: FunnelStageStats[] = stages.map((stage, idx) => {
      const count = pipelineDeals.filter((d) => d.stage_id === stage.id).length
      const prevCount = idx > 0
        ? pipelineDeals.filter((d) => d.stage_id === stages[idx - 1].id).length
        : null
      const firstCount = pipelineDeals.filter((d) => d.stage_id === stages[0].id).length

      return {
        stageId: stage.id,
        stageName: stage.name,
        stageColor: stage.color,
        position: stage.position,
        count,
        conversionFromPrev: (prevCount !== null && prevCount > 0)
          ? Math.round((count / prevCount) * 100)
          : null,
        conversionFromFirst: (idx > 0 && firstCount > 0)
          ? Math.round((count / firstCount) * 100)
          : null,
      }
    })

    const pipelineResult: PipelineFunnelStats = {
      pipelineId: pipeline.id,
      pipelineName: pipeline.name,
      pipelineType: pipeline.type as "sales" | "agent" | "custom",
      stages: stageStats,
      totalDeals: pipelineDeals.length,
    }

    // ── Motivos de perda e transferências (exclusivo agente) ─────────────────
    if (pipeline.type === "agent") {
      const lostReasonMap: Record<string, number> = {}
      for (const d of pipelineDeals) {
        if (d.stage === "fechado_perdido" && d.lost_reason?.trim()) {
          const r = d.lost_reason.trim()
          lostReasonMap[r] = (lostReasonMap[r] ?? 0) + 1
        }
      }
      pipelineResult.lostReasons = Object.entries(lostReasonMap)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)

      const { data: agentDealsWithLead } = await supabase
        .from("deals")
        .select("lead_id")
        .eq("workspace_id", ctx.workspaceId)
        .eq("pipeline_id", pipeline.id)
        .not("lead_id", "is", null)

      const agentLeadIdSet = new Set(
        (agentDealsWithLead ?? []).map((d: { lead_id: string | null }) => d.lead_id).filter(Boolean) as string[]
      )

      const { data: transferredDeals } = await supabase
        .from("deals")
        .select("pipeline_id")
        .eq("workspace_id", ctx.workspaceId)
        .neq("pipeline_id", pipeline.id)
        .in("lead_id", Array.from(agentLeadIdSet))

      const transferMap: Record<string, number> = {}
      for (const d of (transferredDeals ?? []) as { pipeline_id: string | null }[]) {
        if (d.pipeline_id) {
          transferMap[d.pipeline_id] = (transferMap[d.pipeline_id] ?? 0) + 1
        }
      }

      const targetPipelineIds = Object.keys(transferMap)
      const targetPipelines = pipelines.filter((p) => targetPipelineIds.includes(p.id))

      pipelineResult.transferBreakdown = targetPipelines
        .map((p) => ({
          targetPipelineId: p.id,
          targetPipelineName: p.name,
          count: transferMap[p.id] ?? 0,
        }))
        .sort((a, b) => b.count - a.count)

      const totalTransferidos = Object.values(transferMap).reduce((s, n) => s + n, 0)
      pipelineResult.agentOverview = {
        totalAtendidos: pipelineDeals.length,
        totalTransferidos,
        taxaTransferencia: pipelineDeals.length > 0 ? Math.round((totalTransferidos / pipelineDeals.length) * 100) : 0,
      }
    }

    // ── Funil + Follow-ups (todos os tipos de pipeline) ───────────────────────
    const FOLLOWUP_KEYWORDS = ["follow", "follow-up", "followup"]
    const coreStages = stages.filter(
      (s) => !FOLLOWUP_KEYWORDS.some((kw) => s.name.toLowerCase().includes(kw))
    )
    const firstCoreCount = pipelineDeals.filter((d) => d.stage_id === coreStages[0]?.id).length
    pipelineResult.agentCoreFunnel = coreStages.map((s) => {
      const count = pipelineDeals.filter((d) => d.stage_id === s.id).length
      return {
        stageName: s.name,
        stageColor: s.color,
        count,
        pct: firstCoreCount > 0 ? Math.round((count / firstCoreCount) * 100) : 0,
      }
    })

    const followUpStages = stages.filter(
      (s) => FOLLOWUP_KEYWORDS.some((kw) => s.name.toLowerCase().includes(kw))
    )

    if (followUpStages.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: returnDeals } = await (supabase as any)
        .from("deals")
        .select("id, stage_id")
        .eq("workspace_id", ctx.workspaceId)
        .eq("pipeline_id", pipeline.id)
        .eq("is_return", true)

      const qualificandoStage = stages.find((s) => s.name.toLowerCase().includes("qualific"))
      const returnCount = (returnDeals ?? []).filter(
        (d: { stage_id: string }) => d.stage_id === qualificandoStage?.id
      ).length

      const totalFollowUpLeads = followUpStages.reduce(
        (s, fs) => s + pipelineDeals.filter((d) => d.stage_id === fs.id).length, 0
      )

      // Busca logs reais de movimentação para o período filtrado
      const periodStart = periodDays
        ? new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined

      // Logs de avanço (cron moveu para follow-up) — "quantos passaram por esta etapa"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const logsQuery = (supabase as any)
        .from("deal_stage_logs")
        .select("from_stage_id, to_stage_id, to_stage_name")
        .eq("workspace_id", ctx.workspaceId)
        .eq("pipeline_id", pipeline.id)
        .eq("moved_by", "cron")
      if (periodStart) logsQuery.gte("created_at", periodStart)
      const { data: cronLogs } = await logsQuery

      // Logs de retorno (lead respondeu no follow-up e voltou para Qualificando)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const returnQuery = (supabase as any)
        .from("deal_stage_logs")
        .select("from_stage_id, from_stage_name")
        .eq("workspace_id", ctx.workspaceId)
        .eq("pipeline_id", pipeline.id)
        .eq("moved_by", "webhook")
        .eq("to_stage_name", "Qualificando")
      if (periodStart) returnQuery.gte("created_at", periodStart)
      const { data: returnLogs } = await returnQuery

      pipelineResult.followUpEfficiency = followUpStages.map((s) => {
        // Quantos deals entraram nesta etapa (cron moveu para cá)
        const entradas = (cronLogs ?? []).filter(
          (l: { to_stage_id: string }) => l.to_stage_id === s.id
        ).length
        // Quantos responderam enquanto estavam nesta etapa (webhook moveu de cá para Qualificando)
        const leadsResponderam = (returnLogs ?? []).filter(
          (l: { from_stage_id: string }) => l.from_stage_id === s.id
        ).length
        // Leads ainda parados nesta etapa agora
        const leadsParados = pipelineDeals.filter((d) => d.stage_id === s.id).length
        return {
          stageName: s.name,
          stageColor: s.color,
          leadsParados,
          leadsResponderam,
          taxaResposta: entradas > 0 ? Math.round((leadsResponderam / entradas) * 100) : 0,
          entradas,
        }
      })
    }

    result.push(pipelineResult)
  }

  return result
}
