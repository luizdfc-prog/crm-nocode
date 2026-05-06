import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function uploadMediaToStorage(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> {
  const supabase = getServiceClient();
  const path = `${Date.now()}-${filename}`;

  const { error } = await supabase.storage
    .from("whatsapp-media")
    .upload(path, buffer, { contentType: mimeType, upsert: false });

  if (error) throw new Error(`Storage upload error: ${error.message}`);

  const { data } = supabase.storage
    .from("whatsapp-media")
    .getPublicUrl(path);

  return data.publicUrl;
}
