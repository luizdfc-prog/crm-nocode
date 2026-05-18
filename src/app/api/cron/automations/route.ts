import { NextRequest, NextResponse } from "next/server"
import { getServiceClient } from "@/lib/supabase/service"

// GET /api/cron/automations — Executa automações pendentes (delay, daily, inactivity).
// Chamado pelo Vercel Cron a cada 5 minutos.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getServiceClient() as any
  const now = new Date().toISOString()
  let processed = 0
  let errors = 0

  // Buscar execuções pendentes cujo scheduled_at já passou
  const { data: pending, error } = await supabase
    .from("automation_executions")
    .select(`
      id, deal_id, automation_id,
      pipeline_automations (
        id, action_type, action_data, workspace_id,
        schedule_always, schedule_days, schedule_start, schedule_end,
        condition_field, condition_op, condition_value
      ),
      deals ( id, lead_id, stage_id, pipeline_id, title,
        leads ( id, name, phone )
      )
    `)
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .limit(50)

  if (error) {
    console.error("[Automations Cron] Erro ao buscar execuções:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  for (const execution of pending ?? []) {
    try {
      await supabase
        .from("automation_executions")
        .update({ status: "running" })
        .eq("id", execution.id)

      const automation = execution.pipeline_automations as Record<string, unknown>
      const deal = execution.deals as Record<string, unknown>

      if (!automation || !deal) {
        await supabase.from("automation_executions").update({ status: "skipped", executed_at: now }).eq("id", execution.id)
        continue
      }

      // Verificar horário de funcionamento
      if (!automation.schedule_always) {
        const inSchedule = checkSchedule(automation)
        if (!inSchedule) {
          await supabase.from("automation_executions").update({ status: "skipped", executed_at: now }).eq("id", execution.id)
          continue
        }
      }

      // Verificar condição
      if (automation.condition_field) {
        const matches = await checkCondition(supabase, deal, automation)
        if (!matches) {
          await supabase.from("automation_executions").update({ status: "skipped", executed_at: now }).eq("id", execution.id)
          continue
        }
      }

      // Executar ação — buscar salesbot_steps se necessário
      let salesbotSteps: Record<string, unknown>[] = []
      const actionData = automation.action_data as Record<string, unknown>
      if (automation.action_type === "salesbot" && actionData?.salesbot_id) {
        const { data: stepsData } = await supabase
          .from("salesbot_steps")
          .select("*")
          .eq("salesbot_id", actionData.salesbot_id)
          .order("position", { ascending: true })
        salesbotSteps = stepsData ?? []
      }

      await executeAction(supabase, automation, deal, salesbotSteps, now)

      await supabase
        .from("automation_executions")
        .update({ status: "done", executed_at: now })
        .eq("id", execution.id)

      processed++
    } catch (err) {
      console.error(`[Automations Cron] Erro na execução ${execution.id}:`, err)
      await supabase
        .from("automation_executions")
        .update({ status: "failed", error: String(err), executed_at: now })
        .eq("id", execution.id)
      errors++
    }
  }

  return NextResponse.json({ ok: true, processed, errors })
}

function checkSchedule(automation: Record<string, unknown>): boolean {
  const now = new Date()
  const dayMap: Record<number, string> = { 0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat" }
  const today = dayMap[now.getDay()]
  const days = automation.schedule_days as string[] ?? []
  if (!days.includes(today)) return false

  if (automation.schedule_start && automation.schedule_end) {
    const [sh, sm] = (automation.schedule_start as string).split(":").map(Number)
    const [eh, em] = (automation.schedule_end as string).split(":").map(Number)
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    const startMinutes = sh * 60 + sm
    const endMinutes = eh * 60 + em
    if (nowMinutes < startMinutes || nowMinutes > endMinutes) return false
  }

  return true
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkCondition(supabase: any, deal: Record<string, unknown>, automation: Record<string, unknown>): Promise<boolean> {
  const field = automation.condition_field as string
  const value = automation.condition_value as string
  const lead = deal.leads as Record<string, string> | null
  if (!lead) return true

  if (field === "source") {
    const { data } = await supabase.from("leads").select("source").eq("id", lead.id).single()
    return data?.source === value
  }

  if (field === "tag") {
    const { data } = await supabase.from("lead_tags").select("tag").eq("lead_id", lead.id).eq("tag", value).maybeSingle()
    return !!data
  }

  if (field?.startsWith("utm_")) {
    const { data } = await supabase.from("leads").select(field).eq("id", lead.id).single()
    return data?.[field] === value
  }

  return true
}

async function executeAction(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  automation: Record<string, unknown>,
  deal: Record<string, unknown>,
  salesbotSteps: Record<string, unknown>[],
  now: string
) {
  const actionType = automation.action_type as string
  const actionData = automation.action_data as Record<string, unknown>
  const lead = deal.leads as Record<string, string> | null

  switch (actionType) {
    case "salesbot": {
      if (!lead?.phone || !salesbotSteps.length) return

      let cumulativeDelay = 0
      for (const step of salesbotSteps) {
        cumulativeDelay += (step.delay_minutes as number) ?? 0
        const scheduledAt = new Date(Date.now() + cumulativeDelay * 60 * 1000).toISOString()

        const message = step.type === "text"
          ? (step.message as string | null)
              ?.replace("{{nome}}", lead.name ?? "")
              ?.replace("{{empresa}}", "")
          : null

        await supabase.from("salesbot_send_queue").insert({
          workspace_id: automation.workspace_id,
          deal_id: deal.id,
          lead_id: lead.id,
          step_id: step.id,
          phone: lead.phone,
          type: step.type,
          message,
          media_url: step.media_url ?? null,
          media_type: step.media_type ?? null,
          scheduled_at: scheduledAt,
          status: "pending",
        })
      }
      break
    }

    case "add_task": {
      const deadlineType = actionData.deadline_type as string ?? "immediate"
      const deadlineValue = actionData.deadline_value as number ?? 0
      let dueDate = now
      if (deadlineType === "hours") dueDate = new Date(Date.now() + deadlineValue * 3600000).toISOString()
      if (deadlineType === "days") dueDate = new Date(Date.now() + deadlineValue * 86400000).toISOString()

      await supabase.from("activities").insert({
        workspace_id: automation.workspace_id,
        lead_id: deal.lead_id,
        type: actionData.type as string ?? "Acompanhar",
        description: actionData.title as string ?? "Tarefa automática",
        notes: actionData.comment as string ?? null,
        due_date: dueDate,
        done: false,
      })
      break
    }

    case "webhook": {
      const url = actionData.url as string
      if (!url) return
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deal_id: deal.id, lead_id: deal.lead_id, pipeline_id: deal.pipeline_id, stage_id: deal.stage_id }),
      }).catch(() => {})
      break
    }

    case "change_stage": {
      const targetStageId = actionData.target_stage_id as string
      if (!targetStageId) return
      await supabase.from("deals").update({ stage_id: targetStageId }).eq("id", deal.id as string)
      break
    }

    case "change_user": {
      const memberId = actionData.member_id as string
      if (!memberId) return
      await supabase.from("deals").update({ owner_id: memberId }).eq("id", deal.id as string)
      break
    }
  }
}
