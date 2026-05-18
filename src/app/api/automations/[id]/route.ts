import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getActiveWorkspaceId } from "@/lib/supabase/active-workspace"

const updateSchema = z.object({
  active: z.boolean().optional(),
  action_data: z.record(z.string(), z.unknown()).optional(),
  trigger_type: z.enum(["immediate", "delay", "daily", "inactivity"]).optional(),
  trigger_delay_minutes: z.number().int().min(0).nullable().optional(),
  trigger_daily_time: z.string().nullable().optional(),
  trigger_inactivity_hours: z.number().int().min(1).nullable().optional(),
  schedule_always: z.boolean().optional(),
  schedule_days: z.array(z.enum(["mon","tue","wed","thu","fri","sat","sun"])).optional(),
  schedule_start: z.string().nullable().optional(),
  schedule_end: z.string().nullable().optional(),
  condition_field: z.string().nullable().optional(),
  condition_op: z.string().nullable().optional(),
  condition_value: z.string().nullable().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const workspaceId = await getActiveWorkspaceId()
  if (!workspaceId) return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 })

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { error } = await db
    .from("pipeline_automations")
    .update(parsed.data)
    .eq("id", id)
    .eq("workspace_id", workspaceId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

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
    .from("pipeline_automations")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
