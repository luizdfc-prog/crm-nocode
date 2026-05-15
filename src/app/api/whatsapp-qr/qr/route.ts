import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getBaileysBaseUrl() {
  const url = process.env.BAILEYS_SERVER_URL;
  if (!url) throw new Error("BAILEYS_SERVER_URL não configurado");
  return url.replace(/\/$/, "");
}

// GET /api/whatsapp-qr/qr — retorna QR Code base64 do servidor Baileys
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(`${getBaileysBaseUrl()}/qr`, {
      headers: {
        "x-api-secret": process.env.BAILEYS_API_SECRET ?? "",
      },
      cache: "no-store",
    });

    if (res.status === 204) {
      return NextResponse.json({ status: "connected", qr: null }, { status: 200 });
    }

    if (!res.ok) {
      return NextResponse.json({ error: "Erro ao obter QR Code" }, { status: 502 });
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
