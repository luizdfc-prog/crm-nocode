"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import type { LeadFieldDefinition, LeadFieldWithValue, FieldStat } from "@/types"

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

const createFieldSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(60),
  field_key: z.string().regex(/^[a-z0-9_]+$/, "Apenas letras minúsculas, números e _").max(40),
  field_type: z.enum(["text", "number", "date", "select", "multiselect"]),
  options: z.array(z.string().min(1)).default([]),
  position: z.number().int().min(0).default(0),
})

const updateFieldSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(60).optional(),
  options: z.array(z.string().min(1)).optional(),
  position: z.number().int().min(0).optional(),
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

export async function getFieldStats(filters?: {
  pipelineId?: string
  stageId?: string
  dateFrom?: string
  dateTo?: string
}): Promise<FieldStat[]> {
  const ctx = await getContext()
  if (!ctx) return []

  const { data: definitions } = await ctx.supabase
    .from("lead_field_definitions")
    .select("*")
    .eq("workspace_id", ctx.workspaceId)
    .in("field_type", ["select", "multiselect"])
    .order("position", { ascending: true })

  if (!definitions || definitions.length === 0) return []

  // Se há filtro por pipeline ou stage, resolve o conjunto de lead_ids elegíveis via deals
  let filteredLeadIds: string[] | null = null
  if (filters?.pipelineId || filters?.stageId) {
    let dealsQuery = ctx.supabase
      .from("deals")
      .select("lead_id")
      .eq("workspace_id", ctx.workspaceId)
      .not("lead_id", "is", null)

    if (filters.pipelineId) dealsQuery = dealsQuery.eq("pipeline_id", filters.pipelineId)
    if (filters.stageId) dealsQuery = dealsQuery.eq("stage_id", filters.stageId)

    const { data: deals } = await dealsQuery
    filteredLeadIds = (deals ?? []).map((d: { lead_id: string }) => d.lead_id).filter(Boolean)

    // Nenhum lead na combinação selecionada — retorna vazio imediatamente
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

    const counts: Record<string, number> = {}

    for (const row of values) {
      if (!row.value) continue
      // multiselect armazena JSON array
      if (def.field_type === "multiselect") {
        try {
          const parsed = JSON.parse(row.value) as string[]
          for (const item of parsed) {
            if (item) counts[item] = (counts[item] ?? 0) + 1
          }
        } catch {
          counts[row.value] = (counts[row.value] ?? 0) + 1
        }
      } else {
        counts[row.value] = (counts[row.value] ?? 0) + 1
      }
    }

    const data = Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)

    if (data.length === 0) continue

    const total = data.reduce((sum, d) => sum + d.count, 0)

    results.push({ field: def as unknown as LeadFieldDefinition, data, total })
  }

  return results
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
    updated_at: new Date().toISOString(),
  }))

  if (rows.length === 0) return { success: true, data: undefined }

  const { error } = await ctx.supabase
    .from("lead_field_values")
    .upsert(rows, { onConflict: "lead_id,field_id" })

  if (error) return { success: false, error: error.message }

  revalidatePath(`/leads/${leadId}`)
  return { success: true, data: undefined }
}
