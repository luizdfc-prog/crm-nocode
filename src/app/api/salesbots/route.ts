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

const createSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  steps: z.array(stepSchema).default([]),
})

export async function GET() {
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
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const bots = (data ?? []).map((bot: Record<string, unknown>) => ({
    ...bot,
    steps: ((bot.salesbot_steps as { position: number }[] ?? [])).sort((a, b) => a.position - b.position),
  }))

  return NextResponse.json(bots)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const workspaceId = await getActiveWorkspaceId()
  if (!workspaceId) return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 })

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { name, steps } = parsed.data

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: bot, error: botError } = await db
    .from("salesbots")
    .insert({ workspace_id: workspaceId, name })
    .select()
    .single()

  if (botError || !bot) return NextResponse.json({ error: botError?.message }, { status: 500 })

  if (steps.length > 0) {
    const { error: stepsError } = await db
      .from("salesbot_steps")
      .insert(steps.map((s, i) => ({
        salesbot_id: bot.id,
        position: i,
        type: s.type,
        message: s.message ?? null,
        media_url: s.media_url ?? null,
        media_type: s.media_type ?? null,
        delay_minutes: s.delay_minutes,
      })))

    if (stepsError) return NextResponse.json({ error: stepsError.message }, { status: 500 })
  }

  return NextResponse.json(bot, { status: 201 })
}
