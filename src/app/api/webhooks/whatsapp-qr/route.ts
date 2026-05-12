import { NextRequest, NextResponse } from "next/server";
import { runQualificationAgent, type ChatMessage } from "@/lib/ai/qualification-agent";
import { transcribeAudio } from "@/lib/ai/whisper";
import { uploadMediaToStorage } from "@/lib/supabase/storage";
import { getServiceClient } from "@/lib/supabase/service";
import type { AgentConfig } from "@/types";

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

// Detecta origem do lead pelo texto da primeira mensagem.
// Suporta dois formatos:
//   1. Tag explícita:  [origem:instagram], [origem:google ads], [origem:site]
//   2. Palavras-chave: "vim pelo instagram", "google", "indicação do João", etc.
const ORIGIN_KEYWORDS: { pattern: RegExp; label: string }[] = [
  { pattern: /\[origem:([^\]]+)\]/i, label: "" }, // captura o valor literal da tag
  { pattern: /\b(instagram|insta)\b/i, label: "Instagram" },
  { pattern: /\b(facebook|face|fb)\b/i, label: "Facebook" },
  { pattern: /\b(google|google\s*ads)\b/i, label: "Google" },
  { pattern: /\b(tiktok|tik\s*tok)\b/i, label: "TikTok" },
  { pattern: /\b(youtube|yt)\b/i, label: "YouTube" },
  { pattern: /\b(indica[çc][aã]o|indicado|me\s+indicaram)\b/i, label: "Indicação" },
  { pattern: /\b(site|website|landing\s*page)\b/i, label: "Site" },
  { pattern: /\b(whatsapp|zap)\b/i, label: "WhatsApp" },
  { pattern: /\b(linkedin)\b/i, label: "LinkedIn" },
]

function detectOrigin(text: string | null | undefined): string | null {
  if (!text) return null
  const lower = text.trim()

  // Formato de tag explícita: [origem:valor]
  const tagMatch = lower.match(/\[origem:([^\]]+)\]/i)
  if (tagMatch) return tagMatch[1].trim()

  // Palavras-chave
  for (const { pattern, label } of ORIGIN_KEYWORDS) {
    if (label && pattern.test(lower)) return label
  }

  return null
}

async function saveOriginField(
  supabase: ReturnType<typeof getServiceClient>,
  workspaceId: string,
  leadId: string,
  origin: string,
) {
  // Busca campo de definição com field_key = "origem" no workspace
  const { data: fieldDef } = await supabase
    .from("lead_field_definitions")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("field_key", "origem")
    .maybeSingle()

  if (!fieldDef) return // campo não criado no workspace, não faz nada

  await supabase
    .from("lead_field_values")
    .upsert(
      { workspace_id: workspaceId, lead_id: leadId, field_id: fieldDef.id, value: origin },
      { onConflict: "lead_id,field_id" },
    )
}

// POST /api/webhooks/whatsapp-qr — recebe mensagens do servidor Baileys
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-baileys-secret");
  if (!process.env.BAILEYS_API_SECRET || secret !== process.env.BAILEYS_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { message, workspace_id, media_base64, media_mime_type } = body as {
    message: BaileysMessage;
    workspace_id: string;
    media_base64?: string | null;
    media_mime_type?: string | null;
  };

  if (!message || !workspace_id) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  try {
    await handleBaileysMessage(message, workspace_id, media_base64 ?? null, media_mime_type ?? null);
  } catch (err) {
    console.error("[Baileys Webhook] Erro:", err);
  }

  return NextResponse.json({ ok: true });
}

function resolveJid(msg: BaileysMessage): { rawJid: string; phone: string; isGroup: boolean; isLid: boolean } {
  const rawJid = msg.key.remoteJid ?? ""
  const isGroup = rawJid.endsWith("@g.us")

  if (rawJid.endsWith("@lid")) {
    // @lid: tenta extrair número real do participant
    const participant = msg.key.participant ?? ""
    if (participant.endsWith("@s.whatsapp.net")) {
      const phone = participant.replace("@s.whatsapp.net", "")
      return { rawJid: participant, phone, isGroup: false, isLid: false }
    }
    // Sem número real disponível — usa @lid como chave de deduplicação
    // mas sinaliza que não é um número de telefone válido
    const lidId = rawJid.replace("@lid", "")
    return { rawJid, phone: lidId, isGroup: false, isLid: true }
  }

  const phone = rawJid
    .replace(/@s\.whatsapp\.net$/, "")
    .replace(/@g\.us$/, "")

  return { rawJid, phone, isGroup, isLid: false }
}

async function handleBaileysMessage(
  msg: BaileysMessage,
  workspaceId: string,
  mediaBase64: string | null,
  mediaMimeType: string | null,
): Promise<void> {
  const supabase = getServiceClient();

  const { rawJid, phone: from, isGroup, isLid } = resolveJid(msg)
  console.log(`[Baileys QR] rawJid=${rawJid} from=${from} isGroup=${isGroup} isLid=${isLid} fromMe=${msg.key.fromMe}`)
  if (!rawJid || !from) { console.log("[Baileys QR] ignorado: sem jid/from"); return; }
  if (rawJid.endsWith("@newsletter")) { console.log("[Baileys QR] ignorado: newsletter"); return; }
  if (isGroup) { console.log("[Baileys QR] ignorado: grupo"); return; }
  // @lid sem número real: registra na conversa existente se houver, mas não cria conversa nova
  // (sem número real não dá para responder, mas mídia/áudio deve aparecer no CRM)

  // JID de envio: sempre @s.whatsapp.net — nunca @lid
  const sendJid = `${from}@s.whatsapp.net`

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
  let mediaBuffer: Buffer | null = mediaBase64 ? Buffer.from(mediaBase64, "base64") : null;
  let mimeType: string | null = mediaMimeType ?? null;
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
  // Se for @lid sem número real, não salvar como telefone (evita salvar ID interno como número)
  const phoneForLead = isLid ? null : `+${from}`;
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

  // @lid sem conversa pelo ID numérico: tenta encontrar pelo pushName (nome do contato)
  // Áudios/mídias de contatos conhecidos chegam com @lid mesmo que o texto tenha chegado com número real
  if (!conversation && isLid && contactName) {
    const { data: convsByName } = await supabase
      .from("conversations")
      .select("*, lead:leads(id, name, phone)")
      .eq("workspace_id", workspaceId)
      .order("last_message_at", { ascending: false })
      .limit(50)

    // 1. Tenta match exato pelo nome do lead
    const matchByName = convsByName?.find((c) => {
      const leadName = (c.lead as { name?: string } | null)?.name ?? ""
      return leadName.toLowerCase() === contactName.toLowerCase()
    })
    if (matchByName) {
      console.log(`[Baileys QR] @lid vinculado via pushName "${contactName}" → conversa ${matchByName.id}`)
      conversation = matchByName
    }

    // 2. Tenta match parcial pelo nome (pushName pode ser apelido/primeiro nome)
    if (!conversation && contactName.length >= 3) {
      const matchPartial = convsByName?.find((c) => {
        const leadName = (c.lead as { name?: string } | null)?.name ?? ""
        const firstName = leadName.split(" ")[0].toLowerCase()
        return firstName === contactName.toLowerCase() || leadName.toLowerCase().includes(contactName.toLowerCase())
      })
      if (matchPartial) {
        console.log(`[Baileys QR] @lid vinculado via pushName parcial "${contactName}" → conversa ${matchPartial.id}`)
        conversation = matchPartial
      }
    }

    // 3. Tenta match pelo telefone do lead (últimos 8 dígitos do @lid numérico vs telefone salvo)
    if (!conversation) {
      const lidDigits = from.slice(-8)
      const matchByPhone = convsByName?.find((c) => {
        const leadPhone = ((c.lead as { phone?: string } | null)?.phone ?? "").replace(/\D/g, "")
        return leadPhone.length >= 8 && leadPhone.endsWith(lidDigits)
      })
      if (matchByPhone) {
        console.log(`[Baileys QR] @lid vinculado via sufixo de telefone "${lidDigits}" → conversa ${matchByPhone.id}`)
        conversation = matchByPhone
      }
    }
  }

  // Migração de LID: se não achou pelo número real, verifica se existe conversa antiga com LID
  // (números com 14-15 dígitos que não começam com código de país válido)
  if (!conversation && !isLid && from.length > 13) {
    // Busca por nome do contato para encontrar conversa LID correspondente
    const { data: convsByName } = await supabase
      .from("conversations")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(50);

    const lidConv = convsByName?.find((c) => {
      const pn = c.phone_number ?? "";
      // LIDs são números longos (>13 dígitos) que não começam com código de país
      return pn.length > 13 && !pn.startsWith("55") && c.lead_id != null;
    });

    if (lidConv) {
      // Atualiza conversa LID com o número real
      await supabase
        .from("conversations")
        .update({ phone_number: conversationKey })
        .eq("id", lidConv.id);
      // Atualiza lead com o telefone real
      if (lidConv.lead_id && phoneForLead) {
        await supabase
          .from("leads")
          .update({ phone: phoneForLead })
          .eq("id", lidConv.lead_id);
      }
      conversation = { ...lidConv, phone_number: conversationKey };
      console.log(`[Baileys QR] migração LID: ${lidConv.phone_number} → ${conversationKey}`);
    }
  }

  // Reabre conversa encerrada em vez de criar duplicata
  if (conversation && conversation.status === "closed") {
    await supabase
      .from("conversations")
      .update({ status: "open", last_message_at: new Date().toISOString() })
      .eq("id", conversation.id);
    conversation = { ...conversation, status: "open" };
  }

  console.log(`[Baileys QR] conversa existente: ${conversation?.id ?? "nenhuma"} erro: ${convFindErr?.message ?? "ok"}`)

  // @lid sem número real: sem conversa existente, não cria — não temos como responder
  if (isLid && !conversation) {
    console.log(`[Baileys QR] @lid sem conversa existente — descartando (${rawJid})`)
    return
  }

  if (!conversation) {
    // Busca ou cria lead pelo número de telefone para evitar lead duplicado
    let { data: lead } = await supabase
      .from("leads")
      .select()
      .eq("workspace_id", workspaceId)
      .eq("phone", phoneForLead ?? "")
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

    // Detecta e salva origem do lead pela primeira mensagem
    if (lead && direction === "inbound") {
      const origin = detectOrigin(text ?? caption)
      if (origin) {
        console.log(`[Baileys QR] origem detectada: "${origin}" para lead ${lead.id}`)
        await saveOriginField(supabase, workspaceId, lead.id, origin)
      }
    }

    // Cria deal no pipeline do Agente imediatamente na primeira mensagem inbound
    if (lead && direction === "inbound") {
      const { data: agentPipeline } = await supabase
        .from("pipelines")
        .select("id, stages:pipeline_stages(id, name, position)")
        .eq("workspace_id", workspaceId)
        .eq("type", "agent")
        .limit(1)
        .single();

      if (agentPipeline?.stages?.length) {
        const stages = agentPipeline.stages as unknown as { id: string; name: string; position: number }[]
        const firstStage = [...stages].sort((a, b) => a.position - b.position)[0];

        // Só cria se o lead ainda não tem deal algum (evita duplicata em reconexões)
        const { count: existingDeals } = await supabase
          .from("deals")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .eq("lead_id", lead.id);

        if (!existingDeals || existingDeals === 0) {
          const { count: colCount } = await supabase
            .from("deals")
            .select("id", { count: "exact", head: true })
            .eq("stage_id", firstStage.id);

          await supabase.from("deals").insert({
            workspace_id: workspaceId,
            title: lead.name ?? `WhatsApp ${conversation?.phone_number ?? ""}`,
            value: 0,
            stage: "novo_lead",
            pipeline_id: agentPipeline.id,
            stage_id: firstStage.id,
            lead_id: lead.id,
            position: colCount ?? 0,
          });
          console.log(`[Baileys QR] deal criado no pipeline do agente para lead ${lead.id}`);
        }
      }
    }
  } else {
    // Conversa já existe — atualiza metadados sem mover deal
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

  if (type === "audio") {
    if (mediaBuffer && mimeType) {
      try {
        transcription = await transcribeAudio(mediaBuffer, mimeType);
        textForAI = transcription;
        const audioSeconds = Math.ceil(mediaBuffer.length / 16000)
        void getServiceClient().from("usage_logs").insert({
          workspace_id: workspaceId,
          event_type: "whisper_minutes",
          audio_seconds: audioSeconds,
          cost_usd: (audioSeconds / 60) * 0.006,
        })
      } catch (err) {
        console.error("[Baileys] Erro ao transcrever áudio:", err);
        textForAI = "[Mensagem de áudio — não foi possível transcrever]";
      }
    } else {
      // Áudio chegou sem bytes (download falhou no Baileys) — informa à IA mesmo assim
      textForAI = "[O cliente enviou uma mensagem de áudio]";
    }
  } else if (type !== "text" && mediaBuffer && mimeType) {
    try {
      const ext = mimeType.split("/")[1]?.split(";")[0] ?? "bin";
      const fname = filename ?? `${type}-${Date.now()}.${ext}`;
      mediaUrl = await uploadMediaToStorage(mediaBuffer, mimeType, fname);
    } catch (err) {
      console.error("[Baileys] Erro ao fazer upload de mídia:", err);
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

  // IA só processa mensagens recebidas
  const textOrCaption = textForAI ?? caption;
  // Imagem: URL do storage ou base64 inline
  const imageForAgent = type === "image"
    ? (mediaUrl ?? (mediaBase64 && mimeType ? `data:${mimeType};base64,${mediaBase64}` : undefined))
    : undefined;
  // Para vídeo/documento: passa URL do storage como contexto de texto para a IA
  const mediaContext = (type === "video" || type === "document") && mediaUrl
    ? `[${type === "video" ? "Vídeo" : "Documento"} enviado pelo cliente: ${mediaUrl}]`
    : undefined;
  const contentForAI = textOrCaption ?? mediaContext;
  if (direction === "inbound" && conversation.ai_active && contentForAI) {
    await processWithAI(supabase, conversation, workspace, contentForAI, type, sendJid, imageForAgent);
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
    ai_active: boolean;
  },
  workspace: { id: string; agent_config: AgentConfig | null | unknown },
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
      ? (textForAI.startsWith("[") ? textForAI : `[Mensagem de áudio transcrita]: ${textForAI}`)
      : messageType === "image" && imageUrl && !textForAI
        ? "O cliente enviou uma imagem."
        : textForAI;

  const agentConfig = workspace.agent_config as AgentConfig | null;

  // Verifica horário de atendimento
  if (agentConfig?.business_hours?.enabled) {
    const bh = agentConfig.business_hours;
    const tz = bh.timezone || "America/Sao_Paulo";
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find(p => p.type === "hour")?.value ?? "0", 10);
    const minute = parseInt(parts.find(p => p.type === "minute")?.value ?? "0", 10);
    const currentMinutes = hour * 60 + minute;
    const [startH, startM] = (bh.start || "09:00").split(":").map(Number);
    const [endH, endM] = (bh.end || "18:00").split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const isOutOfHours = currentMinutes < startMinutes || currentMinutes >= endMinutes;

    if (isOutOfHours && agentConfig.out_of_hours_message) {
      const outMsg = agentConfig.out_of_hours_message;
      await supabase.from("messages").insert({
        conversation_id: conversation.id,
        workspace_id: workspace.id,
        direction: "outbound",
        type: "text",
        content: outMsg,
        status: "sent",
      });
      const baileysUrl = process.env.BAILEYS_SERVER_URL?.replace(/\/$/, "");
      await fetch(`${baileysUrl}/send/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-secret": process.env.BAILEYS_API_SECRET ?? "" },
        body: JSON.stringify({ to: sendJid, text: outMsg }),
      });
      return;
    }
  }

  const result = await runQualificationAgent(history, messageForAgent, imageUrl, agentConfig, workspace.id);

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

  // Envia mídias se o agente indicou [ENVIAR_MIDIA:id] — suporta múltiplos arquivos por grupo
  const mediasToSend = result.mediasToSend ?? (result.mediaToSend ? [result.mediaToSend] : []);
  if (mediasToSend.length > 0 && toJid && baileysUrl) {
    for (const media of mediasToSend) {
      const { url, type } = media;
      await supabase.from("messages").insert({
        conversation_id: conversation.id,
        workspace_id: workspace.id,
        direction: "outbound",
        type,
        content: url,
        media_url: url,
        status: "sent",
      });
      await fetch(`${baileysUrl}/send/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-secret": process.env.BAILEYS_API_SECRET ?? "" },
        body: JSON.stringify({
          to: toJid,
          type,
          url,
          caption: "",
          mimetype: type === "image" ? "image/jpeg" : type === "audio" ? "audio/ogg; codecs=opus" : "video/mp4",
        }),
      }).catch((err) => console.error("[Baileys] Erro ao enviar mídia do agente:", err));
    }
  }

  if (result.shouldTransfer && conversation.lead_id) {
    // Se um vendedor já assumiu a conversa, não interfere no pipeline
    if (!conversation.ai_active) {
      console.log(`[Baileys QR] shouldTransfer ignorado — conversa já assumida por vendedor`);
      return;
    }

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

    // Busca o deal existente do lead (deve estar no pipeline do Agente)
    const { data: existingDeal } = await supabase
      .from("deals")
      .select("id, pipeline_id")
      .eq("workspace_id", workspace.id)
      .eq("lead_id", conversation.lead_id)
      .limit(1)
      .single();

    // Marca como "Transferido" no pipeline do Agente antes de mover para Vendas
    if (existingDeal) {
      const { data: agentPipeline } = await supabase
        .from("pipelines")
        .select("id, stages:pipeline_stages(id, name, position)")
        .eq("workspace_id", workspace.id)
        .eq("type", "agent")
        .limit(1)
        .single();

      if (agentPipeline?.stages) {
        const agentStages = agentPipeline.stages as unknown as { id: string; name: string; position: number }[]
        const transferredStage = agentStages.find((s) => s.name === "Transferido");
        if (transferredStage && existingDeal.pipeline_id === agentPipeline.id) {
          await supabase
            .from("deals")
            .update({ stage_id: transferredStage.id })
            .eq("id", existingDeal.id)
            .eq("workspace_id", workspace.id);
        }
      }
    }

    // Seleciona o pipeline de destino via round-robin ponderado (ou fallback para o primeiro sales)
    const targetPipeline = await pickTargetPipeline(supabase, workspace.id);

    if (targetPipeline) {
      const { id: targetPipelineId, stages: targetStages } = targetPipeline;
      const firstStage = [...(targetStages as unknown as { id: string; position: number }[])]
        .sort((a, b) => a.position - b.position)[0];

      const { count: destCount } = await supabase
        .from("deals")
        .select("id", { count: "exact", head: true })
        .eq("stage_id", firstStage.id);

      if (existingDeal) {
        await supabase
          .from("deals")
          .update({
            pipeline_id: targetPipelineId,
            stage_id: firstStage.id,
            stage: "novo_lead",
            position: destCount ?? 0,
          })
          .eq("id", existingDeal.id)
          .eq("workspace_id", workspace.id);
        console.log(`[Baileys QR] deal ${existingDeal.id} movido para pipeline ${targetPipelineId}`);
      } else {
        await supabase.from("deals").insert({
          workspace_id: workspace.id,
          title: `Lead WhatsApp ${conversation.phone_number}`,
          value: 0,
          stage: "novo_lead",
          pipeline_id: targetPipelineId,
          stage_id: firstStage.id,
          lead_id: conversation.lead_id,
          position: destCount ?? 0,
        });
        console.log(`[Baileys QR] deal criado no pipeline ${targetPipelineId} para lead ${conversation.lead_id}`);
      }
    }
  }
}

// ── Distribuição round-robin ponderada ────────────────────────────────────────

type PipelineWithStages = {
  id: string;
  stages: unknown;
}

async function pickTargetPipeline(
  supabase: ReturnType<typeof getServiceClient>,
  workspaceId: string,
): Promise<PipelineWithStages | null> {
  // Lê configuração de routing do workspace
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("agent_config")
    .eq("id", workspaceId)
    .single();

  const routing = (workspace?.agent_config as Partial<AgentConfig> | null)?.routing;

  // Se routing está ativo e tem pipelines configurados, usa round-robin ponderado
  if (routing?.enabled && routing.pipelines?.length) {
    const configuredIds = routing.pipelines.map((p) => p.pipeline_id);

    // Busca contadores atuais
    const { data: counters } = await supabase
      .from("lead_routing_counters")
      .select("pipeline_id, count")
      .eq("workspace_id", workspaceId)
      .in("pipeline_id", configuredIds);

    const countMap: Record<string, number> = {};
    for (const c of (counters ?? [])) countMap[c.pipeline_id] = c.count;

    // Calcula o "déficit" de cada pipeline: quanto está abaixo do seu peso relativo
    // Pipeline com maior déficit recebe o próximo lead
    const totalDelivered = Object.values(countMap).reduce((s, n) => s + n, 0);
    const totalDeliveredPlusOne = totalDelivered + 1;

    let bestPipelineId: string | null = null;
    let bestDeficit = -Infinity;

    for (const entry of routing.pipelines) {
      const delivered = countMap[entry.pipeline_id] ?? 0;
      const expectedFraction = entry.weight / 100;
      const actualFraction = totalDeliveredPlusOne > 0 ? delivered / totalDeliveredPlusOne : 0;
      const deficit = expectedFraction - actualFraction;
      if (deficit > bestDeficit) {
        bestDeficit = deficit;
        bestPipelineId = entry.pipeline_id;
      }
    }

    if (bestPipelineId) {
      // Incrementa o contador (upsert)
      await supabase
        .from("lead_routing_counters")
        .upsert(
          { workspace_id: workspaceId, pipeline_id: bestPipelineId, count: (countMap[bestPipelineId] ?? 0) + 1 },
          { onConflict: "workspace_id,pipeline_id" },
        );

      const { data: pipeline } = await supabase
        .from("pipelines")
        .select("id, stages:pipeline_stages(id, position)")
        .eq("id", bestPipelineId)
        .eq("workspace_id", workspaceId)
        .single();

      if (pipeline) return pipeline as unknown as PipelineWithStages;
    }
  }

  // Fallback: primeiro pipeline de vendas (type = 'sales') por posição
  const { data: fallback } = await supabase
    .from("pipelines")
    .select("id, stages:pipeline_stages(id, position)")
    .eq("workspace_id", workspaceId)
    .eq("type", "sales")
    .order("position", { ascending: true })
    .limit(1)
    .single();

  return fallback ? (fallback as unknown as PipelineWithStages) : null;
}
