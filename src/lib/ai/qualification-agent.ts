import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface QualificationResult {
  response: string;
  isQualified: boolean;
  shouldTransfer: boolean;
  leadData: {
    name?: string;
    company?: string;
    teamSize?: string;
    currentCrm?: string;
    interest?: string;
  };
}

const SYSTEM_PROMPT = `Você é um assistente de vendas da EngenharIA, empresa que oferece o Z4P CRM — um CRM inteligente com agente de IA integrado para times de vendas, freelancers e PMEs.

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
- Se receber uma imagem ou documento, comente sobre o conteúdo de forma relevante e continue a qualificação
- Quando tiver nome, empresa, tamanho do time e CRM atual, você tem dados suficientes para qualificar

Ao final da qualificação, se o lead for qualificado, inclua exatamente esta linha no final da sua resposta:
[TRANSFERIR_PARA_VENDEDOR]`;

export async function runQualificationAgent(
  history: ChatMessage[],
  newMessage: string,
  imageUrl?: string
): Promise<QualificationResult> {
  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Monta o conteúdo da mensagem do usuário
  if (imageUrl) {
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64 = Buffer.from(imageBuffer).toString("base64");
    const mimeType = imageResponse.headers.get("content-type") ?? "image/jpeg";

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
    system: SYSTEM_PROMPT,
    messages,
  });

  const responseText =
    response.content[0].type === "text" ? response.content[0].text : "";

  const shouldTransfer = responseText.includes("[TRANSFERIR_PARA_VENDEDOR]");
  const cleanResponse = responseText.replace("[TRANSFERIR_PARA_VENDEDOR]", "").trim();

  const allMessages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: newMessage },
    { role: "assistant", content: responseText },
  ];

  return {
    response: cleanResponse,
    isQualified: shouldTransfer,
    shouldTransfer,
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
