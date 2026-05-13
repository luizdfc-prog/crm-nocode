import { getServiceClient } from "@/lib/supabase/service"

type AnySupabaseClient = ReturnType<typeof getServiceClient>

interface LogStageMovementParams {
  workspaceId: string
  dealId: string
  pipelineId: string
  leadId: string | null
  fromStageId: string | null
  fromStageName: string | null
  toStageId: string
  toStageName: string
  movedBy: "cron" | "webhook" | "user"
  movedByName?: string        // nome do usuário quando movedBy === "user"
  conversationId?: string
  supabaseClient?: AnySupabaseClient
}

export async function logStageMovement(params: LogStageMovementParams): Promise<void> {
  const supabase = params.supabaseClient ?? getServiceClient()

  await supabase.from("deal_stage_logs").insert({
    workspace_id: params.workspaceId,
    deal_id: params.dealId,
    pipeline_id: params.pipelineId,
    lead_id: params.leadId,
    from_stage_id: params.fromStageId,
    to_stage_id: params.toStageId,
    from_stage_name: params.fromStageName,
    to_stage_name: params.toStageName,
    moved_by: params.movedBy,
  })

  if (params.conversationId) {
    let label: string
    if (params.movedBy === "cron") {
      label = `Movido automaticamente: ${params.fromStageName ?? "—"} → ${params.toStageName}`
    } else if (params.movedBy === "webhook") {
      label = `Lead respondeu — retornou para: ${params.toStageName}`
    } else {
      const who = params.movedByName ?? "Usuário"
      label = `${who} moveu: ${params.fromStageName ?? "—"} → ${params.toStageName}`
    }

    await supabase.from("messages").insert({
      conversation_id: params.conversationId,
      workspace_id: params.workspaceId,
      direction: "outbound",
      type: "system",
      content: label,
      status: "sent",
    })
  }
}

export async function getLeadConversationId(
  supabase: AnySupabaseClient,
  workspaceId: string,
  leadId: string | null,
): Promise<string | undefined> {
  if (!leadId) return undefined
  const { data } = await supabase
    .from("conversations")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.id ?? undefined
}
