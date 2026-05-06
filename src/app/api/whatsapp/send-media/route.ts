import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { uploadWhatsAppMedia, sendWhatsAppMedia } from "@/lib/whatsapp/client";
import { uploadMediaToStorage } from "@/lib/supabase/storage";
import type { Database } from "@/types/database";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const conversationId = formData.get("conversationId") as string | null;

  if (!file || !conversationId) {
    return NextResponse.json({ error: "Arquivo e conversationId são obrigatórios" }, { status: 400 });
  }

  // Busca workspace do usuário
  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("profile_id", user.id)
    .limit(1)
    .single();

  if (!member) return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 });

  // Busca conversa
  const { data: conversation } = await supabase
    .from("conversations")
    .select("phone_number, phone_number_id")
    .eq("id", conversationId)
    .eq("workspace_id", member.workspace_id)
    .single();

  if (!conversation) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type;
  const filename = file.name;

  // Determina tipo
  const type = mimeType.startsWith("audio/") ? "audio"
    : mimeType.startsWith("image/") ? "image"
    : "document";

  // Upload paralelo: Meta (para envio) + Supabase Storage (para exibição no CRM)
  const [mediaId, mediaUrl] = await Promise.all([
    uploadWhatsAppMedia(conversation.phone_number_id, buffer, mimeType, filename),
    uploadMediaToStorage(buffer, mimeType, filename),
  ]);

  // Envia pelo WhatsApp
  await sendWhatsAppMedia(
    conversation.phone_number_id,
    conversation.phone_number,
    mediaId,
    type as "audio" | "image" | "document"
  );

  // Salva mensagem no banco
  const service = createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await service.from("messages").insert({
    conversation_id: conversationId,
    workspace_id: member.workspace_id,
    direction: "outbound",
    type,
    content: filename,
    media_id: mediaId,
    media_url: mediaUrl,
    filename,
    status: "sent",
    sender_id: user.id,
  });

  return NextResponse.json({ ok: true });
}
