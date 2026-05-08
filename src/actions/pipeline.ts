"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { AGENT_STAGE_NAMES, DEFAULT_AGENT_STAGES } from "@/lib/agent-stages"
import type { Pipeline, PipelineStage } from "@/types"

// ── Tipos internos ────────────────────────────────────────────────────────────

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

// ── Schemas de validação ──────────────────────────────────────────────────────

const createPipelineSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  type: z.enum(["sales", "agent", "custom"]).default("sales"),
})

const updatePipelineSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Nome é obrigatório").max(100),
})

const createStageSchema = z.object({
  pipeline_id: z.string().uuid(),
  name: z.string().min(1, "Nome é obrigatório").max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida").default("#5B7FFF"),
})

const updateStageSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Nome é obrigatório").max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida").optional(),
  position: z.number().int().min(0).optional(),
})

const reorderStagesSchema = z.array(
  z.object({
    id: z.string().uuid(),
    position: z.number().int().min(0),
  })
)

const transferDealSchema = z.object({
  deal_id: z.string().uuid(),
  to_pipeline_id: z.string().uuid(),
  to_stage_id: z.string().uuid(),
  reason: z.string().optional(),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

type SupabaseClient = Awaited<ReturnType<typeof createServerClient>>

async function getContext(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single()

  if (!data) return null
  return { userId: user.id, workspaceId: data.workspace_id, role: data.role }
}

async function assertAdmin(supabase: SupabaseClient): Promise<
  { ok: true; ctx: NonNullable<Awaited<ReturnType<typeof getContext>>> } | { ok: false; error: string }
> {
  const ctx = await getContext(supabase)
  if (!ctx) return { ok: false, error: "Não autenticado" }
  if (ctx.role !== "admin") return { ok: false, error: "Apenas admins podem executar esta ação" }
  return { ok: true, ctx }
}

// ── Stages padrão do pipeline de vendas ──────────────────────────────────────

const DEFAULT_SALES_STAGES = [
  { name: "Novo Lead",          color: "#5B7FFF", position: 0 },
  { name: "Contato Realizado",  color: "#CAFF33", position: 1 },
  { name: "Proposta Enviada",   color: "#FF6B35", position: 2 },
  { name: "Negociação",         color: "#FF6B35", position: 3 },
  { name: "Fechado Ganho",      color: "#2ED573", position: 4 },
  { name: "Fechado Perdido",    color: "#FF4757", position: 5 },
] as const


// ── Actions públicas ──────────────────────────────────────────────────────────

/**
 * Retorna todos os pipelines do workspace com suas stages, ordenados por position.
 */
export async function getPipelines(): Promise<Pipeline[]> {
  const supabase = await createServerClient()
  const ctx = await getContext(supabase)
  if (!ctx) return []

  const { data, error } = await supabase
    .from("pipelines")
    .select(
      `
      id, workspace_id, name, type, position, created_at,
      stages:pipeline_stages(id, pipeline_id, name, color, position, created_at)
    `
    )
    .eq("workspace_id", ctx.workspaceId)
    .order("position", { ascending: true })

  if (error) {
    console.error("[getPipelines]", error)
    return []
  }

  // Ordenar stages por position
  const pipelines = (data ?? []).map((p) => ({
    ...p,
    type: p.type as Pipeline["type"],
    stages: [...(p.stages ?? [])].sort((a, b) => a.position - b.position) as PipelineStage[],
  }))

  // Admin vê todos os pipelines do workspace
  if (ctx.role === "admin") return pipelines

  // Membros: filtrar pelos pipelines marcados em pipeline_permissions
  // Se não houver nenhuma permissão salva, mantém acesso a todos (compatibilidade com membros antigos)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pipelinePerms } = await (supabase as any)
    .from("pipeline_permissions")
    .select("pipeline_id, can_view")
    .eq("workspace_id", ctx.workspaceId)
    .eq("profile_id", ctx.userId)

  const perms = (pipelinePerms ?? []) as { pipeline_id: string; can_view: boolean }[]
  if (perms.length === 0) return pipelines

  const allowedIds = new Set(perms.filter(p => p.can_view).map(p => p.pipeline_id))
  return pipelines.filter(p => allowedIds.has(p.id))
}

/**
 * Cria um novo pipeline com stages padrão (para type='sales') ou vazio.
 * Admin only. Plano Free: máximo 1 pipeline.
 */
export async function createPipeline(
  name: string,
  type: "sales" | "agent" | "custom" = "sales"
): Promise<ActionResult<Pipeline>> {
  const parsed = createPipelineSchema.safeParse({ name, type })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  const supabase = await createServerClient()
  const guard = await assertAdmin(supabase)
  if (!guard.ok) return { success: false, error: guard.error }
  const { ctx } = guard

  // Verificar plano: Free só permite 1 pipeline
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("plan")
    .eq("id", ctx.workspaceId)
    .single()

  if (workspace?.plan === "free") {
    const { count } = await supabase
      .from("pipelines")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", ctx.workspaceId)

    if ((count ?? 0) >= 1) {
      return {
        success: false,
        error: "Plano Free permite apenas 1 pipeline. Faça upgrade para Pro.",
      }
    }
  }

  // Posição = último
  const { count: posCount } = await supabase
    .from("pipelines")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", ctx.workspaceId)

  const position = posCount ?? 0

  const { data: pipeline, error: pipelineError } = await supabase
    .from("pipelines")
    .insert({
      workspace_id: ctx.workspaceId,
      name: parsed.data.name,
      type: parsed.data.type,
      position,
    })
    .select("id, workspace_id, name, type, position, created_at")
    .single()

  if (pipelineError || !pipeline) {
    return { success: false, error: pipelineError?.message ?? "Erro ao criar pipeline" }
  }

  // Criar stages padrão para tipo 'sales'
  let stages: PipelineStage[] = []
  if (parsed.data.type === "sales") {
    const stagesToInsert = DEFAULT_SALES_STAGES.map((s) => ({
      ...s,
      pipeline_id: pipeline.id,
    }))

    const { data: insertedStages, error: stagesError } = await supabase
      .from("pipeline_stages")
      .insert(stagesToInsert)
      .select("id, pipeline_id, name, color, position, created_at")

    if (stagesError) {
      console.error("[createPipeline] stages error", stagesError)
    }

    stages = (insertedStages ?? []).sort((a, b) => a.position - b.position) as PipelineStage[]
  }

  revalidatePath("/pipeline")
  revalidatePath("/settings")

  return {
    success: true,
    data: {
      ...pipeline,
      type: pipeline.type as Pipeline["type"],
      stages,
    },
  }
}

/**
 * Renomeia um pipeline. Admin only.
 */
export async function updatePipeline(id: string, name: string): Promise<ActionResult<Pipeline>> {
  const parsed = updatePipelineSchema.safeParse({ id, name })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  const supabase = await createServerClient()
  const guard = await assertAdmin(supabase)
  if (!guard.ok) return { success: false, error: guard.error }
  const { ctx } = guard

  const { data, error } = await supabase
    .from("pipelines")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.id)
    .eq("workspace_id", ctx.workspaceId)
    .select("id, workspace_id, name, type, position, created_at")
    .single()

  if (error || !data) {
    return { success: false, error: error?.message ?? "Erro ao atualizar pipeline" }
  }

  revalidatePath("/pipeline")
  revalidatePath("/settings")

  return { success: true, data: { ...data, type: data.type as Pipeline["type"] } }
}

/**
 * Deleta um pipeline. Admin only. Não permite deletar se for o único pipeline do workspace.
 */
export async function deletePipeline(id: string): Promise<ActionResult> {
  const parsed = z.string().uuid().safeParse(id)
  if (!parsed.success) return { success: false, error: "ID inválido" }

  const supabase = await createServerClient()
  const guard = await assertAdmin(supabase)
  if (!guard.ok) return { success: false, error: guard.error }
  const { ctx } = guard

  const { count } = await supabase
    .from("pipelines")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", ctx.workspaceId)

  if ((count ?? 0) <= 1) {
    return { success: false, error: "Não é possível deletar o único pipeline do workspace." }
  }

  const { error } = await supabase
    .from("pipelines")
    .delete()
    .eq("id", parsed.data)
    .eq("workspace_id", ctx.workspaceId)

  if (error) return { success: false, error: error.message }

  revalidatePath("/pipeline")
  revalidatePath("/settings")
  return { success: true, data: undefined }
}

/**
 * Cria uma nova stage em um pipeline. Admin only.
 */
export async function createStage(
  pipeline_id: string,
  name: string,
  color: string = "#5B7FFF"
): Promise<ActionResult<PipelineStage>> {
  const parsed = createStageSchema.safeParse({ pipeline_id, name, color })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  const supabase = await createServerClient()
  const guard = await assertAdmin(supabase)
  if (!guard.ok) return { success: false, error: guard.error }

  // Verificar que o pipeline pertence ao workspace do usuário
  const { data: pipeline } = await supabase
    .from("pipelines")
    .select("id, workspace_id")
    .eq("id", parsed.data.pipeline_id)
    .single()

  if (!pipeline) return { success: false, error: "Pipeline não encontrado" }

  const { count: posCount } = await supabase
    .from("pipeline_stages")
    .select("id", { count: "exact", head: true })
    .eq("pipeline_id", parsed.data.pipeline_id)

  const position = posCount ?? 0

  const { data, error } = await supabase
    .from("pipeline_stages")
    .insert({
      pipeline_id: parsed.data.pipeline_id,
      name: parsed.data.name,
      color: parsed.data.color,
      position,
    })
    .select("id, pipeline_id, name, color, position, created_at")
    .single()

  if (error || !data) {
    return { success: false, error: error?.message ?? "Erro ao criar etapa" }
  }

  revalidatePath("/pipeline")
  revalidatePath("/settings")
  return { success: true, data: data as PipelineStage }
}

/**
 * Edita nome, cor e/ou position de uma stage. Admin only.
 */
export async function updateStage(
  id: string,
  updates: { name?: string; color?: string; position?: number }
): Promise<ActionResult<PipelineStage>> {
  const parsed = updateStageSchema.safeParse({ id, ...updates })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  const supabase = await createServerClient()
  const guard = await assertAdmin(supabase)
  if (!guard.ok) return { success: false, error: guard.error }

  const { id: stageId, ...fields } = parsed.data

  const { data, error } = await supabase
    .from("pipeline_stages")
    .update({
      ...(fields.name !== undefined && { name: fields.name }),
      ...(fields.color !== undefined && { color: fields.color }),
      ...(fields.position !== undefined && { position: fields.position }),
    })
    .eq("id", stageId)
    .select("id, pipeline_id, name, color, position, created_at")
    .single()

  if (error || !data) {
    return { success: false, error: error?.message ?? "Erro ao atualizar etapa" }
  }

  revalidatePath("/pipeline")
  revalidatePath("/settings")
  return { success: true, data: data as PipelineStage }
}

/**
 * Deleta uma stage. Admin only. Não permite se houver deals vinculados.
 */
export async function deleteStage(id: string): Promise<ActionResult> {
  const parsed = z.string().uuid().safeParse(id)
  if (!parsed.success) return { success: false, error: "ID inválido" }

  const supabase = await createServerClient()
  const guard = await assertAdmin(supabase)
  if (!guard.ok) return { success: false, error: guard.error }

  // Verificar se há deals nesta stage
  const { count } = await supabase
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("stage_id", parsed.data)

  if ((count ?? 0) > 0) {
    return {
      success: false,
      error: `Não é possível deletar: há ${count} negócio(s) nesta etapa. Mova-os primeiro.`,
    }
  }

  const { error } = await supabase
    .from("pipeline_stages")
    .delete()
    .eq("id", parsed.data)

  if (error) return { success: false, error: error.message }

  revalidatePath("/pipeline")
  revalidatePath("/settings")
  return { success: true, data: undefined }
}

/**
 * Reordena stages em batch. Admin only.
 */
export async function reorderStages(
  updates: { id: string; position: number }[]
): Promise<ActionResult> {
  const parsed = reorderStagesSchema.safeParse(updates)
  if (!parsed.success) return { success: false, error: "Dados inválidos" }
  if (parsed.data.length === 0) return { success: true, data: undefined }

  const supabase = await createServerClient()
  const guard = await assertAdmin(supabase)
  if (!guard.ok) return { success: false, error: guard.error }

  const results = await Promise.all(
    parsed.data.map(({ id, position }) =>
      supabase
        .from("pipeline_stages")
        .update({ position })
        .eq("id", id)
    )
  )

  const failed = results.find((r) => r.error)
  if (failed?.error) return { success: false, error: failed.error.message }

  revalidatePath("/pipeline")
  revalidatePath("/settings")
  return { success: true, data: undefined }
}

/**
 * Transfere um deal entre pipelines. Qualquer membro pode chamar (não só admin).
 */
export async function transferDeal(
  deal_id: string,
  to_pipeline_id: string,
  to_stage_id: string,
  reason?: string
): Promise<ActionResult> {
  const parsed = transferDealSchema.safeParse({ deal_id, to_pipeline_id, to_stage_id, reason })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  const supabase = await createServerClient()
  const ctx = await getContext(supabase)
  if (!ctx) return { success: false, error: "Não autenticado" }

  // Verificar que a stage pertence ao pipeline destino
  const { data: stage } = await supabase
    .from("pipeline_stages")
    .select("id, pipeline_id")
    .eq("id", parsed.data.to_stage_id)
    .eq("pipeline_id", parsed.data.to_pipeline_id)
    .single()

  if (!stage) {
    return { success: false, error: "Etapa de destino não encontrada ou não pertence ao pipeline" }
  }

  // Calcular posição como último da coluna destino
  const { count } = await supabase
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("stage_id", parsed.data.to_stage_id)

  const { error } = await supabase
    .from("deals")
    .update({
      pipeline_id: parsed.data.to_pipeline_id,
      stage_id: parsed.data.to_stage_id,
      position: count ?? 0,
    })
    .eq("id", parsed.data.deal_id)
    .eq("workspace_id", ctx.workspaceId)

  if (error) return { success: false, error: error.message }

  revalidatePath("/pipeline")
  revalidatePath("/dashboard")
  return { success: true, data: undefined }
}

/**
 * Cria o pipeline de vendas padrão para um workspace recém-criado.
 * Chamado internamente por createWorkspace — não é uma Server Action direta do cliente.
 */
export async function createDefaultSalesPipeline(
  workspaceId: string,
  supabase: SupabaseClient
): Promise<void> {
  const { data: pipeline, error: pipelineError } = await supabase
    .from("pipelines")
    .insert({ workspace_id: workspaceId, name: "Vendas", type: "sales", position: 0 })
    .select("id")
    .single()

  if (pipelineError || !pipeline) {
    console.error("[createDefaultSalesPipeline] Erro ao criar pipeline:", pipelineError)
    return
  }

  const stagesToInsert = DEFAULT_SALES_STAGES.map((s) => ({
    ...s,
    pipeline_id: pipeline.id,
  }))

  const { error: stagesError } = await supabase
    .from("pipeline_stages")
    .insert(stagesToInsert)

  if (stagesError) {
    console.error("[createDefaultSalesPipeline] Erro ao criar stages:", stagesError)
  }
}

/**
 * Cria o pipeline do Agente IA padrão para um workspace.
 * Chamado em createWorkspace e também via migração para workspaces existentes.
 * Idempotente: não cria se já existir um pipeline do tipo "agent".
 */
export async function createDefaultAgentPipeline(
  workspaceId: string,
  supabase: SupabaseClient
): Promise<string | null> {
  // Idempotência: não cria se já existe
  const { data: existing } = await supabase
    .from("pipelines")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("type", "agent")
    .limit(1)
    .single()

  if (existing) return existing.id

  const { data: pipeline, error: pipelineError } = await supabase
    .from("pipelines")
    .insert({ workspace_id: workspaceId, name: "Agente IA", type: "agent", position: 99 })
    .select("id")
    .single()

  if (pipelineError || !pipeline) {
    console.error("[createDefaultAgentPipeline] Erro ao criar pipeline:", pipelineError)
    return null
  }

  const stagesToInsert = DEFAULT_AGENT_STAGES.map((s) => ({
    ...s,
    pipeline_id: pipeline.id,
  }))

  const { error: stagesError } = await supabase
    .from("pipeline_stages")
    .insert(stagesToInsert)

  if (stagesError) {
    console.error("[createDefaultAgentPipeline] Erro ao criar stages:", stagesError)
  }

  return pipeline.id
}
