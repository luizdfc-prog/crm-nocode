const WHATSAPP_API_URL = "https://graph.facebook.com/v21.0";

export async function sendWhatsAppMessage(
  phoneNumberId: string,
  to: string,
  text: string
): Promise<void> {
  const response = await fetch(
    `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
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
  caption?: string
): Promise<void> {
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
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
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
  filename: string
): Promise<string> {
  const formData = new FormData();
  formData.append("messaging_product", "whatsapp");
  formData.append("file", new Blob([fileBuffer], { type: mimeType }), filename);
  formData.append("type", mimeType);

  const response = await fetch(
    `${WHATSAPP_API_URL}/${phoneNumberId}/media`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      },
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

export async function downloadWhatsAppMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string }> {
  // Primeiro obtém a URL do arquivo
  const urlResponse = await fetch(`${WHATSAPP_API_URL}/${mediaId}`, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
  });

  if (!urlResponse.ok) throw new Error(`Erro ao obter URL da mídia: ${mediaId}`);
  const { url, mime_type } = await urlResponse.json();

  // Depois baixa o arquivo
  const fileResponse = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
  });

  if (!fileResponse.ok) throw new Error(`Erro ao baixar mídia: ${url}`);

  const arrayBuffer = await fileResponse.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: mime_type as string,
  };
}
