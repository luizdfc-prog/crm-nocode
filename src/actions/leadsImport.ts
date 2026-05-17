"use server"

import { revalidatePath } from "next/cache"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import type { WorkspacePlan, LeadStatus } from "@/types"
import { PLAN_LIMITS, PLAN_LABELS } from "@/types"

// ── Types ────────────────────────────────────────────────────────────────────

export interface ImportLeadRow {
  nome: string
  telefone?: string
  email?: string
  empresa?: string
  cargo?: string
  status?: string
  pipeline?: string
  etapa?: string
}

export interface ImportRowResult {
  row: number
  nome: string
  status: "ok" | "error"
  error?: string
  lead_id?: string
  deal_id?: string
}

export interface ImportLeadsResult {
  success: boolean
  total: number
  created: number
  errors: ImportRowResult[]
  limit_error?: string
}

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

const VALID_STATUSES: LeadStatus[] = ["novo", "contato", "proposta", "negociacao", "ganho", "perdido"]

function normalizeStatus(raw?: string): LeadStatus {
  if (!raw) return "novo"
  const lower = raw.toLowerCase().trim()
  if (VALID_STATUSES.includes(lower as LeadStatus)) return lower as LeadStatus
  return "novo"
}

// ── Pipelines for import hint ────────────────────────────────────────────────

export interface PipelineHint {
  id: string
  name: string
  stages: { id: string; name: string }[]
}

export async function getPipelinesForImport(): Promise<PipelineHint[]> {
  const supabase = await createServerClient()
  const workspaceId = await getWorkspaceId(supabase)
  if (!workspaceId) return []

  const { data } = await supabase
    .from("pipelines")
    .select("id, name, type, pipeline_stages(id, name, position)")
    .eq("workspace_id", workspaceId)
    .neq("type", "agent")
    .order("position")

  type Raw = { id: string; name: string; type: string; pipeline_stages: { id: string; name: string; position: number }[] }
  return ((data ?? []) as Raw[]).map((p) => ({
    id: p.id,
    name: p.name,
    stages: [...p.pipeline_stages].sort((a, b) => a.position - b.position).map((s) => ({ id: s.id, name: s.name })),
  }))
}

// ── Import Action ─────────────────────────────────────────────────────────────

export async function importLeads(rows: ImportLeadRow[]): Promise<ImportLeadsResult> {
  const supabase = await createServerClient()
  const workspaceId = await getWorkspaceId(supabase)
  if (!workspaceId) {
    return { success: false, total: rows.length, created: 0, errors: [], limit_error: "Não autenticado" }
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check plan limit
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("plan")
    .eq("id", workspaceId)
    .single()

  const plan = (workspace?.plan ?? "free") as WorkspacePlan
  const limit = PLAN_LIMITS[plan]

  let monthlyCount = 0
  if (limit !== null) {
    const now = new Date()
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const { count } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("created_at", firstOfMonth)
    monthlyCount = count ?? 0
  }

  // Pre-load pipelines and stages for this workspace
  const { data: pipelines } = await supabase
    .from("pipelines")
    .select("id, name, stages:pipeline_stages(id, name, position)")
    .eq("workspace_id", workspaceId)
    .order("position")

  type PipelineRow = { id: string; name: string; stages: { id: string; name: string; position: number }[] }
  const pipelineList: PipelineRow[] = (pipelines ?? []) as PipelineRow[]

  const results: ImportRowResult[] = []
  let created = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2 // 1-indexed + header row

    if (!row.nome || row.nome.trim().length < 2) {
      results.push({ row: rowNum, nome: row.nome ?? "", status: "error", error: "Nome é obrigatório (mínimo 2 caracteres)" })
      continue
    }

    // Check monthly limit
    if (limit !== null && monthlyCount + created >= limit) {
      results.push({ row: rowNum, nome: row.nome, status: "error", error: `Limite de ${limit} leads/mês atingido (${PLAN_LABELS[plan]})` })
      continue
    }

    // Create lead
    const { data: lead, error: leadErr } = await serviceClient
      .from("leads")
      .insert({
        workspace_id: workspaceId,
        name: row.nome.trim(),
        phone: row.telefone?.trim() || null,
        email: row.email?.trim() || null,
        company: row.empresa?.trim() || null,
        role: row.cargo?.trim() || null,
        status: normalizeStatus(row.status),
      })
      .select("id")
      .single()

    if (leadErr || !lead) {
      results.push({ row: rowNum, nome: row.nome, status: "error", error: leadErr?.message ?? "Erro ao criar lead" })
      continue
    }

    created++
    const result: ImportRowResult = { row: rowNum, nome: row.nome, status: "ok", lead_id: lead.id }

    // Create deal if pipeline specified
    if (row.pipeline?.trim()) {
      const pipelineMatch = pipelineList.find(
        (p) => p.name.toLowerCase() === row.pipeline!.trim().toLowerCase()
      )

      if (!pipelineMatch) {
        result.status = "ok"
        result.error = `Lead criado, mas pipeline "${row.pipeline}" não encontrado`
      } else {
        let stageId = pipelineMatch.stages[0]?.id ?? null

        if (row.etapa?.trim()) {
          const stageMatch = pipelineMatch.stages.find(
            (s) => s.name.toLowerCase() === row.etapa!.trim().toLowerCase()
          )
          if (stageMatch) {
            stageId = stageMatch.id
          } else {
            result.error = `Lead criado, mas etapa "${row.etapa}" não encontrada no pipeline`
          }
        }

        if (stageId) {
          const { data: deal, error: dealErr } = await serviceClient
            .from("deals")
            .insert({
              workspace_id: workspaceId,
              title: row.nome.trim(),
              value: 0,
              stage: "novo_lead",
              pipeline_id: pipelineMatch.id,
              stage_id: stageId,
              lead_id: lead.id,
              position: 9999,
            })
            .select("id")
            .single()

          if (dealErr || !deal) {
            result.error = (result.error ? result.error + "; " : "") + "Lead criado, mas erro ao criar card no pipeline"
          } else {
            result.deal_id = deal.id
          }
        }
      }
    }

    results.push(result)
  }

  revalidatePath("/leads")
  revalidatePath("/pipeline")
  revalidatePath("/dashboard")

  return {
    success: true,
    total: rows.length,
    created,
    errors: results.filter((r) => r.status === "error"),
  }
}

// ── Export Action ─────────────────────────────────────────────────────────────

export interface ExportLeadRow {
  Nome: string
  Telefone: string
  Email: string
  Empresa: string
  Cargo: string
  Status: string
  Pipeline: string
  Etapa: string
  "Criado em": string
}

export async function exportLeads(): Promise<{ success: true; rows: ExportLeadRow[] } | { success: false; error: string }> {
  const supabase = await createServerClient()
  const workspaceId = await getWorkspaceId(supabase)
  if (!workspaceId) return { success: false, error: "Não autenticado" }

  const { data: leads, error } = await supabase
    .from("leads")
    .select("id, name, phone, email, company, role, status, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })

  if (error) return { success: false, error: error.message }

  // Fetch deals separately to get pipeline/stage names
  const leadIds = (leads ?? []).map((l: { id: string }) => l.id)
  const { data: dealsData } = leadIds.length > 0
    ? await supabase
        .from("deals")
        .select("lead_id, pipeline_id, stage_id, pipelines!deals_pipeline_id_fkey(name), pipeline_stages!deals_stage_id_fkey(name)")
        .eq("workspace_id", workspaceId)
        .in("lead_id", leadIds)
    : { data: [] }

  type DealRow = {
    lead_id: string
    pipeline_id: string | null
    stage_id: string | null
    pipelines: { name: string } | null
    pipeline_stages: { name: string } | null
  }
  const dealsByLead = new Map<string, DealRow>()
  for (const d of ((dealsData ?? []) as unknown as DealRow[])) {
    if (d.lead_id && !dealsByLead.has(d.lead_id)) dealsByLead.set(d.lead_id, d)
  }

  type RawLead = { id: string; name: string; phone: string | null; email: string | null; company: string | null; role: string | null; status: string; created_at: string }

  const rows: ExportLeadRow[] = (leads as RawLead[]).map((lead) => {
    const deal = dealsByLead.get(lead.id)
    return {
      Nome: lead.name,
      Telefone: lead.phone ?? "",
      Email: lead.email ?? "",
      Empresa: lead.company ?? "",
      Cargo: lead.role ?? "",
      Status: lead.status,
      Pipeline: deal?.pipelines?.name ?? "",
      Etapa: deal?.pipeline_stages?.name ?? "",
      "Criado em": new Date(lead.created_at).toLocaleDateString("pt-BR"),
    }
  })

  return { success: true, rows }
}
