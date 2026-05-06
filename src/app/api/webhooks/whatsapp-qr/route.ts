import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runQualificationAgent, type ChatMessage } from "@/lib/ai/qualification-agent";
import { transcribeAudio } from "@/lib/ai/whisper";
import { uploadMediaToStorage } from "@/lib/supabase/storage";
import type { Database } from "@/types/database";

// Subconjunto mínimo da estrutura de mensagem do Baileys que usamos aqui
interface BaileysMessage {
  key: { remoteJid?: string | null; id?: string | null; fromMe?: boolean | null; participant?: string | null }
  pushName?: string | null
  message?: {
    conversation?: string | null
    extendedTextMessage?: { text?: string | null } | null
    audioMessage?: { mimetype?: string | null } | null
    imageMessage?: { mimetype?: string | null; caption?: string | null } | null
    documentMessage?: { mimetype?: string | null; fileName?: string | null; caption?: string | null } | null
    videoMessage?: { mimetype?: string | null; caption?: string | null } | null
  } | null
}

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// POST /api/webhooks/whatsapp-qr — recebe mensagens do servidor Baileys
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-baileys-secret");
  if (!process.env.BAILEYS_API_SECRET || secret !== process.env.BAILEYS_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { message, workspace_id } = body as {
    message: BaileysMessage;
    workspace_id: string;
  };

  if (!message || !workspace_id) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  try {
    await handleBaileysMessage(message, workspace_id);
  } catch (err) {
    console.error("[Baileys Webhook] Erro:", err);
  }

  return NextResponse.json({ ok: true });
}

function resolveJid(msg: BaileysMessage): { rawJid: string; phone: string; isGroup: boolean } {
  const rawJid = msg.key.remoteJid ?? ""
  const isGroup = rawJid.endsWith("@g.us")

  if (rawJid.endsWith("@lid")) {
    // @lid: usa o participant (em grupos) ou tenta extrair números do JID
    const participant = msg.key.participant ?? ""
    if (participant.endsWith("@s.whatsapp.net")) {
      const phone = participant.replace("@s.whatsapp.net", "")
      return { rawJid: participant, phone, isGroup: false }
    }
    // Fallback: usa o próprio @lid como identificador
    const phone = rawJid.replace("@lid", "")
    return { rawJid, phone, isGroup: false }
  }

  const phone = rawJid
    .replace(/@s\.whatsapp\.net$/, "")
    .replace(/@g\.us$/, "")

  return { rawJid, phone, isGroup }
}

async function handleBaileysMessage(
  msg: BaileysMessage,
  workspaceId: string,
): Promise<void> {
  const supabase = getServiceClient();

  const { rawJid, phone: from, isGroup } = resolveJid(msg)
  console.log(`[Baileys QR] rawJid=${rawJid} from=${from} isGroup=${isGroup} fromMe=${msg.key.fromMe}`)
  if (!rawJid || !from) { console.log("[Baileys QR] ignorado: sem jid/from"); return; }
  if (rawJid.endsWith("@newsletter")) { console.log("[Baileys QR] ignorado: newsletter"); return; }
  if (isGroup) { console.log("[Baileys QR] ignorado: grupo"); return; }

  // JID de envio: preserva @lid quando aplicável (não converter para @s.whatsapp.net)
  const sendJid = rawJid.includes("@") ? rawJid : `${rawJid}@s.whatsapp.net`

  const msgContent = msg.message;
  if (!msgContent) { console.log("[Baileys QR] ignorado: sem conteúdo"); return; }

  // Ignora mensagens de sistema/protocolo que não têm conteúdo para o usuário
  const IGNORED_TYPES = ["protocolMessage", "reactionMessage", "senderKeyDistributionMessage", "messageContextInfo"]
  const allKeys = Object.keys(msgContent)
  const contentKeys = allKeys.filter(k => !IGNORED_TYPES.includes(k))
  console.log(`[Baileys QR] tipos presentes: ${allKeys.join(", ")} | após filtro: ${contentKeys.join(", ")}`)
  if (contentKeys.length === 0) { console.log("[Baileys QR] ignorado: apenas tipos de sistema"); return; }

  let type: "text" | "audio" | "image" | "document" | "video" = "text";
  let text: string | null = null;
  let mediaBuffer: Buffer | null = null;
  let mimeType: string | null = null;
  let filename: string | null = null;
  let caption: string | null = null;

  if (msgContent.conversation) {
    text = msgContent.conversation;
    type = "text";
  } else if (msgContent.extendedTextMessage) {
    text = msgContent.extendedTextMessage.text ?? null;
    type = "text";
  } else if (msgContent.audioMessage) {
    type = "audio";
    mimeType = msgContent.audioMessage.mimetype ?? "audio/ogg";
  } else if (msgContent.imageMessage) {
    type = "image";
    mimeType = msgContent.imageMessage.mimetype ?? "image/jpeg";
    caption = msgContent.imageMessage.caption ?? null;
  } else if (msgContent.documentMessage) {
    type = "document";
    mimeType = msgContent.documentMessage.mimetype ?? "application/octet-stream";
    filename = msgContent.documentMessage.fileName ?? null;
    caption = msgContent.documentMessage.caption ?? null;
  } else if (msgContent.videoMessage) {
    type = "video";
    mimeType = msgContent.videoMessage.mimetype ?? "video/mp4";
    caption = msgContent.videoMessage.caption ?? null;
  } else if (contentKeys.includes("stickerMessage")) {
    type = "image";
    mimeType = "image/webp";
    caption = "[Figurinha]";
  } else {
    // Tipo não mapeado ainda (templateMessage, buttonsMessage, etc.) — registra mas continua
    console.log(`[Baileys QR] tipo não mapeado: ${contentKeys.join(", ")} — tratando como texto`)
    type = "text";
    text = `[${contentKeys.join(", ")}]`;
  }

  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .select("id, agent_config")
    .eq("id", workspaceId)
    .maybeSingle();

  console.log(`[Baileys QR] workspace: ${workspace?.id ?? "NÃO ENCONTRADO"} erro: ${wsError?.message ?? "ok"} workspaceId recebido: ${workspaceId}`)
  if (!workspace) return;

  const direction = msg.key.fromMe ? "outbound" : "inbound";
  const contactName = msg.pushName ?? null;
  const displayName = contactName ?? `WhatsApp ${from}`;
  const phoneForLead = `+${from}`;
  // Chave normalizada: sempre o número sem sufixo, para evitar duplicatas entre @lid e @s.whatsapp.net
  const conversationKey = from;

  // Busca conversa pelo número normalizado (sem filtrar por status — evita duplicatas ao reabrir conversa encerrada)
  let { data: conversation, error: convFindErr } = await supabase
    .from("conversations")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("phone_number", conversationKey)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Reabre conversa encerrada em vez de criar duplicata
  if (conversation && conversation.status === "closed") {
    await supabase
      .from("conversations")
      .update({ status: "open", last_message_at: new Date().toISOString() })
      .eq("id", conversation.id);
    conversation = { ...conversation, status: "open" };
  }

  console.log(`[Baileys QR] conversa existente: ${conversation?.id ?? "nenhuma"} erro: ${convFindErr?.message ?? "ok"}`)

  if (!conversation) {
    // Busca ou cria lead pelo número de telefone para evitar lead duplicado
    let { data: lead } = await supabase
      .from("leads")
      .select()
      .eq("workspace_id", workspaceId)
      .eq("phone", phoneForLead)
      .maybeSingle();

    if (!lead) {
      const { data: newLead } = await supabase
        .from("leads")
        .insert({
          workspace_id: workspaceId,
          name: displayName,
          phone: phoneForLead,
          status: "novo",
        })
        .select()
        .single();
      lead = newLead;
    }

    const { data: newConv, error: convInsertErr } = await supabase
      .from("conversations")
      .insert({
        workspace_id: workspaceId,
        lead_id: lead?.id ?? null,
        phone_number: conversationKey, // número normalizado sem @lid/@s.whatsapp.net
        phone_number_id: `baileys:${workspaceId}`,
        ai_active: true,
        last_message_at: new Date().toISOString(),
        unread_count: direction === "inbound" ? 1 : 0,
        needs_reply: direction === "inbound",
        last_message_content: text ?? caption ?? `[${type}]`,
        last_message_direction: direction,
      })
      .select()
      .single();

    console.log(`[Baileys QR] nova conversa: ${newConv?.id ?? "FALHOU"} erro: ${convInsertErr?.message ?? "ok"}`)
    conversation = newConv;
  } else {
    await supabase
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        unread_count: direction === "inbound"
          ? (conversation.unread_count ?? 0) + 1
          : conversation.unread_count,
        needs_reply: direction === "inbound" ? true : false,
        last_message_content: text ?? caption ?? `[${type}]`,
        last_message_direction: direction,
      })
      .eq("id", conversation.id);
  }

  if (!conversation) return;

  // Processa mídia
  let textForAI = text;
  let transcription: string | null = null;
  let mediaUrl: string | null = null;

  if (mediaBuffer && mimeType) {
    if (type === "audio") {
      try {
        transcription = await transcribeAudio(mediaBuffer, mimeType);
        textForAI = transcription;
      } catch {
        textForAI = "[Mensagem de áudio — não foi possível transcrever]";
      }
    } else {
      try {
        const ext = mimeType.split("/")[1]?.split(";")[0] ?? "bin";
        const fname = filename ?? `${type}-${Date.now()}.${ext}`;
        mediaUrl = await uploadMediaToStorage(mediaBuffer, mimeType, fname);
      } catch (err) {
        console.error("[Baileys] Erro ao fazer upload de mídia:", err);
      }
    }
  }

  await supabase.from("messages").insert({
    conversation_id: conversation.id,
    workspace_id: workspaceId,
    whatsapp_message_id: msg.key.id ?? null,
    direction,
    type,
    content:
      type === "text"
        ? text
        : transcription ?? caption ?? `[${type}]`,
    media_url: mediaUrl,
    status: direction === "outbound" ? "sent" : "delivered",
  });

  // IA só processa mensagens recebidas (não enviadas por você) e em conversas individuais
  const textOrCaption = textForAI ?? caption;
  if (direction === "inbound" && conversation.ai_active && (textOrCaption || mediaUrl)) {
    await processWithAI(supabase, conversation, workspace, textOrCaption ?? "", type, sendJid, mediaUrl ?? undefined);
  }
}

async function processWithAI(
  supabase: ReturnType<typeof getServiceClient>,
  conversation: {
    id: string;
    workspace_id: string;
    lead_id: string | null;
    phone_number: string;
    phone_number_id: string;
  },
  workspace: { id: string; agent_config: unknown },
  textForAI: string,
  messageType: string,
  sendJid: string,
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

  const messageForAgent =
    messageType === "audio"
      ? `[Mensagem de áudio transcrita]: ${textForAI}`
      : messageType === "image" && imageUrl && !textForAI
        ? "O cliente enviou uma imagem."
        : messageType === "document" && imageUrl && !textForAI
          ? "O cliente enviou um documento."
          : textForAI;

  const result = await runQualificationAgent(history, messageForAgent, imageUrl);

  await supabase.from("messages").insert({
    conversation_id: conversation.id,
    workspace_id: workspace.id,
    direction: "outbound",
    type: "text",
    content: result.response,
    status: "sent",
  });

  // Envia resposta via Baileys — chama o Railway diretamente (evita loop de proxy interno)
  const toJid = sendJid;
  const baileysUrl = process.env.BAILEYS_SERVER_URL?.replace(/\/$/, "");
  const sendRes = await fetch(`${baileysUrl}/send/text`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-secret": process.env.BAILEYS_API_SECRET ?? "",
    },
    body: JSON.stringify({ to: toJid, text: result.response }),
  });
  if (!sendRes.ok) {
    const detail = await sendRes.text().catch(() => "");
    console.error(`[Baileys] Erro ao enviar para ${toJid}: ${sendRes.status} ${detail}`);
  }

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
