import { NextRequest, NextResponse } from "next/server"
import { getServiceClient } from "@/lib/supabase/service"
import type { AgentConfig, FollowUpConfig, FollowUpStep } from "@/types"

// GET /api/cron/followup — Executa follow-ups automáticos do Agente IA.
// Chamado pelo Vercel Cron a cada 30 minutos.
// Fluxo por workspace:
//   1. Lê follow_up config do agent_config
//   2. Para cada etapa configurada, busca deals parados há >= delay_hours
//   3. Move o deal para a próxima etapa e envia mensagem WhatsApp
//   4. Se não há próxima etapa, move para Fechado Perdido com motivo "Não Respondeu"
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getServiceClient()
  const results: Record<string, unknown>[] = []

  // Busca todos os workspaces que têm pipeline do agente
  const { data: agentPipelines, error: pipelinesErr } = await supabase
    .from("pipelines")
    .select("id, workspace_id")
    .eq("type", "agent")

  if (pipelinesErr || !agentPipelines?.length) {
    return NextResponse.json({ ok: true, processed: 0, results })
  }

  for (const pipeline of agentPipelines) {
    try {
      const processed = await processWorkspaceFollowUp(supabase, pipeline.workspace_id, pipeline.id)
      results.push({ workspace_id: pipeline.workspace_id, ...processed })
    } catch (err) {
      console.error(`[FollowUp Cron] Erro no workspace ${pipeline.workspace_id}:`, err)
      results.push({ workspace_id: pipeline.workspace_id, error: String(err) })
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results })
}

type SupabaseClient = ReturnType<typeof getServiceClient>

interface StageRow {
  id: string
  name: string
  position: number
}

interface DealRow {
  id: string
  lead_id: string | null
  stage_id: string
  updated_at: string
}

interface ConversationRow {
  id: string
  lead_id: string
  jid: string | null
  ai_active: boolean
}

async function processWorkspaceFollowUp(
  supabase: SupabaseClient,
  workspaceId: string,
  pipelineId: string,
): Promise<{ moved: number; skipped: number }> {
  // Lê configuração
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("agent_config")
    .eq("id", workspaceId)
    .single()

  const rawConfig = (workspace?.agent_config as Partial<AgentConfig> | null)?.follow_up
  if (!rawConfig?.enabled || !rawConfig.steps?.length) {
    return { moved: 0, skipped: 0 }
  }

  const followUp: FollowUpConfig = rawConfig

  // Busca todas as etapas do pipeline do agente ordenadas por posição
  const { data: allStages } = await supabase
    .from("pipeline_stages")
    .select("id, name, position")
    .eq("pipeline_id", pipelineId)
    .order("position", { ascending: true })

  if (!allStages?.length) return { moved: 0, skipped: 0 }

  const stagesByName: Record<string, StageRow> = {}
  for (const s of allStages) stagesByName[s.name] = s

  const fechadoPerdidoStage = stagesByName["Fechado Perdido"]

  let moved = 0
  let skipped = 0

  // Processa cada etapa configurada no follow-up
  for (let stepIdx = 0; stepIdx < followUp.steps.length; stepIdx++) {
    const step = followUp.steps[stepIdx]
    const currentStage = stagesByName[step.stage]
    if (!currentStage) continue

    const cutoff = new Date(Date.now() - step.delay_hours * 60 * 60 * 1000).toISOString()

    // Deals parados nesta etapa além do tempo configurado
    const { data: staleDeals } = await supabase
      .from("deals")
      .select("id, lead_id, stage_id, updated_at")
      .eq("workspace_id", workspaceId)
      .eq("pipeline_id", pipelineId)
      .eq("stage_id", currentStage.id)
      .lt("updated_at", cutoff)

    if (!staleDeals?.length) continue

    // Próxima etapa: step seguinte ou Fechado Perdido
    const nextStep = followUp.steps[stepIdx + 1]
    const nextStage = nextStep
      ? stagesByName[nextStep.stage]
      : fechadoPerdidoStage

    if (!nextStage) continue

    const isFinal = !nextStep

    for (const deal of staleDeals as DealRow[]) {
      if (!deal.lead_id) { skipped++; continue }

      // Verifica se há conversa ativa com IA — se vendedor assumiu, não move
      const { data: conv } = await supabase
        .from("conversations")
        .select("id, lead_id, jid, ai_active")
        .eq("workspace_id", workspaceId)
        .eq("lead_id", deal.lead_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!conv) { skipped++; continue }
      if (!conv.ai_active) {
        // Vendedor assumiu — não mexe no deal
        skipped++
        continue
      }

      // Move o deal para a próxima etapa
      await supabase
        .from("deals")
        .update({
          stage_id: nextStage.id,
          stage: isFinal ? "fechado_perdido" : "em_negociacao",
          ...(isFinal ? { lost_reason: "Não Respondeu" } : {}),
        } as Record<string, unknown>)
        .eq("id", deal.id)

      // Envia mensagem/mídia WhatsApp via Baileys
      if (!isFinal && conv.jid) {
        await sendFollowUpNotification(workspaceId, conv as ConversationRow, step)
      }

      moved++
    }
  }

  // Qualificando → Follow-up 01 diretamente após silence_hours sem resposta
  const silenceHours = followUp.silence_hours ?? 2
  const firstFollowUpStep = followUp.steps[0]
  const qualificandoStage = stagesByName["Qualificando"]
  const firstFollowUpStage = firstFollowUpStep ? stagesByName[firstFollowUpStep.stage] : null

  if (qualificandoStage && firstFollowUpStage && firstFollowUpStep) {
    const silenceCutoff = new Date(Date.now() - silenceHours * 60 * 60 * 1000).toISOString()

    const { data: silentDeals } = await supabase
      .from("deals")
      .select("id, lead_id, stage_id, updated_at")
      .eq("workspace_id", workspaceId)
      .eq("pipeline_id", pipelineId)
      .eq("stage_id", qualificandoStage.id)
      .lt("updated_at", silenceCutoff)

    for (const deal of (silentDeals ?? []) as DealRow[]) {
      if (!deal.lead_id) continue

      const { data: conv } = await supabase
        .from("conversations")
        .select("id, lead_id, jid, ai_active")
        .eq("workspace_id", workspaceId)
        .eq("lead_id", deal.lead_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!conv?.ai_active) continue

      await supabase
        .from("deals")
        .update({ stage_id: firstFollowUpStage.id })
        .eq("id", deal.id)

      if (conv.jid) {
        await sendFollowUpNotification(workspaceId, conv as ConversationRow, firstFollowUpStep)
      }

      moved++
    }
  }

  return { moved, skipped }
}

async function sendFollowUpNotification(
  workspaceId: string,
  conv: ConversationRow,
  step: FollowUpStep,
) {
  const supabase = getServiceClient()
  const baileysUrl = process.env.BAILEYS_SERVER_URL?.replace(/\/$/, "")
  if (!baileysUrl || !conv.jid) return

  const hasText = !!step.message?.trim()
  const hasMedia = !!step.media?.url

  if (!hasText && !hasMedia) return

  // Envia texto (se houver)
  if (hasText) {
    await supabase.from("messages").insert({
      conversation_id: conv.id,
      workspace_id: workspaceId,
      direction: "outbound",
      type: "text",
      content: step.message,
      status: "sent",
    })

    const res = await fetch(`${baileysUrl}/send/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-secret": process.env.BAILEYS_API_SECRET ?? "" },
      body: JSON.stringify({ to: conv.jid, text: step.message }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => "")
      console.error(`[FollowUp Cron] Erro texto para ${conv.jid}: ${res.status} ${detail}`)
    }
  }

  // Envia mídia (se houver)
  if (hasMedia && step.media) {
    await supabase.from("messages").insert({
      conversation_id: conv.id,
      workspace_id: workspaceId,
      direction: "outbound",
      type: step.media.type,
      content: step.media.caption ?? step.media.url,
      media_url: step.media.url,
      status: "sent",
    })

    const res = await fetch(`${baileysUrl}/send/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-secret": process.env.BAILEYS_API_SECRET ?? "" },
      body: JSON.stringify({
        to: conv.jid,
        type: step.media.type,
        url: step.media.url,
        caption: step.media.caption ?? "",
        mimetype:
          step.media.type === "image" ? "image/jpeg"
          : step.media.type === "audio" ? "audio/ogg; codecs=opus"
          : "video/mp4",
      }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => "")
      console.error(`[FollowUp Cron] Erro mídia para ${conv.jid}: ${res.status} ${detail}`)
    }
  }
}
