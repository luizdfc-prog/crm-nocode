import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runQualificationAgent, type ChatMessage } from "@/lib/ai/qualification-agent";
import { sendWhatsAppMessage } from "@/lib/whatsapp/client";
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
        if (message.type !== "text") continue;

        await handleIncomingMessage({
          from: message.from,
          messageId: message.id,
          timestamp: message.timestamp,
          text: message.text?.body ?? "",
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
  text: string;
  phoneNumberId: string;
  businessAccountId: string;
}

async function handleIncomingMessage(message: IncomingMessage) {
  console.log("[WhatsApp] Mensagem recebida:", JSON.stringify(message));
  const supabase = getServiceClient();

  let workspaceId: string;
  try {
    workspaceId = await getWorkspaceByPhoneNumberId(supabase, message.phoneNumberId);
  } catch (err) {
    console.error("[WhatsApp] Erro ao encontrar workspace:", err);
    return;
  }

  // Busca workspace pelo phone_number_id
  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .select("id, agent_config")
    .eq("id", workspaceId)
    .single();

  if (wsError) {
    console.error("[WhatsApp] Erro ao buscar workspace:", wsError);
    return;
  }

  if (!workspace) {
    console.error("[WhatsApp] Workspace nulo após busca para id:", workspaceId);
    return;
  }

  console.log("[WhatsApp] Workspace encontrado:", workspace.id);

  // Busca ou cria conversa
  let { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("workspace_id", workspace.id)
    .eq("phone_number", message.from)
    .eq("status", "open")
    .single();

  if (!conversation) {
    console.log("[WhatsApp] Criando novo lead e conversa para:", message.from);
    // Cria lead para o número
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

    const { data: newConversation, error: convError } = await supabase
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
    else console.log("[WhatsApp] Conversa criada:", newConversation?.id);

    conversation = newConversation;
  } else {
    // Atualiza última mensagem e unread count
    await supabase
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        unread_count: (conversation.unread_count ?? 0) + 1,
      })
      .eq("id", conversation.id);
  }

  if (!conversation) return;

  // Salva mensagem recebida
  await supabase.from("messages").insert({
    conversation_id: conversation.id,
    workspace_id: workspace.id,
    whatsapp_message_id: message.messageId,
    direction: "inbound",
    type: "text",
    content: message.text,
    status: "delivered",
  });

  console.log("[WhatsApp] Conversa:", conversation.id, "ai_active:", conversation.ai_active);

  // Se IA está ativa, processa com agente de qualificação
  if (conversation.ai_active) {
    try {
      await processWithAI(supabase, conversation, workspace, message);
    } catch (err) {
      console.error("[WhatsApp] Erro no processamento IA:", err);
    }
  }
}

async function getWorkspaceByPhoneNumberId(
  supabase: ReturnType<typeof getServiceClient>,
  phoneNumberId: string
): Promise<string> {
  // Tenta encontrar pelo phone_number_id em conversas existentes
  const { data: conv } = await supabase
    .from("conversations")
    .select("workspace_id")
    .eq("phone_number_id", phoneNumberId)
    .limit(1)
    .maybeSingle();

  if (conv) return conv.workspace_id;

  // Fallback: pega o primeiro workspace (single-tenant por enquanto)
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
  message: IncomingMessage
) {
  // Busca histórico de mensagens para contexto
  const { data: historyRows } = await supabase
    .from("messages")
    .select("direction, content")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true })
    .limit(20);

  const history: ChatMessage[] = (historyRows ?? [])
    .filter((m) => m.content)
    .map((m) => ({
      role: m.direction === "inbound" ? "user" : "assistant",
      content: m.content!,
    }));

  // Remove a última mensagem do histórico pois será passada como newMessage
  if (history.length > 0 && history[history.length - 1].role === "user") {
    history.pop();
  }

  const result = await runQualificationAgent(history, message.text);

  // Salva resposta da IA
  await supabase.from("messages").insert({
    conversation_id: conversation.id,
    workspace_id: workspace.id,
    direction: "outbound",
    type: "text",
    content: result.response,
    status: "sent",
  });

  // Envia mensagem pelo WhatsApp
  await sendWhatsAppMessage(
    conversation.phone_number_id,
    conversation.phone_number,
    result.response
  );

  // Se qualificado, cria deal no pipeline e desativa IA
  if (result.shouldTransfer && conversation.lead_id) {
    await supabase
      .from("conversations")
      .update({ ai_active: false })
      .eq("id", conversation.id);

    // Atualiza lead com dados extraídos
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

    // Busca primeiro pipeline de vendas
    const { data: pipeline } = await supabase
      .from("pipelines")
      .select("id, stages(id, position)")
      .eq("workspace_id", workspace.id)
      .eq("type", "sales")
      .order("position", { ascending: true })
      .limit(1)
      .single();

    if (pipeline && pipeline.stages && pipeline.stages.length > 0) {
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
