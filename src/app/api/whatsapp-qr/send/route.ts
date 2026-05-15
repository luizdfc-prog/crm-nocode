import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

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

const sendTextSchema = z.object({
  to: z.string().min(1),
  text: z.string().min(1),
});

const sendMediaSchema = z.object({
  to: z.string().min(1),
  type: z.enum(["image", "video", "audio", "document"]),
  url: z.string().url(),
  caption: z.string().optional(),
  filename: z.string().optional(),
  mimetype: z.string().optional(),
});

const bodySchema = z.union([sendTextSchema, sendMediaSchema]);

// POST /api/whatsapp-qr/send — proxy de envio para o servidor Baileys
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const body = parsed.data;
  const endpoint = "text" in body ? "/send/text" : "/send/media";

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
