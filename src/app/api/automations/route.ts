import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getActiveWorkspaceId } from "@/lib/supabase/active-workspace"

const automationSchema = z.object({
  pipeline_id: z.string().uuid(),
  stage_id: z.string().uuid().nullable().default(null),
  action_type: z.enum(["salesbot", "add_task", "webhook", "change_stage", "change_user"]),
  trigger_type: z.enum(["immediate", "delay", "daily", "inactivity"]).default("immediate"),
  trigger_delay_minutes: z.number().int().min(0).nullable().optional(),
  trigger_daily_time: z.string().nullable().optional(),
  trigger_inactivity_hours: z.number().int().min(1).nullable().optional(),
  schedule_always: z.boolean().default(true),
  schedule_days: z.array(z.enum(["mon","tue","wed","thu","fri","sat","sun"])).optional(),
  schedule_start: z.string().nullable().optional(),
  schedule_end: z.string().nullable().optional(),
  condition_field: z.string().nullable().optional(),
  condition_op: z.string().nullable().optional(),
  condition_value: z.string().nullable().optional(),
  action_data: z.record(z.string(), z.unknown()).default({}),
  apply_to_existing: z.boolean().default(false),
})

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const workspaceId = await getActiveWorkspaceId()
  if (!workspaceId) return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const pipelineId = searchParams.get("pipeline_id")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  let query = db
    .from("pipeline_automations")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true })

  if (pipelineId) query = query.eq("pipeline_id", pipelineId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const workspaceId = await getActiveWorkspaceId()
  if (!workspaceId) return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 })

  const body = await request.json()
  const parsed = automationSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { apply_to_existing, ...automationData } = parsed.data

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: automation, error } = await db
    .from("pipeline_automations")
    .insert({ ...automationData, workspace_id: workspaceId, apply_to_existing })
    .select()
    .single()

  if (error || !automation) return NextResponse.json({ error: error?.message }, { status: 500 })

  // Se apply_to_existing, agendar execução para todos os deals já na etapa
  if (apply_to_existing && automation.stage_id) {
    const { data: deals } = await supabase
      .from("deals")
      .select("id")
      .eq("stage_id", automation.stage_id)

    if (deals && deals.length > 0) {
      await db.from("automation_executions").insert(
        deals.map((d: { id: string }) => ({
          automation_id: automation.id,
          deal_id: d.id,
          scheduled_at: new Date().toISOString(),
          status: "pending",
        }))
      )
    }
  }

  return NextResponse.json(automation, { status: 201 })
}
