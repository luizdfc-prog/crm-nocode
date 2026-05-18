import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getActiveWorkspaceId } from "@/lib/supabase/active-workspace"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const workspaceId = await getActiveWorkspaceId()
  if (!workspaceId) return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 })

  const { data, error } = await supabase
    .from("workspace_members")
    .select("profile_id, profiles(id, name, email)")
    .eq("workspace_id", workspaceId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type Row = { profiles: { id: string; name: string; email: string } | null }
  const members = (data ?? []).map((m: Row) => m.profiles).filter(Boolean)

  return NextResponse.json(members)
}
