import { getServiceClient } from "@/lib/supabase/service"

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
  conversationId?: string
}

// Registra movimentação de etapa e insere mensagem de sistema no chat
export async function logStageMovement(params: LogStageMovementParams): Promise<void> {
  const supabase = getServiceClient()

  // Insere na tabela de logs
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

  // Insere mensagem de sistema no chat (visível como evento no histórico)
  if (params.conversationId) {
    const label =
      params.movedBy === "cron"
        ? `Movido automaticamente: ${params.fromStageName ?? "—"} → ${params.toStageName}`
        : params.movedBy === "webhook"
          ? `Lead respondeu — retornou para: ${params.toStageName}`
          : `Movido para: ${params.toStageName}`

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
