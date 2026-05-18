import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getActiveWorkspaceId } from "@/lib/supabase/active-workspace"

const stepSchema = z.object({
  position: z.number().int().min(0),
  type: z.enum(["text", "media"]),
  message: z.string().optional(),
  media_url: z.string().url().optional(),
  media_type: z.enum(["image", "video", "audio"]).optional(),
  delay_minutes: z.number().int().min(0).default(0),
})

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  steps: z.array(stepSchema).optional(),
})

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const workspaceId = await getActiveWorkspaceId()
  if (!workspaceId) return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data, error } = await db
    .from("salesbots")
    .select("*, salesbot_steps(*)")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .single()

  if (error || !data) return NextResponse.json({ error: "Bot não encontrado" }, { status: 404 })

  return NextResponse.json({
    ...data,
    steps: ((data.salesbot_steps ?? []) as { position: number }[]).sort((a, b) => a.position - b.position),
  })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const workspaceId = await getActiveWorkspaceId()
  if (!workspaceId) return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 })

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { name, steps } = parsed.data

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  if (name) {
    const { error } = await db
      .from("salesbots")
      .update({ name })
      .eq("id", id)
      .eq("workspace_id", workspaceId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (steps !== undefined) {
    await db.from("salesbot_steps").delete().eq("salesbot_id", id)

    if (steps.length > 0) {
      const { error } = await db
        .from("salesbot_steps")
        .insert(steps.map((s, i) => ({
          salesbot_id: id,
          position: i,
          type: s.type,
          message: s.message ?? null,
          media_url: s.media_url ?? null,
          media_type: s.media_type ?? null,
          delay_minutes: s.delay_minutes,
        })))

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const workspaceId = await getActiveWorkspaceId()
  if (!workspaceId) return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { error } = await db
    .from("salesbots")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
