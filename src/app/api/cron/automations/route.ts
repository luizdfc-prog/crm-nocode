import { NextRequest, NextResponse } from "next/server"
import { getServiceClient } from "@/lib/supabase/service"
import { getWhatsAppAccount, sendWhatsAppMessage, sendWhatsAppMedia } from "@/lib/whatsapp/client"

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

  // Processar fila de envio de mensagens do salesbot
  const { sent, sendErrors } = await processSendQueue(supabase, now)

  return NextResponse.json({ ok: true, processed, errors, sent, sendErrors })
}

async function processSendQueue(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  now: string
): Promise<{ sent: number; sendErrors: number }> {
  let sent = 0
  let sendErrors = 0

  const { data: queue } = await supabase
    .from("salesbot_send_queue")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .limit(30)

  for (const item of queue ?? []) {
    try {
      // Buscar credenciais WhatsApp do workspace
      const account = await getWhatsAppAccount(supabase, item.workspace_id)
      if (!account) {
        await supabase.from("salesbot_send_queue")
          .update({ status: "failed", error: "Sem conta WhatsApp ativa" })
          .eq("id", item.id)
        sendErrors++
        continue
      }

      const { phoneNumberId, accessToken } = account

      if (item.type === "text" && item.message) {
        await sendWhatsAppMessage(phoneNumberId, item.phone, item.message, accessToken)
      } else if (item.type === "media" && item.media_url) {
        const mediaType = item.media_type as "image" | "video" | "audio"
        const GRAPH_URL = "https://graph.facebook.com/v21.0"
        const body: Record<string, unknown> = {
          messaging_product: "whatsapp",
          to: item.phone,
          type: mediaType,
          [mediaType]: { link: item.media_url },
        }
        const res = await fetch(`${GRAPH_URL}/${phoneNumberId}/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(JSON.stringify(err))
        }
      } else if (item.type === "action" && item.action_config) {
        await executeSalesbotAction(supabase, item)
      } else {
        await supabase.from("salesbot_send_queue")
          .update({ status: "failed", error: "Passo sem conteúdo válido", sent_at: now })
          .eq("id", item.id)
        sendErrors++
        continue
      }

      await supabase.from("salesbot_send_queue")
        .update({ status: "sent", sent_at: now })
        .eq("id", item.id)
      sent++
    } catch (err) {
      console.error(`[SendQueue] Erro no item ${item.id}:`, err)
      await supabase.from("salesbot_send_queue")
        .update({ status: "failed", error: String(err) })
        .eq("id", item.id)
      sendErrors++
    }
  }

  return { sent, sendErrors }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeSalesbotAction(supabase: any, item: Record<string, unknown>) {
  const cfg = item.action_config as Record<string, unknown>
  const action = cfg.action as string
  const dealId = item.deal_id as string
  const leadId = item.lead_id as string

  // Buscar deal para ter workspace_id e stage/pipeline
  const { data: deal } = await supabase.from("deals").select("workspace_id, pipeline_id, stage_id, lead_id").eq("id", dealId).single()
  if (!deal) return

  const workspaceId = deal.workspace_id as string
  const now = new Date().toISOString()

  switch (action) {
    case "add_note": {
      const note = cfg.note as string
      if (!note) return
      await supabase.from("activities").insert({
        workspace_id: workspaceId, lead_id: leadId,
        type: "Nota", description: note, done: true, due_date: now,
      })
      break
    }
    case "add_task": {
      const deadlineType = (cfg.deadline_type as string) ?? "immediate"
      const deadlineValue = (cfg.deadline_value as number) ?? 0
      let dueDate = now
      if (deadlineType === "hours") dueDate = new Date(Date.now() + deadlineValue * 3600000).toISOString()
      if (deadlineType === "days") dueDate = new Date(Date.now() + deadlineValue * 86400000).toISOString()
      await supabase.from("activities").insert({
        workspace_id: workspaceId, lead_id: leadId,
        type: (cfg.task_type as string) ?? "Acompanhar",
        description: "Tarefa automática via salesbot",
        notes: (cfg.comment as string) ?? null,
        due_date: dueDate, done: false,
      })
      break
    }
    case "set_field": {
      const fieldId = cfg.field_id as string
      const fieldValue = cfg.field_value as string
      if (!fieldId) return
      await supabase.from("lead_field_values").upsert({
        workspace_id: workspaceId, lead_id: leadId, field_id: fieldId, value: fieldValue,
      }, { onConflict: "workspace_id,lead_id,field_id" })
      break
    }
    case "webhook": {
      const url = cfg.url as string
      if (!url) return
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deal_id: dealId, lead_id: leadId, workspace_id: workspaceId }),
      }).catch(() => {})
      break
    }
    case "manage_tags": {
      const tagId = cfg.tag_id as string
      const tagAction = (cfg.tag_action as string) ?? "add"
      if (!tagId) return
      if (tagAction === "add") {
        await supabase.from("lead_tags").upsert({ lead_id: leadId, tag_id: tagId }, { ignoreDuplicates: true })
      } else {
        await supabase.from("lead_tags").delete().eq("lead_id", leadId).eq("tag_id", tagId)
      }
      break
    }
    case "change_stage": {
      const stageId = cfg.stage_id as string
      if (!stageId) return
      await supabase.from("deals").update({ stage_id: stageId }).eq("id", dealId)
      break
    }
    case "change_user": {
      const memberId = cfg.member_id as string
      if (!memberId) return
      await supabase.from("deals").update({ owner_id: memberId }).eq("id", dealId)
      break
    }
    case "meta_capi": {
      // Meta CAPI: implementar quando pixel configurado no workspace
      console.log("[Salesbot] meta_capi não implementado ainda para workspace", workspaceId)
      break
    }
  }
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
      if (!salesbotSteps.length) return

      // Criar execução do salesbot para controle de estado (wait/condition)
      const { data: botExec } = await supabase.from("salesbot_executions").insert({
        workspace_id: automation.workspace_id,
        salesbot_id: (automation.action_data as Record<string, unknown>).salesbot_id,
        deal_id: deal.id,
        lead_id: lead?.id ?? deal.lead_id,
        status: "running",
      }).select().single()

      if (!lead?.phone) return

      let cumulativeDelay = 0
      for (const step of salesbotSteps) {
        const stepType = step.type as string
        cumulativeDelay += (step.delay_minutes as number) ?? 0
        const scheduledAt = new Date(Date.now() + cumulativeDelay * 60 * 1000).toISOString()

        if (stepType === "text" || stepType === "media") {
          const message = stepType === "text"
            ? (step.message as string | null)
                ?.replace("{{nome}}", lead.name ?? "")
                ?.replace("{{empresa}}", "")
                ?.replace("{{telefone}}", lead.phone ?? "")
            : null

          await supabase.from("salesbot_send_queue").insert({
            workspace_id: automation.workspace_id,
            deal_id: deal.id,
            lead_id: lead.id,
            step_id: step.id,
            execution_id: botExec?.id ?? null,
            phone: lead.phone,
            type: stepType,
            message,
            media_url: (step.media_url as string) ?? null,
            media_type: (step.media_type as string) ?? null,
            scheduled_at: scheduledAt,
            status: "pending",
          })
        } else if (stepType === "action") {
          // Ações não-mensagem: enfileirar como item especial de ação
          await supabase.from("salesbot_send_queue").insert({
            workspace_id: automation.workspace_id,
            deal_id: deal.id,
            lead_id: lead.id,
            step_id: step.id,
            execution_id: botExec?.id ?? null,
            phone: lead.phone,
            type: "action",
            message: null,
            media_url: null,
            media_type: null,
            action_config: step.config ?? {},
            scheduled_at: scheduledAt,
            status: "pending",
          })
        } else if (stepType === "wait") {
          // wait com timer: calcular scheduled_at baseado no tempo configurado
          const cfg = (step.config ?? {}) as Record<string, unknown>
          if (cfg.mode === "timer") {
            const waitMs = (((cfg.hours as number) ?? 0) * 3600 + ((cfg.minutes as number) ?? 0) * 60 + ((cfg.seconds as number) ?? 0)) * 1000
            cumulativeDelay = 0 // reset — o wait já define o tempo
            const waitScheduledAt = new Date(Date.now() + cumulativeDelay * 60 * 1000 + waitMs).toISOString()
            // Atualizar execution para "waiting" com timeout
            if (botExec?.id) {
              await supabase.from("salesbot_executions")
                .update({ status: "waiting", waiting_step_id: step.id, timeout_at: waitScheduledAt })
                .eq("id", botExec.id)
            }
          }
          // wait mode "reply": aguarda mensagem — o webhook de recebimento retomará
        }
        // condition: lógica avaliada no webhook de recebimento
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
