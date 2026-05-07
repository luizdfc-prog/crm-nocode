import { NextRequest, NextResponse } from "next/server"
import { getServiceClient } from "@/lib/supabase/service"

// Cron job para manter o Supabase Free ativo (evita pausa automática após 7 dias)
// Agendado em vercel.json para rodar a cada 5 dias
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getServiceClient()
  const { count, error } = await supabase
    .from("workspaces")
    .select("*", { count: "exact", head: true })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, workspaces: count, ts: new Date().toISOString() })
}
