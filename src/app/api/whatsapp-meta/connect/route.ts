import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// POST — salva credenciais do Embedded Signup por workspace
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const supabase = getServiceClient();

  // Verifica se é admin do workspace
  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("profile_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!member) return NextResponse.json({ error: "Apenas admins podem conectar o WhatsApp" }, { status: 403 });

  const body = await request.json();
  const { code, phone_number_id, waba_id } = body as {
    code: string;
    phone_number_id: string;
    waba_id: string;
  };

  if (!code || !phone_number_id || !waba_id) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  // Troca o code pelo access_token via Meta API
  const appId = process.env.META_APP_ID!;
  const appSecret = process.env.META_APP_SECRET!;

  const tokenRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${code}`,
  );

  if (!tokenRes.ok) {
    const err = await tokenRes.json();
    console.error("[WhatsApp Meta] Erro ao trocar code por token:", err);
    return NextResponse.json({ error: "Falha ao obter token da Meta" }, { status: 502 });
  }

  const { access_token } = await tokenRes.json() as { access_token: string };

  // Busca informações do número
  let phoneNumber = "";
  let displayName = "";
  try {
    const phoneRes = await fetch(
      `https://graph.facebook.com/v21.0/${phone_number_id}?fields=display_phone_number,verified_name`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    if (phoneRes.ok) {
      const phoneData = await phoneRes.json() as { display_phone_number?: string; verified_name?: string };
      phoneNumber = (phoneData.display_phone_number ?? "").replace(/\D/g, "");
      displayName = phoneData.verified_name ?? "";
    }
  } catch {
    // não crítico — salva mesmo sem esses dados
  }

  // Salva/atualiza no banco
  const { error } = await supabase
    .from("whatsapp_accounts")
    .upsert(
      {
        workspace_id: member.workspace_id,
        phone_number_id,
        phone_number: phoneNumber || phone_number_id,
        display_name: displayName || null,
        access_token,
        waba_id,
        status: "active",
        connected_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" }
    );

  if (error) {
    console.error("[WhatsApp Meta] Erro ao salvar conta:", error);
    return NextResponse.json({ error: "Erro ao salvar configuração" }, { status: 500 });
  }

  // Configura webhook na Meta automaticamente
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? "";
    await fetch(
      `https://graph.facebook.com/v21.0/${waba_id}/subscribed_apps`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          callback_url: `${appUrl}/api/webhooks/whatsapp`,
          verify_token: verifyToken,
          subscribed_fields: ["messages"],
        }),
      }
    );
  } catch {
    // não bloqueia — operador pode configurar manualmente
  }

  return NextResponse.json({ ok: true, phone_number: phoneNumber, display_name: displayName });
}

// PATCH — atualiza phone_number_id e waba_id recebidos via postMessage do Embedded Signup
export async function PATCH(request: NextRequest) {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const supabase = getServiceClient();

  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("profile_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!member) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { phone_number_id, waba_id } = await request.json() as { phone_number_id: string; waba_id: string };
  if (!phone_number_id || !waba_id) return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });

  // Busca informações do número usando o token já salvo
  const { data: existing } = await supabase
    .from("whatsapp_accounts")
    .select("access_token")
    .eq("workspace_id", member.workspace_id)
    .maybeSingle();

  let phoneNumber = "";
  let displayName = "";
  if (existing?.access_token) {
    try {
      const phoneRes = await fetch(
        `https://graph.facebook.com/v21.0/${phone_number_id}?fields=display_phone_number,verified_name`,
        { headers: { Authorization: `Bearer ${existing.access_token}` } }
      );
      if (phoneRes.ok) {
        const d = await phoneRes.json() as { display_phone_number?: string; verified_name?: string };
        phoneNumber = (d.display_phone_number ?? "").replace(/\D/g, "");
        displayName = d.verified_name ?? "";
      }
    } catch { /* não crítico */ }
  }

  await supabase
    .from("whatsapp_accounts")
    .update({
      phone_number_id,
      waba_id,
      ...(phoneNumber && { phone_number: phoneNumber }),
      ...(displayName && { display_name: displayName }),
    })
    .eq("workspace_id", member.workspace_id);

  return NextResponse.json({ ok: true });
}

// DELETE — desconecta o número do workspace
export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const supabase = getServiceClient();

  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("profile_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!member) return NextResponse.json({ error: "Apenas admins podem desconectar" }, { status: 403 });

  await supabase
    .from("whatsapp_accounts")
    .update({ status: "disconnected" })
    .eq("workspace_id", member.workspace_id);

  return NextResponse.json({ ok: true });
}
