"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import type { LeadFieldDefinition, LeadFieldWithValue, FieldStat, RequiredForRule } from "@/types"
import type { DealStage } from "@/types/supabase"

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("profile_id", user.id)
    .limit(1)
    .single()

  if (!data) return null
  return { supabase, userId: user.id, workspaceId: data.workspace_id, role: data.role as "admin" | "member" }
}

const requiredForRuleSchema = z.object({
  pipeline_id: z.string().uuid(),
  stage_id: z.string().uuid(),
})

const createFieldSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(60),
  field_key: z.string().regex(/^[a-z0-9_]+$/, "Apenas letras minúsculas, números e _").max(40),
  field_type: z.enum(["text", "number", "date", "select", "multiselect"]),
  options: z.array(z.string().min(1)).default([]),
  position: z.number().int().min(0).default(0),
  required_for: z.array(requiredForRuleSchema).default([]),
})

const updateFieldSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(60).optional(),
  options: z.array(z.string().min(1)).optional(),
  position: z.number().int().min(0).optional(),
  required_for: z.array(requiredForRuleSchema).optional(),
})

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function getFieldDefinitions(): Promise<LeadFieldDefinition[]> {
  const ctx = await getContext()
  if (!ctx) return []

  const { data } = await ctx.supabase
    .from("lead_field_definitions")
    .select("*")
    .eq("workspace_id", ctx.workspaceId)
    .order("position", { ascending: true })

  return (data ?? []) as unknown as LeadFieldDefinition[]
}

export async function createFieldDefinition(
  input: z.infer<typeof createFieldSchema>
): Promise<ActionResult<LeadFieldDefinition>> {
  const parsed = createFieldSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  const ctx = await getContext()
  if (!ctx) return { success: false, error: "Não autenticado" }
  if (ctx.role !== "admin") return { success: false, error: "Apenas admins podem criar campos" }

  const { data, error } = await ctx.supabase
    .from("lead_field_definitions")
    .insert({
      workspace_id: ctx.workspaceId,
      name: parsed.data.name,
      field_key: parsed.data.field_key,
      field_type: parsed.data.field_type,
      options: parsed.data.options,
      position: parsed.data.position,
      required_for: parsed.data.required_for,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath("/leads")
  revalidatePath("/settings")
  return { success: true, data: data as unknown as LeadFieldDefinition }
}

export async function updateFieldDefinition(
  input: z.infer<typeof updateFieldSchema>
): Promise<ActionResult<LeadFieldDefinition>> {
  const parsed = updateFieldSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: "Dados inválidos" }

  const ctx = await getContext()
  if (!ctx) return { success: false, error: "Não autenticado" }
  if (ctx.role !== "admin") return { success: false, error: "Apenas admins podem editar campos" }

  const { id, ...fields } = parsed.data

  const { data, error } = await ctx.supabase
    .from("lead_field_definitions")
    .update({
      ...(fields.name !== undefined && { name: fields.name }),
      ...(fields.options !== undefined && { options: fields.options }),
      ...(fields.position !== undefined && { position: fields.position }),
      ...(fields.required_for !== undefined && { required_for: fields.required_for }),
    })
    .eq("id", id)
    .eq("workspace_id", ctx.workspaceId)
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath("/leads")
  revalidatePath("/settings")
  return { success: true, data: data as unknown as LeadFieldDefinition }
}

export async function deleteFieldDefinition(id: string): Promise<ActionResult> {
  const ctx = await getContext()
  if (!ctx) return { success: false, error: "Não autenticado" }
  if (ctx.role !== "admin") return { success: false, error: "Apenas admins podem excluir campos" }

  const { error } = await ctx.supabase
    .from("lead_field_definitions")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspaceId)

  if (error) return { success: false, error: error.message }

  revalidatePath("/leads")
  revalidatePath("/settings")
  return { success: true, data: undefined }
}

export async function getFieldValuesForLead(leadId: string): Promise<LeadFieldWithValue[]> {
  const ctx = await getContext()
  if (!ctx) return []

  const { data: definitions } = await ctx.supabase
    .from("lead_field_definitions")
    .select("*")
    .eq("workspace_id", ctx.workspaceId)
    .order("position", { ascending: true })

  if (!definitions || definitions.length === 0) return []

  const { data: values } = await ctx.supabase
    .from("lead_field_values")
    .select("field_id, value")
    .eq("lead_id", leadId)
    .eq("workspace_id", ctx.workspaceId)

  const valueMap = new Map((values ?? []).map((v) => [v.field_id, v.value]))

  return definitions.map((def) => ({
    ...(def as unknown as LeadFieldWithValue),
    options: def.options ?? [],
    value: valueMap.get(def.id) ?? null,
  }))
}

const ACTIVE_DEAL_STAGES: DealStage[] = ["novo_lead", "contato_realizado", "proposta_enviada", "negociacao"]
const CLOSED_DEAL_STAGES: DealStage[] = ["fechado_ganho", "fechado_perdido"]

export async function getFieldStats(filters?: {
  pipelineId?: string
  stageId?: string
  dealStage?: string  // enum legado: fechado_ganho | fechado_perdido
  dateFrom?: string
  dateTo?: string
  // "active" = Pipeline Ativo (só etapas abertas), "closed" = Relatório de Vendas (ganho/perdido)
  dealContext?: "active" | "closed"
}): Promise<FieldStat[]> {
  const ctx = await getContext()
  if (!ctx) return []

  const { data: definitions } = await ctx.supabase
    .from("lead_field_definitions")
    .select("*")
    .eq("workspace_id", ctx.workspaceId)
    .in("field_type", ["select", "multiselect", "text"])
    .order("position", { ascending: true })

  if (!definitions || definitions.length === 0) return []

  // Resolve lead_ids elegíveis via deals, sempre filtrando pelo contexto correto
  let filteredLeadIds: string[] | null = null
  const needsDealFilter =
    filters?.pipelineId || filters?.stageId || filters?.dealStage || filters?.dealContext

  if (needsDealFilter) {
    let dealsQuery = ctx.supabase
      .from("deals")
      .select("lead_id")
      .eq("workspace_id", ctx.workspaceId)
      .not("lead_id", "is", null)

    if (filters?.pipelineId) dealsQuery = dealsQuery.eq("pipeline_id", filters.pipelineId)
    if (filters?.stageId) dealsQuery = dealsQuery.eq("stage_id", filters.stageId)
    if (filters?.dealStage) dealsQuery = dealsQuery.eq("stage", filters.dealStage as import("@/types/supabase").DealStage)

    // Filtro de contexto: etapas ativas vs encerradas
    if (!filters?.stageId && !filters?.dealStage) {
      if (filters?.dealContext === "active") {
        dealsQuery = dealsQuery.in("stage", ACTIVE_DEAL_STAGES)
      } else if (filters?.dealContext === "closed") {
        dealsQuery = dealsQuery.in("stage", CLOSED_DEAL_STAGES)
      }
    }

    const { data: deals } = await dealsQuery
    filteredLeadIds = (deals ?? []).map((d: { lead_id: string }) => d.lead_id).filter(Boolean)

    if (filteredLeadIds.length === 0) return []
  }

  const results: FieldStat[] = []

  for (const def of definitions) {
    let valuesQuery = ctx.supabase
      .from("lead_field_values")
      .select("value")
      .eq("field_id", def.id)
      .eq("workspace_id", ctx.workspaceId)
      .not("value", "is", null)
      .neq("value", "")

    if (filteredLeadIds !== null) {
      valuesQuery = valuesQuery.in("lead_id", filteredLeadIds)
    }
    if (filters?.dateFrom) valuesQuery = valuesQuery.gte("created_at", filters.dateFrom)
    if (filters?.dateTo) valuesQuery = valuesQuery.lte("created_at", filters.dateTo)

    const { data: values } = await valuesQuery

    if (!values || values.length === 0) continue

    // Para campos texto: agrupa por valor normalizado (trim + lowercase como chave),
    // mas preserva a forma original mais frequente como label de exibição
    const counts: Record<string, number> = {}
    const labelByKey: Record<string, string> = {} // key normalizada → label original mais frequente

    for (const row of values) {
      if (!row.value) continue
      if (def.field_type === "multiselect") {
        try {
          const parsed = JSON.parse(row.value) as string[]
          for (const item of parsed) {
            if (!item) continue
            const key = item.trim().toLowerCase()
            counts[key] = (counts[key] ?? 0) + 1
            if (!labelByKey[key]) labelByKey[key] = item.trim()
          }
        } catch {
          const key = row.value.trim().toLowerCase()
          counts[key] = (counts[key] ?? 0) + 1
          if (!labelByKey[key]) labelByKey[key] = row.value.trim()
        }
      } else {
        // text e select: normaliza chave para agrupar valores idênticos
        const key = row.value.trim().toLowerCase()
        counts[key] = (counts[key] ?? 0) + 1
        if (!labelByKey[key]) labelByKey[key] = row.value.trim()
      }
    }

    const data = Object.entries(counts)
      .map(([key, count]) => ({ label: labelByKey[key] ?? key, count }))
      .sort((a, b) => b.count - a.count)

    if (data.length === 0) continue

    const total = data.reduce((sum, d) => sum + d.count, 0)

    results.push({ field: def as unknown as LeadFieldDefinition, data, total })
  }

  return results
}

export async function getRequiredFieldsForStage(
  pipelineId: string,
  stageId: string,
  leadId: string,
): Promise<{ field: LeadFieldDefinition; value: string | null }[]> {
  const ctx = await getContext()
  if (!ctx) return []

  const { data: definitions } = await ctx.supabase
    .from("lead_field_definitions")
    .select("*")
    .eq("workspace_id", ctx.workspaceId)

  if (!definitions || definitions.length === 0) return []

  const required = (definitions as unknown as LeadFieldDefinition[]).filter((def) =>
    def.required_for?.some(
      (r) => r.pipeline_id === pipelineId && r.stage_id === stageId,
    ),
  )

  if (required.length === 0) return []

  const { data: values } = await ctx.supabase
    .from("lead_field_values")
    .select("field_id, value")
    .eq("lead_id", leadId)
    .eq("workspace_id", ctx.workspaceId)

  const valueMap = new Map((values ?? []).map((v) => [v.field_id, v.value]))

  return required
    .filter((def) => {
      const val = valueMap.get(def.id) ?? null
      return !val || val.trim() === "" || val === "[]"
    })
    .map((def) => ({ field: def, value: valueMap.get(def.id) ?? null }))
}

export async function upsertFieldValues(
  leadId: string,
  values: Record<string, string | null>
): Promise<ActionResult> {
  const ctx = await getContext()
  if (!ctx) return { success: false, error: "Não autenticado" }

  const rows = Object.entries(values).map(([field_id, value]) => ({
    workspace_id: ctx.workspaceId,
    lead_id: leadId,
    field_id,
    value,
  }))

  if (rows.length === 0) return { success: true, data: undefined }

  const { error } = await ctx.supabase
    .from("lead_field_values")
    .upsert(rows, { onConflict: "lead_id,field_id" })

  if (error) return { success: false, error: error.message }

  revalidatePath(`/leads/${leadId}`)
  return { success: true, data: undefined }
}
