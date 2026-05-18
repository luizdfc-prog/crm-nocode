"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import type { DistributorConfig, WhatsAppAccount, Pipeline } from "@/types"

type ActionResult = { success: true } | { success: false; error: string }

const distributorPipelineSchema = z.object({
  pipeline_id: z.string().uuid(),
  weight: z.number().int().min(1).max(100),
})

const distributorConfigSchema = z.object({
  enabled: z.boolean(),
  pipelines: z.array(distributorPipelineSchema).max(20),
})

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "Não autenticado" }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single()

  if (!membership) return { ok: false as const, error: "Workspace não encontrado" }
  if (membership.role !== "admin") return { ok: false as const, error: "Apenas admins podem configurar o distribuidor" }

  return { ok: true as const, supabase, workspaceId: membership.workspace_id }
}

// ── Distribuidor config ───────────────────────────────────────

export async function getDistributorConfig(): Promise<DistributorConfig> {
  const supabase = await createClient()
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
    .select("routing_config")
    .eq("id", membership.workspace_id)
    .single()

  return (workspace?.routing_config as DistributorConfig | null) ?? { enabled: false, pipelines: [] }
}

export async function saveDistributorConfig(input: DistributorConfig): Promise<ActionResult> {
  const parsed = distributorConfigSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  const guard = await assertAdmin()
  if (!guard.ok) return { success: false, error: guard.error }

  // Validar que pesos somam 100 quando ativo e há pipelines
  if (parsed.data.enabled && parsed.data.pipelines.length > 0) {
    const total = parsed.data.pipelines.reduce((sum, p) => sum + p.weight, 0)
    if (total !== 100) {
      return { success: false, error: `A soma dos pesos deve ser 100%. Atual: ${total}%` }
    }
  }

  const { error } = await guard.supabase
    .from("workspaces")
    .update({ routing_config: parsed.data })
    .eq("id", guard.workspaceId)

  if (error) return { success: false, error: error.message }

  revalidatePath("/settings")
  return { success: true }
}

// ── WhatsApp Accounts ─────────────────────────────────────────

export async function getWhatsAppAccounts(): Promise<(WhatsAppAccount & { pipeline?: Pipeline })[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single()

  if (!membership) return []

  const { data } = await supabase
    .from("whatsapp_accounts")
    .select("*, pipeline:pipelines(id, name, type, position, workspace_id, created_at)")
    .eq("workspace_id", membership.workspace_id)
    .order("created_at", { ascending: true })

  return (data ?? []) as (WhatsAppAccount & { pipeline?: Pipeline })[]
}

export async function updateWhatsAppAccount(
  id: string,
  input: { pipeline_id?: string | null; active_in_routing?: boolean }
): Promise<ActionResult> {
  const guard = await assertAdmin()
  if (!guard.ok) return { success: false, error: guard.error }

  const { error } = await guard.supabase
    .from("whatsapp_accounts")
    .update(input)
    .eq("id", id)
    .eq("workspace_id", guard.workspaceId)

  if (error) return { success: false, error: error.message }

  revalidatePath("/settings")
  return { success: true }
}

