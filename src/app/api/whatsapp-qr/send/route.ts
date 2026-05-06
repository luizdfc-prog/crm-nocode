import { NextRequest, NextResponse } from "next/server";

function getBaileysBaseUrl() {
  const url = process.env.BAILEYS_SERVER_URL;
  if (!url) throw new Error("BAILEYS_SERVER_URL não configurado");
  return url.replace(/\/$/, "");
}

function getBaileysHeaders() {
  return {
    "x-api-secret": process.env.BAILEYS_API_SECRET ?? "",
    "Content-Type": "application/json",
  };
}

// POST /api/whatsapp-qr/send — proxy de envio para o servidor Baileys
// Body: { to, text } | { to, type, url, caption?, filename?, mimetype? }
export async function POST(request: NextRequest) {
  const body = await request.json();

  const endpoint = body.text ? "/send/text" : "/send/media";

  try {
    const res = await fetch(`${getBaileysBaseUrl()}${endpoint}`, {
      method: "POST",
      headers: getBaileysHeaders(),
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Servidor Baileys indisponível" }, { status: 503 });
  }
}
