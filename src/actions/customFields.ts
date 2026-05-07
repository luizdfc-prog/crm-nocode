"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import type { LeadFieldDefinition, LeadFieldWithValue } from "@/types"

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
