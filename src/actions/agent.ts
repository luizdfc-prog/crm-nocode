"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient as createServerClient } from "@/lib/supabase/server"
import type { AgentConfig, AgentMedia, FollowUpConfig, RoutingConfig } from "@/types"
import { defaultFollowUpConfig } from "@/lib/agent-stages"
import { hasPlanFeature } from "@/lib/plan-features"

const businessHoursSchema = z.object({
  enabled: z.boolean(),
  start: z.string().regex(/^\d{2}:\d{2}$/, "Formato inválido — use HH:MM"),
  end: z.string().regex(/^\d{2}:\d{2}$/, "Formato inválido — use HH:MM"),
  timezone: z.string().min(1),
})

const agentMediaFileSchema = z.object({
  url: z.string().url(),
  type: z.enum(["image", "audio", "video"]),
  filename: z.string().optional(),
})

const agentMediaSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  url: z.string().url(),
  type: z.enum(["image", "audio", "video"]),
  files: z.array(agentMediaFileSchema).optional(),
})

const agentConfigSchema = z.object({
  enabled: z.boolean(),
  prompt: z.string().max(5000, "Máximo 5000 caracteres"),
  knowledge: z.string().max(10000, "Máximo 10000 caracteres"),
  qualification_rules: z.string().max(3000, "Máximo 3000 caracteres"),
  business_hours: businessHoursSchema,
  out_of_hours_message: z.string().max(1000, "Máximo 1000 caracteres"),
  media_library: z.array(agentMediaSchema).max(20).optional(),
})

type ActionResult = { success: true } | { success: false; error: string }

export async function saveAgentConfig(input: AgentConfig): Promise<ActionResult> {
  const parsed = agentConfigSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Não autenticado" }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single()

  if (!membership) return { success: false, error: "Workspace não encontrado" }
  if (membership.role !== "admin") return { success: false, error: "Apenas admins podem alterar a configuração do agente" }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("plan")
    .eq("id", membership.workspace_id)
    .single()

  if (!hasPlanFeature(workspace?.plan ?? "", "ai_agent")) {
    return { success: false, error: "O Agente IA está disponível apenas nos planos Pro IA e Scale IA." }
  }

  const { error } = await supabase
    .from("workspaces")
    .update({ agent_config: parsed.data })
    .eq("id", membership.workspace_id)

  if (error) return { success: false, error: error.message }

  revalidatePath("/settings")
  return { success: true }
}

// ── Follow-up config ──────────────────────────────────────────────────────────

const followUpStepSchema = z.object({
  stage: z.string().min(1),
  enabled: z.boolean(),
  delay_hours: z.number().int().min(1).max(168),
  message: z.string().max(1000),
  media: z.object({
    url: z.string().url(),
    type: z.enum(["image", "audio", "video"]),
    caption: z.string().max(1000).optional(),
  }).optional(),
})

const followUpConfigSchema = z.object({
  silence_hours: z.number().int().min(1).max(168),
  steps: z.array(followUpStepSchema).length(5),
}).refine((data) => {
  // Garante sequência sem buracos: não pode ter etapa desativada seguida de ativada
  let seenDisabled = false
  for (const step of data.steps) {
    if (!step.enabled) { seenDisabled = true; continue }
    if (seenDisabled) return false
  }
  return true
}, { message: "As etapas devem ser ativadas em ordem, sem pular nenhuma" })

export async function getFollowUpConfig(): Promise<FollowUpConfig> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return defaultFollowUpConfig()

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single()

  if (!membership) return defaultFollowUpConfig()

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("agent_config")
    .eq("id", membership.workspace_id)
    .single()

  const raw = (workspace?.agent_config as Partial<AgentConfig> | null)?.follow_up
  return raw ?? defaultFollowUpConfig()
}

export async function saveFollowUpConfig(input: FollowUpConfig): Promise<ActionResult> {
  const parsed = followUpConfigSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Não autenticado" }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single()

  if (!membership) return { success: false, error: "Workspace não encontrado" }
  if (membership.role !== "admin") return { success: false, error: "Apenas admins podem alterar as configurações" }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("agent_config")
    .eq("id", membership.workspace_id)
    .single()

  const currentConfig = (workspace?.agent_config as unknown as Record<string, unknown> | null) ?? {}
  const updatedConfig: Record<string, unknown> = { ...currentConfig, follow_up: parsed.data }

  const { error } = await supabase
    .from("workspaces")
    // follow_up ainda não está nos tipos gerados — cast necessário
    .update({ agent_config: updatedConfig as unknown as import("@/types").AgentConfig })
    .eq("id", membership.workspace_id)

  if (error) return { success: false, error: error.message }

  // Sincroniza etapas do pipeline do agente com as etapas ativas do follow-up
  await syncFollowUpPipelineStages(supabase, membership.workspace_id, parsed.data.steps)

  revalidatePath("/settings")
  revalidatePath("/pipeline")
  return { success: true }
}

async function syncFollowUpPipelineStages(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  workspaceId: string,
  steps: FollowUpConfig["steps"],
) {
  const { data: agentPipeline } = await supabase
    .from("pipelines")
    .select("id, stages:pipeline_stages(id, name, position)")
    .eq("workspace_id", workspaceId)
    .eq("type", "agent")
    .limit(1)
    .maybeSingle()

  if (!agentPipeline) return

  const existingStages = agentPipeline.stages as unknown as { id: string; name: string; position: number }[]

  // Etapas de follow-up que devem existir (ativas)
  const activeNames = steps.filter((s) => s.enabled).map((s) => s.stage)
  // Todas as possíveis etapas de follow-up (01–05)
  const allFollowUpNames = steps.map((s) => s.stage)

  // Calcula posição base: logo após Qualificando (position 1), antes de Transferido (position 98)
  // Cada etapa ativa recebe posição 2, 3, 4... em ordem
  for (let i = 0; i < activeNames.length; i++) {
    const stageName = activeNames[i]
    const targetPosition = 2 + i
    const existing = existingStages.find((s) => s.name === stageName)
    if (existing) {
      if (existing.position !== targetPosition) {
        await supabase
          .from("pipeline_stages")
          .update({ position: targetPosition })
          .eq("id", existing.id)
      }
    } else {
      await supabase.from("pipeline_stages").insert({
        pipeline_id: agentPipeline.id,
        name: stageName,
        color: "#FF6B35",
        position: targetPosition,
      })
    }
  }

  // Remove etapas desativadas (move deals para Qualificando antes)
  const qualificandoStage = existingStages.find((s) => s.name === "Qualificando")
  for (const stageName of allFollowUpNames) {
    if (activeNames.includes(stageName)) continue
    const existing = existingStages.find((s) => s.name === stageName)
    if (!existing) continue

    if (qualificandoStage) {
      await supabase
        .from("deals")
        .update({ stage_id: qualificandoStage.id })
        .eq("stage_id", existing.id)
    }
    await supabase.from("pipeline_stages").delete().eq("id", existing.id)
  }
}


// ── Agent media library upload ────────────────────────────────────────────────

export async function uploadAgentMedia(
  formData: FormData,
): Promise<{ success: true; url: string; type: AgentMedia["type"] } | { success: false; error: string }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Não autenticado" }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single()

  if (!membership) return { success: false, error: "Workspace não encontrado" }
  if (membership.role !== "admin") return { success: false, error: "Apenas admins podem fazer upload" }

  const file = formData.get("file") as File | null
  if (!file) return { success: false, error: "Arquivo não encontrado" }
  if (file.size > 16 * 1024 * 1024) return { success: false, error: "Arquivo muito grande (máx. 16 MB)" }

  const mime = file.type
  let mediaType: AgentMedia["type"]
  if (mime.startsWith("image/")) mediaType = "image"
  else if (mime.startsWith("audio/")) mediaType = "audio"
  else if (mime.startsWith("video/")) mediaType = "video"
  else return { success: false, error: "Tipo não suportado (use imagem, áudio ou vídeo)" }

  const ext = file.name.split(".").pop() ?? "bin"
  const path = `agent-media/${membership.workspace_id}/${Date.now()}.${ext}`
  const buffer = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from("whatsapp-media")
    .upload(path, buffer, { contentType: mime, upsert: false })

  if (uploadError) return { success: false, error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage.from("whatsapp-media").getPublicUrl(path)
  return { success: true, url: publicUrl, type: mediaType }
}

// ── Follow-up media upload ────────────────────────────────────────────────────

export async function uploadFollowUpMedia(
  formData: FormData,
): Promise<{ success: true; url: string; type: "image" | "audio" | "video" } | { success: false; error: string }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Não autenticado" }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single()

  if (!membership) return { success: false, error: "Workspace não encontrado" }
  if (membership.role !== "admin") return { success: false, error: "Apenas admins podem fazer upload" }

  const file = formData.get("file") as File | null
  if (!file) return { success: false, error: "Arquivo não encontrado" }

  const maxBytes = 16 * 1024 * 1024 // 16 MB
  if (file.size > maxBytes) return { success: false, error: "Arquivo muito grande (máx. 16 MB)" }

  const mime = file.type
  let mediaType: "image" | "audio" | "video"
  if (mime.startsWith("image/")) mediaType = "image"
  else if (mime.startsWith("audio/")) mediaType = "audio"
  else if (mime.startsWith("video/")) mediaType = "video"
  else return { success: false, error: "Tipo de arquivo não suportado (use imagem, áudio ou vídeo)" }

  const ext = file.name.split(".").pop() ?? "bin"
  const path = `followup/${membership.workspace_id}/${Date.now()}.${ext}`

  const buffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from("whatsapp-media")
    .upload(path, buffer, { contentType: mime, upsert: false })

  if (uploadError) return { success: false, error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage
    .from("whatsapp-media")
    .getPublicUrl(path)

  return { success: true, url: publicUrl, type: mediaType }
}

// ── Routing config ────────────────────────────────────────────────────────────

const routingPipelineSchema = z.object({
  pipeline_id: z.string().uuid(),
  weight: z.number().int().min(1).max(100),
})

const routingConfigSchema = z.object({
  enabled: z.boolean(),
  pipelines: z.array(routingPipelineSchema).max(20),
})

export async function getRoutingConfig(): Promise<RoutingConfig> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { enabled: false, pipelines: [] }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single()

  if (!membership) return { enabled: false, pipelines: [] }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("agent_config")
    .eq("id", membership.workspace_id)
    .single()

  return (workspace?.agent_config as Partial<AgentConfig> | null)?.routing
    ?? { enabled: false, pipelines: [] }
}

export async function saveRoutingConfig(input: RoutingConfig): Promise<ActionResult> {
  const parsed = routingConfigSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  // Valida que os pesos somam 100 quando há pipelines configurados
  if (parsed.data.enabled && parsed.data.pipelines.length > 0) {
    const total = parsed.data.pipelines.reduce((s, p) => s + p.weight, 0)
    if (total !== 100) {
      return { success: false, error: `A soma das porcentagens deve ser 100% (atual: ${total}%)` }
    }
  }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Não autenticado" }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single()

  if (!membership) return { success: false, error: "Workspace não encontrado" }
  if (membership.role !== "admin") return { success: false, error: "Apenas admins podem alterar as configurações" }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("agent_config")
    .eq("id", membership.workspace_id)
    .single()

  const currentConfig = (workspace?.agent_config as unknown as Record<string, unknown> | null) ?? {}
  const updatedConfig: Record<string, unknown> = { ...currentConfig, routing: parsed.data }

  const { error } = await supabase
    .from("workspaces")
    .update({ agent_config: updatedConfig as unknown as import("@/types").AgentConfig })
    .eq("id", membership.workspace_id)

  if (error) return { success: false, error: error.message }

  revalidatePath("/settings")
  return { success: true }
}
