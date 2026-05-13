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
  conversationId?: string
  // Quando chamado a partir de server actions (cliente autenticado), passa o cliente diretamente
  supabaseClient?: AnySupabaseClient
}

// Registra movimentação de etapa e insere mensagem de sistema no chat
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

  // Insere mensagem de sistema no chat (visível como evento no histórico)
  if (params.conversationId) {
    const movedByLabel =
      params.movedBy === "cron"
        ? `Movido automaticamente: ${params.fromStageName ?? "—"} → ${params.toStageName}`
        : params.movedBy === "webhook"
          ? `Lead respondeu — retornou para: ${params.toStageName}`
          : `Etapa alterada: ${params.fromStageName ?? "—"} → ${params.toStageName}`

    await supabase.from("messages").insert({
      conversation_id: params.conversationId,
      workspace_id: params.workspaceId,
      direction: "outbound",
      type: "system",
      content: movedByLabel,
      status: "sent",
    })
  }
}

// Busca a conversa ativa do lead para passar ao log (usado nas server actions)
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
