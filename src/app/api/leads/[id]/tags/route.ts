import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getActiveWorkspaceId } from "@/lib/supabase/active-workspace"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: leadId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data, error } = await db
    .from("lead_tags")
    .select("id, tag_id, lead_tags_definitions(id, name, color)")
    .eq("lead_id", leadId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

const addSchema = z.object({ tag_id: z.string().uuid() })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: leadId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const workspaceId = await getActiveWorkspaceId()
  if (!workspaceId) return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 })

  const body = await request.json()
  const parsed = addSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data, error } = await db
    .from("lead_tags")
    .upsert({ lead_id: leadId, tag_id: parsed.data.tag_id }, { ignoreDuplicates: true })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: leadId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const tagId = searchParams.get("tag_id")
  if (!tagId) return NextResponse.json({ error: "tag_id obrigatório" }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { error } = await db
    .from("lead_tags")
    .delete()
    .eq("lead_id", leadId)
    .eq("tag_id", tagId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
