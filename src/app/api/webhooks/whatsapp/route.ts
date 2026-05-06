import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runQualificationAgent, type ChatMessage } from "@/lib/ai/qualification-agent";
import { sendWhatsAppMessage, downloadWhatsAppMedia } from "@/lib/whatsapp/client";
import { transcribeAudio } from "@/lib/ai/whisper";
import type { Database } from "@/types/database";

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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

// Recebimento de mensagens da Meta (POST)
export async function POST(request: NextRequest) {
  console.log("[WhatsApp] POST recebido — v5");
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
          phoneNumberId: value.metadata?.phone_number_id,
          businessAccountId: entry.id,
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
  phoneNumberId: string;
  businessAccountId: string;
}

async function handleIncomingMessage(message: IncomingMessage) {
  console.log("[WhatsApp] Mensagem recebida:", message.type, "de:", message.from);
  const supabase = getServiceClient();

  let workspaceId: string;
  try {
    workspaceId = await getWorkspaceByPhoneNumberId(supabase, message.phoneNumberId);
  } catch (err) {
    console.error("[WhatsApp] Erro ao encontrar workspace:", err);
    return;
  }

  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .select("id, agent_config")
    .eq("id", workspaceId)
    .single();

  if (wsError || !workspace) {
    console.error("[WhatsApp] Workspace não encontrado:", wsError);
    return;
  }

  // Busca ou cria conversa
  let { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("workspace_id", workspace.id)
    .eq("phone_number", message.from)
    .eq("status", "open")
    .maybeSingle();

  if (!conversation) {
    console.log("[WhatsApp] Criando lead e conversa para:", message.from);
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        workspace_id: workspace.id,
        name: `WhatsApp ${message.from}`,
        phone: `+${message.from}`,
        status: "novo",
      })
      .select()
      .single();

    if (leadError) console.error("[WhatsApp] Erro ao criar lead:", leadError);

    const { data: newConv, error: convError } = await supabase
      .from("conversations")
      .insert({
        workspace_id: workspace.id,
        lead_id: lead?.id ?? null,
        phone_number: message.from,
        phone_number_id: message.phoneNumberId,
        ai_active: true,
        last_message_at: new Date().toISOString(),
        unread_count: 1,
      })
      .select()
      .single();

    if (convError) console.error("[WhatsApp] Erro ao criar conversa:", convError);
    else console.log("[WhatsApp] Conversa criada:", newConv?.id);

    conversation = newConv;
  } else {
    await supabase
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        unread_count: (conversation.unread_count ?? 0) + 1,
      })
      .eq("id", conversation.id);
  }

  if (!conversation) return;

  // Processa mídia se necessário
  let textForAI = message.text;
  let transcription: string | null = null;
  let mediaUrl: string | null = null;

  if (message.mediaId && message.type === "audio") {
    try {
      const { buffer, mimeType } = await downloadWhatsAppMedia(message.mediaId);
      transcription = await transcribeAudio(buffer, mimeType);
      textForAI = transcription;
      console.log("[WhatsApp] Áudio transcrito:", transcription);
    } catch (err) {
      console.error("[WhatsApp] Erro ao transcrever áudio:", err);
      textForAI = "[Mensagem de áudio — não foi possível transcrever]";
    }
  }

  // Salva mensagem
  await supabase.from("messages").insert({
    conversation_id: conversation.id,
    workspace_id: workspace.id,
    whatsapp_message_id: message.messageId,
    direction: "inbound",
    type: message.type,
    content: message.type === "text" ? message.text : (transcription ?? message.caption ?? `[${message.type}]`),
    media_id: message.mediaId,
    media_url: mediaUrl,
    status: "delivered",
  });

  console.log("[WhatsApp] Conversa:", conversation.id, "ai_active:", conversation.ai_active);

  // Processa com IA se ativa e há texto
  if (conversation.ai_active && textForAI) {
    try {
      await processWithAI(supabase, conversation, workspace, textForAI, message.type);
    } catch (err) {
      console.error("[WhatsApp] Erro no processamento IA:", err);
    }
  }
}

async function getWorkspaceByPhoneNumberId(
  supabase: ReturnType<typeof getServiceClient>,
  phoneNumberId: string
): Promise<string> {
  const { data: conv } = await supabase
    .from("conversations")
    .select("workspace_id")
    .eq("phone_number_id", phoneNumberId)
    .limit(1)
    .maybeSingle();

  if (conv) return conv.workspace_id;

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (workspace) return workspace.id;
  throw new Error(`Workspace não encontrado para phoneNumberId: ${phoneNumberId}`);
}

async function processWithAI(
  supabase: ReturnType<typeof getServiceClient>,
  conversation: { id: string; workspace_id: string; lead_id: string | null; phone_number: string; phone_number_id: string },
  workspace: { id: string; agent_config: unknown },
  textForAI: string,
  messageType: string
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

  const messageForAgent = messageType === "audio"
    ? `[Mensagem de áudio transcrita]: ${textForAI}`
    : textForAI;

  const result = await runQualificationAgent(history, messageForAgent);

  await supabase.from("messages").insert({
    conversation_id: conversation.id,
    workspace_id: workspace.id,
    direction: "outbound",
    type: "text",
    content: result.response,
    status: "sent",
  });

  await sendWhatsAppMessage(
    conversation.phone_number_id,
    conversation.phone_number,
    result.response
  );

  if (result.shouldTransfer && conversation.lead_id) {
    await supabase
      .from("conversations")
      .update({ ai_active: false })
      .eq("id", conversation.id);

    if (result.leadData.name) {
      await supabase
        .from("leads")
        .update({
          name: result.leadData.name,
          company: result.leadData.company ?? null,
          status: "contato",
        })
        .eq("id", conversation.lead_id);
    }

    const { data: pipeline } = await supabase
      .from("pipelines")
      .select("id, stages(id, position)")
      .eq("workspace_id", workspace.id)
      .eq("type", "sales")
      .order("position", { ascending: true })
      .limit(1)
      .single();

    if (pipeline?.stages?.length) {
      const firstStage = [...pipeline.stages].sort((a, b) => a.position - b.position)[0];
      await supabase.from("deals").insert({
        workspace_id: workspace.id,
        title: `Lead WhatsApp ${conversation.phone_number}`,
        value: 0,
        stage: "novo_lead",
        pipeline_id: pipeline.id,
        stage_id: firstStage.id,
        lead_id: conversation.lead_id,
        position: 0,
      });
    }
  }
}
