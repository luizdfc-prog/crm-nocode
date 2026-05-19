import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getActiveWorkspaceId } from "@/lib/supabase/active-workspace"

// GET /api/pipeline/stages — lista todas as etapas de todos os pipelines do workspace
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const workspaceId = await getActiveWorkspaceId()
  if (!workspaceId) return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 })

  const { data, error } = await supabase
    .from("pipeline_stages")
    .select("id, name, pipelines(id, name)")
    .eq("pipelines.workspace_id", workspaceId)
    .order("position", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const flat = (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pipeline: (s.pipelines as any)?.name ?? "Pipeline",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pipeline_id: (s.pipelines as any)?.id ?? null,
  }))

  return NextResponse.json(flat)
}
