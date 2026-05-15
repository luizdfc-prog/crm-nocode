import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ account: null });

  const supabase = getServiceClient();

  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!member) return NextResponse.json({ account: null });

  const { data: account } = await supabase
    .from("whatsapp_accounts")
    .select("phone_number, display_name, status, connected_at")
    .eq("workspace_id", member.workspace_id)
    .eq("status", "active")
    .maybeSingle();

  return NextResponse.json({ account: account ?? null });
}
