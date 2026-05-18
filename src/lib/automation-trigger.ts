import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Enfileira execuções de automações para um deal que acabou de entrar numa etapa.
 * Deve ser chamado após createDeal (trigger: on_create → stage_id = null)
 * e após reorderDeals quando stage_id muda (trigger: on_enter → stage_id = novo stage).
 */
export async function triggerAutomations(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  workspaceId: string,
  dealId: string,
  pipelineId: string,
  stageId: string | null,
  isCreate = false
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Buscar automações ativas para esta etapa (ou "Leads de Entrada" se isCreate)
  const baseQuery = db
    .from("pipeline_automations")
    .select("id, trigger_type, trigger_delay_minutes, trigger_daily_time")
    .eq("workspace_id", workspaceId)
    .eq("pipeline_id", pipelineId)
    .eq("active", true)

  const { data: automations, error } = await (
    isCreate
      ? baseQuery.is("stage_id", null)
      : baseQuery.eq("stage_id", stageId ?? "")
  )

  if (error || !automations?.length) return

  const now = new Date()

  const executions = automations.map((a: { id: string; trigger_type: string; trigger_delay_minutes: number | null; trigger_daily_time: string | null }) => {
    let scheduledAt = now.toISOString()

    if (a.trigger_type === "delay" && a.trigger_delay_minutes) {
      scheduledAt = new Date(now.getTime() + a.trigger_delay_minutes * 60 * 1000).toISOString()
    } else if (a.trigger_type === "daily" && a.trigger_daily_time) {
      const [h, m] = (a.trigger_daily_time).split(":").map(Number)
      const next = new Date(now)
      next.setHours(h, m, 0, 0)
      if (next <= now) next.setDate(next.getDate() + 1)
      scheduledAt = next.toISOString()
    } else if (a.trigger_type === "inactivity") {
      scheduledAt = new Date(now.getTime() + 24 * 3600 * 1000).toISOString()
    }

    return {
      automation_id: a.id,
      deal_id: dealId,
      scheduled_at: scheduledAt,
      status: "pending",
    }
  })

  await db
    .from("automation_executions")
    .upsert(executions, { onConflict: "automation_id,deal_id,scheduled_at", ignoreDuplicates: true })
}
