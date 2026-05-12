import Anthropic from "@anthropic-ai/sdk";
import type { AgentConfig } from "@/types";
import { getServiceClient } from "@/lib/supabase/service";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Custo Claude Haiku 4.5 em USD por token (aproximado)
const HAIKU_INPUT_COST  = 0.0000008  // $0.80 / 1M tokens
const HAIKU_OUTPUT_COST = 0.000004   // $4.00 / 1M tokens

async function logAiUsage(workspaceId: string, inputTokens: number, outputTokens: number) {
  try {
    const supabase = getServiceClient()
    const costUsd = inputTokens * HAIKU_INPUT_COST + outputTokens * HAIKU_OUTPUT_COST
    await supabase.from("usage_logs").insert({
      workspace_id: workspaceId,
      event_type: "ai_tokens",
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: costUsd,
    })
  } catch {
    // Não bloqueia o fluxo principal se o log falhar
  }
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface QualificationResult {
  response: string;
  isQualified: boolean;
  shouldTransfer: boolean;
  mediaToSend?: { url: string; type: "image" | "audio" | "video" };
  mediasToSend?: { url: string; type: "image" | "audio" | "video" }[];
  leadData: {
    name?: string;
    company?: string;
    teamSize?: string;
    currentCrm?: string;
    interest?: string;
  };
}

const DEFAULT_SYSTEM_PROMPT = `Você é um assistente de vendas da EngenharIA, empresa que oferece o Z4P CRM — um CRM inteligente com agente de IA integrado para times de vendas, freelancers e PMEs.

Seu objetivo é qualificar leads de forma natural e consultiva, sem parecer um formulário.

Siga este fluxo de qualificação:
1. Saudação calorosa e apresentação breve
2. Pergunte o nome do lead
3. Entenda o problema/necessidade ("O que te trouxe aqui?")
4. Entenda o tamanho do time de vendas
5. Pergunte se já usa algum CRM
6. Se o lead for qualificado (tem time de vendas ou interesse real), diga que vai conectar com um especialista
7. Se não for qualificado, ofereça enviar mais informações

Regras importantes:
- Seja natural, empático e objetivo
- Uma pergunta por vez
- Respostas curtas (máximo 3 linhas)
- Use português brasileiro informal mas profissional
- Nunca invente informações sobre o produto
- Se receber uma imagem, analise o conteúdo e comente de forma relevante, continuando a qualificação
- Se receber "[Mensagem de áudio transcrita]:", responda ao conteúdo como texto normal
- Se receber "[O cliente enviou uma mensagem de áudio]", peça gentilmente para digitar a mensagem
- Quando tiver nome, empresa, tamanho do time e CRM atual, você tem dados suficientes para qualificar

Ao final da qualificação, se o lead for qualificado, inclua exatamente esta linha no final da sua resposta:
[TRANSFERIR_PARA_VENDEDOR]`;

function buildSystemPrompt(config?: AgentConfig | null): string {
  if (!config || !config.prompt) return DEFAULT_SYSTEM_PROMPT;

  const parts: string[] = [config.prompt];

  if (config.knowledge?.trim()) {
    parts.push(`\n## Conhecimento do produto\n${config.knowledge}`);
  }

  if (config.qualification_rules?.trim()) {
    parts.push(`\n## Regras de qualificação\n${config.qualification_rules}`);
  }

  if (config.media_library?.length) {
    const mediaList = config.media_library
      .map((m) => {
        const count = m.files?.length ?? 1
        return `- ID: "${m.id}" | Nome: "${m.name}" (${count} arquivo${count > 1 ? 's' : ''}) | Quando enviar: ${m.description}`
      })
      .join("\n");
    parts.push(
      `\n## Mídias disponíveis para envio\nVocê pode enviar grupos de mídia ao cliente quando julgar pertinente. Cada grupo pode conter múltiplos arquivos — todos serão enviados automaticamente ao usar o ID do grupo.\nPara enviar um grupo, inclua exatamente esta tag no final da sua resposta (apenas uma por mensagem):\n[ENVIAR_MIDIA:ID_DO_GRUPO]\n\nGrupos cadastrados:\n${mediaList}`,
    );
  }

  parts.push(`\n## Instruções obrigatórias\n- Se receber uma imagem, analise o conteúdo e comente de forma relevante, continuando a conversa normalmente.\n- Se receber uma mensagem iniciada por "[Mensagem de áudio transcrita]:", responda ao conteúdo transcrito como se fosse uma mensagem de texto normal — não mencione que foi um áudio, a menos que seja relevante.\n- Se receber "[O cliente enviou uma mensagem de áudio]" (sem transcrição), informe gentilmente que não conseguiu ouvir o áudio e peça para digitar a mensagem.\n- Se receber "[Vídeo enviado pelo cliente]" ou "[Documento enviado pelo cliente]", reconheça o recebimento e continue a conversa.\n- Quando o lead estiver qualificado, inclua exatamente esta linha no final da sua resposta:\n[TRANSFERIR_PARA_VENDEDOR]`);

  return parts.join("\n");
}

export async function runQualificationAgent(
  history: ChatMessage[],
  newMessage: string,
  imageUrl?: string,
  agentConfig?: AgentConfig | null,
  workspaceId?: string,
): Promise<QualificationResult> {
  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Monta o conteúdo da mensagem do usuário
  if (imageUrl) {
    let base64: string
    let mimeType: string

    if (imageUrl.startsWith("data:")) {
      // Data URI inline: data:image/jpeg;base64,<dados>
      const [header, data] = imageUrl.split(",")
      base64 = data
      mimeType = header.split(":")[1]?.split(";")[0] ?? "image/jpeg"
    } else {
      // URL remota: faz download
      const imageResponse = await fetch(imageUrl)
      const imageBuffer = await imageResponse.arrayBuffer()
      base64 = Buffer.from(imageBuffer).toString("base64")
      mimeType = imageResponse.headers.get("content-type") ?? "image/jpeg"
    }

    messages.push({
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            data: base64,
          },
        },
        {
          type: "text",
          text: newMessage || "O cliente enviou esta imagem.",
        },
      ],
    });
  } else {
    messages.push({ role: "user", content: newMessage });
  }

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 500,
    system: buildSystemPrompt(agentConfig),
    messages,
  });

  const responseText =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Registra consumo de tokens para o painel admin
  if (workspaceId) {
    await logAiUsage(workspaceId, response.usage.input_tokens, response.usage.output_tokens)
  }

  const shouldTransfer = responseText.includes("[TRANSFERIR_PARA_VENDEDOR]");

  // Detecta marcador de mídia [ENVIAR_MIDIA:id]
  const mediaMatch = responseText.match(/\[ENVIAR_MIDIA:([^\]]+)\]/);
  const mediaId = mediaMatch?.[1]?.trim();
  const mediaGroup = mediaId && agentConfig?.media_library?.length
    ? agentConfig.media_library.find((m) => m.id === mediaId)
    : undefined;

  // Monta lista de arquivos do grupo (suporte a múltiplos)
  let mediasToSend: { url: string; type: "image" | "audio" | "video" }[] | undefined;
  if (mediaGroup) {
    if (mediaGroup.files?.length) {
      mediasToSend = mediaGroup.files.map((f) => ({ url: f.url, type: f.type }));
    } else if (mediaGroup.url) {
      mediasToSend = [{ url: mediaGroup.url, type: mediaGroup.type }];
    }
  }

  const cleanResponse = responseText
    .replace("[TRANSFERIR_PARA_VENDEDOR]", "")
    .replace(/\[ENVIAR_MIDIA:[^\]]+\]/g, "")
    .trim();

  const allMessages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: newMessage },
    { role: "assistant", content: responseText },
  ];

  return {
    response: cleanResponse,
    isQualified: shouldTransfer,
    shouldTransfer,
    mediaToSend: mediasToSend?.[0],
    mediasToSend,
    leadData: extractLeadData(allMessages),
  };
}

function extractLeadData(messages: { role: string; content: string }[]) {
  const fullText = messages.map((m) => m.content).join(" ");
  const nameMatch = fullText.match(/(?:meu nome é|me chamo|sou o|sou a)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)*)/i);
  const companyMatch = fullText.match(/(?:empresa|trabalho na|trabalho no|sou da|sou do)\s+([A-ZÀ-Ú][^\s,\.]+(?:\s+[A-ZÀ-Ú][^\s,\.]+)*)/i);
  const teamSizeMatch = fullText.match(/(\d+)\s+(?:pessoas|vendedores|colaboradores|funcionários)/i);
  return {
    name: nameMatch?.[1],
    company: companyMatch?.[1],
    teamSize: teamSizeMatch?.[1],
  };
}
