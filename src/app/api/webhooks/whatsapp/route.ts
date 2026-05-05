import { NextRequest, NextResponse } from "next/server";

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
        await handleIncomingMessage({
          from: message.from,
          messageId: message.id,
          timestamp: message.timestamp,
          type: message.type,
          text: message.type === "text" ? message.text?.body : null,
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
  phoneNumberId: string;
  businessAccountId: string;
}

async function handleIncomingMessage(message: IncomingMessage) {
  // TODO: buscar workspace pelo phoneNumberId
  // TODO: criar/atualizar lead no CRM
  // TODO: registrar atividade
  // TODO: chamar agente IA e responder
  console.log("[WhatsApp] Mensagem recebida:", message);
}
