const WHATSAPP_API_URL = "https://graph.facebook.com/v21.0";

// Busca o token e phone_number_id do workspace no Supabase (server-side)
export async function getWhatsAppAccount(
  supabase: Parameters<typeof import("@supabase/supabase-js").createClient>[0] extends never ? never : ReturnType<typeof import("@/lib/supabase/service").getServiceClient>,
  workspaceId: string
): Promise<{ phoneNumberId: string; accessToken: string } | null> {
  const { data } = await (supabase as ReturnType<typeof import("@/lib/supabase/service").getServiceClient>)
    .from("whatsapp_accounts")
    .select("phone_number_id, access_token")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .maybeSingle();

  if (!data) return null;
  return { phoneNumberId: data.phone_number_id, accessToken: data.access_token };
}

export async function sendWhatsAppMessage(
  phoneNumberId: string,
  to: string,
  text: string,
  accessToken?: string
): Promise<void> {
  const token = accessToken ?? process.env.WHATSAPP_ACCESS_TOKEN;
  const response = await fetch(
    `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`);
  }
}

export async function sendWhatsAppMedia(
  phoneNumberId: string,
  to: string,
  mediaId: string,
  type: "audio" | "image" | "document",
  caption?: string,
  accessToken?: string
): Promise<void> {
  const token = accessToken ?? process.env.WHATSAPP_ACCESS_TOKEN;
  const body: Record<string, unknown> = {
    messaging_product: "whatsapp",
    to,
    type,
    [type]: { id: mediaId, ...(caption ? { caption } : {}) },
  };

  const response = await fetch(
    `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`);
  }
}

export async function uploadWhatsAppMedia(
  phoneNumberId: string,
  fileBuffer: Buffer,
  mimeType: string,
  filename: string,
  accessToken?: string
): Promise<string> {
  const token = accessToken ?? process.env.WHATSAPP_ACCESS_TOKEN;
  const formData = new FormData();
  formData.append("messaging_product", "whatsapp");
  formData.append("file", new Blob([fileBuffer as unknown as BlobPart], { type: mimeType }), filename);
  formData.append("type", mimeType);

  const response = await fetch(
    `${WHATSAPP_API_URL}/${phoneNumberId}/media`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`WhatsApp upload error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  return data.id as string;
}

export async function downloadWhatsAppMedia(
  mediaId: string,
  accessToken?: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  const token = accessToken ?? process.env.WHATSAPP_ACCESS_TOKEN;

  const urlResponse = await fetch(`${WHATSAPP_API_URL}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!urlResponse.ok) throw new Error(`Erro ao obter URL da mídia: ${mediaId}`);
  const { url, mime_type } = await urlResponse.json();

  const fileResponse = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!fileResponse.ok) throw new Error(`Erro ao baixar mídia: ${url}`);

  const arrayBuffer = await fileResponse.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), mimeType: mime_type as string };
}
