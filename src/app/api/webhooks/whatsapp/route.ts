import { NextRequest, NextResponse } from "next/server";
import { runQualificationAgent, type ChatMessage } from "@/lib/ai/qualification-agent";
import { sendWhatsAppMessage, downloadWhatsAppMedia } from "@/lib/whatsapp/client";
import { transcribeAudio } from "@/lib/ai/whisper";
import { uploadMediaToStorage } from "@/lib/supabase/storage";
import { getServiceClient } from "@/lib/supabase/service";
import { logStageMovement } from "@/lib/deal-stage-log";
import type { AgentConfig } from "@/types";

// Verificação do webhook pela Meta (GET)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// Recebimento de mensagens da Meta Cloud API (POST)
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (body.object !== "whatsapp_business_account") {
    return NextResponse.json({ error: "Invalid object" }, { status: 400 });
  }

  const entries = body.entry ?? [];

  for (const entry of entries) {
    const changes = entry.changes ?? [];
    for (const change of changes) {
      const value = change.value;
      if (!value?.messages?.length) continue;

      const phoneNumberId = value.metadata?.phone_number_id as string;
      const wabaId = entry.id as string;

      for (const message of value.messages) {
        const type = message.type as string;
        if (!["text", "audio", "image", "document", "video"].includes(type)) continue;

        await handleIncomingMessage({
          from: message.from,
          messageId: message.id,
          timestamp: message.timestamp,
          type,
          text: type === "text" ? (message.text?.body ?? "") : null,
          mediaId: message[type]?.id ?? null,
          mimeType: message[type]?.mime_type ?? null,
          caption: message[type]?.caption ?? null,
          filename: message.document?.filename ?? null,
          pushName: value.contacts?.[0]?.profile?.name ?? null,
          phoneNumberId,
          wabaId,
        });
      }
    }
  }

  return NextResponse.json({ status: "ok" });
}

interface IncomingMessage {
  from: string;
  messageId: string;
  timestamp: string;
  type: string;
  text: string | null;
  mediaId: string | null;
  mimeType: string | null;
  caption: string | null;
  filename: string | null;
  pushName: string | null;
  phoneNumberId: string;
  wabaId: string;
}

async function handleIncomingMessage(message: IncomingMessage) {
  const supabase = getServiceClient();

  // Busca workspace + token pelo phone_number_id
  const { data: waAccount } = await supabase
    .from("whatsapp_accounts")
    .select("workspace_id, access_token, phone_number_id")
    .eq("phone_number_id", message.phoneNumberId)
    .eq("status", "active")
    .maybeSingle();

  if (!waAccount) {
    console.error(`[WhatsApp Meta] Nenhuma conta ativa para phone_number_id: ${message.phoneNumberId}`);
    return;
  }

  const workspaceId = waAccount.workspace_id;
  const accessToken = waAccount.access_token;

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, agent_config")
    .eq("id", workspaceId)
    .single();

  if (!workspace) {
    console.error(`[WhatsApp Meta] Workspace não encontrado: ${workspaceId}`);
    return;
  }

  const contactName = message.pushName ?? null;
  const displayName = contactName ?? `WhatsApp ${message.from}`;

  // Busca ou cria lead
  let { data: lead } = await supabase
    .from("leads")
    .select()
    .eq("workspace_id", workspaceId)
    .eq("phone", `+${message.from}`)
    .maybeSingle();

  if (!lead) {
    const { data: newLead } = await supabase
      .from("leads")
      .insert({
        workspace_id: workspaceId,
        name: displayName,
        phone: `+${message.from}`,
        status: "novo",
      })
      .select()
      .single();
    lead = newLead;
  }

  // Busca ou cria conversa
  let { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("phone_number", message.from)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conversation) {
    const { data: newConv } = await supabase
      .from("conversations")
      .insert({
        workspace_id: workspaceId,
        lead_id: lead?.id ?? null,
        phone_number: message.from,
        phone_number_id: message.phoneNumberId,
        ai_active: true,
        last_message_at: new Date().toISOString(),
        unread_count: 1,
        needs_reply: true,
        last_message_content: message.text ?? message.caption ?? `[${message.type}]`,
        last_message_direction: "inbound",
      })
      .select()
      .single();

    conversation = newConv;

    // Cria deal no pipeline do Agente
    if (lead) {
      const { data: agentPipeline } = await supabase
        .from("pipelines")
        .select("id, stages:pipeline_stages(id, name, position)")
        .eq("workspace_id", workspaceId)
        .eq("type", "agent")
        .limit(1)
        .single();

      if (agentPipeline?.stages?.length) {
        const stages = agentPipeline.stages as unknown as { id: string; name: string; position: number }[];
        const firstStage = [...stages].sort((a, b) => a.position - b.position)[0];

        const { count: existing } = await supabase
          .from("deals")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .eq("lead_id", lead.id);

        if (!existing || existing === 0) {
          const { count: colCount } = await supabase
            .from("deals")
            .select("id", { count: "exact", head: true })
            .eq("stage_id", firstStage.id);

          await supabase.from("deals").insert({
            workspace_id: workspaceId,
            title: lead.name ?? `WhatsApp ${message.from}`,
            value: 0,
            stage: "novo_lead",
            pipeline_id: agentPipeline.id,
            stage_id: firstStage.id,
            lead_id: lead.id,
            position: colCount ?? 0,
          });
        }
      }
    }
  } else {
    // Reabre conversa encerrada
    if (conversation.status === "closed") {
      await supabase
        .from("conversations")
        .update({ status: "open", ai_active: true, last_message_at: new Date().toISOString() })
        .eq("id", conversation.id);
      conversation = { ...conversation, status: "open", ai_active: true };
    }

    await supabase
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        unread_count: (conversation.unread_count ?? 0) + 1,
        needs_reply: true,
        last_message_content: message.text ?? message.caption ?? `[${message.type}]`,
        last_message_direction: "inbound",
      })
      .eq("id", conversation.id);
  }

  if (!conversation) return;

  // Se deal em follow-up → volta para Qualificando
  if (conversation.lead_id && conversation.ai_active) {
    const { data: agentPipeline } = await supabase
      .from("pipelines")
      .select("id, stages:pipeline_stages(id, name)")
      .eq("workspace_id", workspaceId)
      .eq("type", "agent")
      .limit(1)
      .maybeSingle();

    if (agentPipeline?.stages) {
      const stages = agentPipeline.stages as unknown as { id: string; name: string }[];
      const qualificandoStage = stages.find((s) => s.name.toLowerCase() === "qualificando");
      const followUpStages = stages.filter((s) => s.name.toLowerCase().includes("follow"));

      if (qualificandoStage && followUpStages.length > 0) {
        const followUpStageIds = followUpStages.map((s) => s.id);
        const { data: dealInFollowUp } = await supabase
          .from("deals")
          .select("id, stage_id")
          .eq("workspace_id", workspaceId)
          .eq("pipeline_id", agentPipeline.id)
          .eq("lead_id", conversation.lead_id)
          .in("stage_id", followUpStageIds)
          .maybeSingle();

        if (dealInFollowUp) {
          const fromStage = followUpStages.find((s) => s.id === dealInFollowUp.stage_id);
          await supabase.from("deals").update({ stage_id: qualificandoStage.id }).eq("id", dealInFollowUp.id);
          await logStageMovement({
            workspaceId,
            dealId: dealInFollowUp.id,
            pipelineId: agentPipeline.id,
            leadId: conversation.lead_id,
            fromStageId: dealInFollowUp.stage_id,
            fromStageName: fromStage?.name ?? null,
            toStageId: qualificandoStage.id,
            toStageName: qualificandoStage.name,
            movedBy: "webhook",
            conversationId: conversation.id,
          });
        }
      }
    }
  }

  // Processa mídia
  let textForAI = message.text;
  let transcription: string | null = null;
  let mediaUrl: string | null = null;

  if (message.mediaId) {
    try {
      const { buffer, mimeType } = await downloadWhatsAppMedia(message.mediaId, accessToken);

      if (message.type === "audio") {
        transcription = await transcribeAudio(buffer, mimeType);
        textForAI = transcription;
      } else {
        const ext = mimeType.split("/")[1]?.split(";")[0] ?? "bin";
        const filename = message.filename ?? `${message.type}-${message.mediaId}.${ext}`;
        mediaUrl = await uploadMediaToStorage(buffer, mimeType, filename);
      }
    } catch (err) {
      console.error("[WhatsApp Meta] Erro ao processar mídia:", err);
      if (message.type === "audio") textForAI = "[Mensagem de áudio — não foi possível transcrever]";
    }
  }

  // Salva mensagem
  await supabase.from("messages").insert({
    conversation_id: conversation.id,
    workspace_id: workspaceId,
    whatsapp_message_id: message.messageId,
    direction: "inbound",
    type: message.type,
    content: message.type === "text" ? message.text : (transcription ?? message.caption ?? `[${message.type}]`),
    media_url: mediaUrl,
    status: "delivered",
  });

  // IA
  const textOrCaption = textForAI ?? message.caption;
  if (conversation.ai_active && textOrCaption) {
    try {
      await processWithAI(supabase, conversation, workspace, textOrCaption, message.type, accessToken, mediaUrl ?? undefined);
    } catch (err) {
      console.error("[WhatsApp Meta] Erro no processamento IA:", err);
    }
  }
}

async function processWithAI(
  supabase: ReturnType<typeof getServiceClient>,
  conversation: { id: string; workspace_id: string; lead_id: string | null; phone_number: string; phone_number_id: string; ai_active: boolean },
  workspace: { id: string; agent_config: unknown },
  textForAI: string,
  messageType: string,
  accessToken: string,
  imageUrl?: string,
) {
  const { data: historyRows } = await supabase
    .from("messages")
    .select("direction, content, type")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true })
    .limit(20);

  const history: ChatMessage[] = (historyRows ?? [])
    .filter((m) => m.content)
    .map((m) => ({
      role: m.direction === "inbound" ? "user" : "assistant",
      content: m.type === "audio" ? `[Áudio transcrito]: ${m.content}` : m.content!,
    }));

  if (history.length > 0 && history[history.length - 1].role === "user") {
    history.pop();
  }

  const agentConfig = workspace.agent_config as AgentConfig | null;

  // Verifica horário de atendimento
  if (agentConfig?.business_hours?.enabled) {
    const bh = agentConfig.business_hours;
    const tz = bh.timezone || "America/Sao_Paulo";
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
    const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
    const currentMinutes = hour * 60 + minute;
    const [startH, startM] = (bh.start || "09:00").split(":").map(Number);
    const [endH, endM] = (bh.end || "18:00").split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if ((currentMinutes < startMinutes || currentMinutes >= endMinutes) && agentConfig.out_of_hours_message) {
      const outMsg = agentConfig.out_of_hours_message;
      await supabase.from("messages").insert({
        conversation_id: conversation.id,
        workspace_id: workspace.id,
        direction: "outbound",
        type: "text",
        content: outMsg,
        status: "sent",
      });
      await sendWhatsAppMessage(conversation.phone_number_id, conversation.phone_number, outMsg, accessToken);
      return;
    }
  }

  const messageForAgent =
    messageType === "audio"
      ? `[Mensagem de áudio transcrita]: ${textForAI}`
      : messageType === "image" && imageUrl && !textForAI
        ? "O cliente enviou uma imagem."
        : textForAI;

  const result = await runQualificationAgent(history, messageForAgent, imageUrl, agentConfig, workspace.id);

  await supabase.from("messages").insert({
    conversation_id: conversation.id,
    workspace_id: workspace.id,
    direction: "outbound",
    type: "text",
    content: result.response,
    status: "sent",
  });

  await sendWhatsAppMessage(conversation.phone_number_id, conversation.phone_number, result.response, accessToken);

  // Move deal Atendimento Iniciado → Qualificando após primeira resposta
  if (conversation.lead_id && conversation.ai_active) {
    const { data: agentPipeline } = await supabase
      .from("pipelines")
      .select("id, stages:pipeline_stages(id, name)")
      .eq("workspace_id", workspace.id)
      .eq("type", "agent")
      .limit(1)
      .single();

    if (agentPipeline?.stages) {
      const stages = agentPipeline.stages as unknown as { id: string; name: string }[];
      const atendimentoStage = stages.find((s) => s.name === "Atendimento Iniciado");
      const qualificandoStage = stages.find((s) => s.name === "Qualificando");

      if (atendimentoStage && qualificandoStage) {
        const { data: dealAI } = await supabase
          .from("deals")
          .select("id, stage_id")
          .eq("workspace_id", workspace.id)
          .eq("lead_id", conversation.lead_id)
          .eq("pipeline_id", agentPipeline.id)
          .eq("stage_id", atendimentoStage.id)
          .limit(1)
          .maybeSingle();

        if (dealAI) {
          await supabase.from("deals").update({ stage_id: qualificandoStage.id }).eq("id", dealAI.id);
          await logStageMovement({
            workspaceId: workspace.id,
            dealId: dealAI.id,
            pipelineId: agentPipeline.id,
            leadId: conversation.lead_id,
            fromStageId: atendimentoStage.id,
            fromStageName: atendimentoStage.name,
            toStageId: qualificandoStage.id,
            toStageName: qualificandoStage.name,
            movedBy: "cron",
            conversationId: conversation.id,
          });
        }
      }
    }
  }

  // shouldTransfer → desativa IA e move deal para pipeline de vendas
  if (result.shouldTransfer && conversation.lead_id) {
    await supabase.from("conversations").update({ ai_active: false }).eq("id", conversation.id);

    if (result.leadData.name) {
      await supabase
        .from("leads")
        .update({ name: result.leadData.name, company: result.leadData.company ?? null, status: "contato" })
        .eq("id", conversation.lead_id);
    }

    const { data: agentPipeline } = await supabase
      .from("pipelines")
      .select("id, stages:pipeline_stages(id, name, position)")
      .eq("workspace_id", workspace.id)
      .eq("type", "agent")
      .limit(1)
      .single();

    if (agentPipeline?.stages) {
      const agentStages = agentPipeline.stages as unknown as { id: string; name: string; position: number }[];
      const transferredStage = agentStages.find((s) => s.name === "Transferido");
      if (transferredStage) {
        const { data: existingDeal } = await supabase
          .from("deals")
          .select("id, pipeline_id")
          .eq("workspace_id", workspace.id)
          .eq("lead_id", conversation.lead_id)
          .eq("pipeline_id", agentPipeline.id)
          .maybeSingle();
        if (existingDeal) {
          await supabase.from("deals").update({ stage_id: transferredStage.id }).eq("id", existingDeal.id);
        }
      }
    }

    const { data: salesPipeline } = await supabase
      .from("pipelines")
      .select("id, stages:pipeline_stages(id, position)")
      .eq("workspace_id", workspace.id)
      .eq("type", "sales")
      .order("position", { ascending: true })
      .limit(1)
      .single();

    if (salesPipeline?.stages) {
      const salesStages = salesPipeline.stages as unknown as { id: string; position: number }[];
      const firstStage = [...salesStages].sort((a, b) => a.position - b.position)[0];
      const { count: destCount } = await supabase
        .from("deals")
        .select("id", { count: "exact", head: true })
        .eq("stage_id", firstStage.id);

      const { data: dealToMove } = await supabase
        .from("deals")
        .select("id")
        .eq("workspace_id", workspace.id)
        .eq("lead_id", conversation.lead_id)
        .maybeSingle();

      if (dealToMove) {
        await supabase
          .from("deals")
          .update({ pipeline_id: salesPipeline.id, stage_id: firstStage.id, stage: "novo_lead", position: destCount ?? 0 })
          .eq("id", dealToMove.id);
      }
    }
  }
}
