import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

// GET /api/whatsapp-qr/status — retorna estado da conexão Baileys
export async function GET() {
  try {
    const res = await fetch(`${getBaileysBaseUrl()}/status`, {
      headers: getBaileysHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Erro ao consultar servidor Baileys" }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Servidor Baileys indisponível", status: "disconnected" },
      { status: 503 },
    );
  }
}

// DELETE /api/whatsapp-qr/status — desconecta o WhatsApp (apenas admins)
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(`${getBaileysBaseUrl()}/status`, {
      method: "DELETE",
      headers: getBaileysHeaders(),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Erro ao desconectar" }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Servidor Baileys indisponível" }, { status: 503 });
  }
}
