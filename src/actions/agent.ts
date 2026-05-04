"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient as createServerClient } from "@/lib/supabase/server"
import type { AgentConfig } from "@/types"

const businessHoursSchema = z.object({
  enabled: z.boolean(),
  start: z.string().regex(/^\d{2}:\d{2}$/, "Formato inválido — use HH:MM"),
  end: z.string().regex(/^\d{2}:\d{2}$/, "Formato inválido — use HH:MM"),
  timezone: z.string().min(1),
})

const agentConfigSchema = z.object({
  enabled: z.boolean(),
  prompt: z.string().max(5000, "Máximo 5000 caracteres"),
  knowledge: z.string().max(10000, "Máximo 10000 caracteres"),
  qualification_rules: z.string().max(3000, "Máximo 3000 caracteres"),
  business_hours: businessHoursSchema,
  out_of_hours_message: z.string().max(1000, "Máximo 1000 caracteres"),
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

  const { error } = await supabase
    .from("workspaces")
    .update({ agent_config: parsed.data })
    .eq("id", membership.workspace_id)

  if (error) return { success: false, error: error.message }

  revalidatePath("/settings")
  return { success: true }
}
