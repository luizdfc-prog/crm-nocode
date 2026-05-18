"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Save, Loader2, Bot, CheckSquare, Webhook, ArrowRight, UserCheck } from "lucide-react"
import type { Pipeline } from "@/types"
import { SalesbotEditor } from "./SalesbotEditor"

interface Automation {
  id: string
  stage_id: string | null
  action_type: "salesbot" | "add_task" | "webhook" | "change_stage" | "change_user"
  trigger_type: string
  trigger_delay_minutes: number | null
  trigger_daily_time: string | null
  trigger_inactivity_hours: number | null
  schedule_always: boolean
  schedule_days: string[]
  schedule_start: string | null
  schedule_end: string | null
  condition_field: string | null
  condition_op: string | null
  condition_value: string | null
  active: boolean
  action_data: Record<string, unknown>
}

interface Salesbot {
  id: string
  name: string
}

interface Member {
  id: string
  name: string
}

interface AutomationFormProps {
  pipeline: Pipeline
  stageId: string | null
  automation?: Automation
  onDone: () => void
  onBack: () => void
}

const ACTION_OPTIONS = [
  { key: "salesbot",     label: "Robô de vendas",  icon: Bot,         description: "Envia mensagens WhatsApp automaticamente" },
  { key: "add_task",     label: "Adicionar tarefa", icon: CheckSquare, description: "Cria uma atividade para o responsável" },
  { key: "webhook",      label: "Webhook",          icon: Webhook,     description: "Faz uma requisição POST para uma URL" },
  { key: "change_stage", label: "Mudar etapa",      icon: ArrowRight,  description: "Move o card para outra etapa" },
  { key: "change_user",  label: "Alterar usuário",  icon: UserCheck,   description: "Reatribui o card para outro membro" },
] as const

const WEEK_DAYS = [
  { key: "mon", label: "Seg" },
  { key: "tue", label: "Ter" },
  { key: "wed", label: "Qua" },
  { key: "thu", label: "Qui" },
  { key: "fri", label: "Sex" },
  { key: "sat", label: "Sáb" },
  { key: "sun", label: "Dom" },
]

const TASK_TYPES = ["Acompanhar", "Ligar", "Reunião", "E-mail", "Outro"]

export function AutomationForm({ pipeline, stageId, automation, onDone, onBack }: AutomationFormProps) {
  const stages = pipeline.stages ?? []
  const stageName = stageId
    ? (stages.find((s) => s.id === stageId)?.name ?? "Etapa")
    : "Leads de Entrada"
  const isEntry = stageId === null

  const [actionType, setActionType] = useState<typeof ACTION_OPTIONS[number]["key"]>(
    automation?.action_type ?? "salesbot"
  )
  const [triggerType, setTriggerType] = useState(automation?.trigger_type ?? "immediate")
  const [delayMinutes, setDelayMinutes] = useState(automation?.trigger_delay_minutes ?? 60)
  const [dailyTime, setDailyTime] = useState(automation?.trigger_daily_time ?? "09:00")
  const [inactivityHours, setInactivityHours] = useState(automation?.trigger_inactivity_hours ?? 24)
  const [scheduleAlways, setScheduleAlways] = useState(automation?.schedule_always ?? true)
  const [scheduleDays, setScheduleDays] = useState<string[]>(automation?.schedule_days ?? ["mon","tue","wed","thu","fri"])
  const [scheduleStart, setScheduleStart] = useState(automation?.schedule_start ?? "08:00")
  const [scheduleEnd, setScheduleEnd] = useState(automation?.schedule_end ?? "18:00")
  const [conditionField, setConditionField] = useState(automation?.condition_field ?? "")
  const [conditionValue, setConditionValue] = useState(automation?.condition_value ?? "")
  const [applyToExisting, setApplyToExisting] = useState(false)

  // Action-specific data
  const [salesbots, setSalesbots] = useState<Salesbot[]>([])
  const [selectedSalesbotId, setSelectedSalesbotId] = useState<string>((automation?.action_data?.salesbot_id as string) ?? "")
  const [salesbotEditorOpen, setSalesbotEditorOpen] = useState(false)

  const [webhookUrl, setWebhookUrl] = useState<string>((automation?.action_data?.url as string) ?? "")

  const [taskTitle, setTaskTitle] = useState<string>((automation?.action_data?.title as string) ?? "")
  const [taskType, setTaskType] = useState<string>((automation?.action_data?.type as string) ?? "Acompanhar")
  const [taskComment, setTaskComment] = useState<string>((automation?.action_data?.comment as string) ?? "")
  const [taskDeadlineType, setTaskDeadlineType] = useState<string>((automation?.action_data?.deadline_type as string) ?? "immediate")
  const [taskDeadlineValue, setTaskDeadlineValue] = useState<number>((automation?.action_data?.deadline_value as number) ?? 24)

  const [targetPipelineId, setTargetPipelineId] = useState<string>((automation?.action_data?.target_pipeline_id as string) ?? pipeline.id)
  const [targetStageId, setTargetStageId] = useState<string>((automation?.action_data?.target_stage_id as string) ?? "")

  const [members, setMembers] = useState<Member[]>([])
  const [targetMemberId, setTargetMemberId] = useState<string>((automation?.action_data?.member_id as string) ?? "")

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/salesbots").then(r => r.json()).then(setSalesbots).catch(() => {})
    fetch("/api/workspace/members").then(r => r.json()).then((data) => {
      setMembers(Array.isArray(data) ? data : [])
    }).catch(() => {})
  }, [])

  const targetStages = stages.filter((s) => s.id !== stageId)

  function buildActionData(): Record<string, unknown> {
    switch (actionType) {
      case "salesbot":     return { salesbot_id: selectedSalesbotId }
      case "webhook":      return { url: webhookUrl }
      case "add_task":     return { title: taskTitle, type: taskType, comment: taskComment, deadline_type: taskDeadlineType, deadline_value: taskDeadlineValue }
      case "change_stage": return { target_pipeline_id: targetPipelineId, target_stage_id: targetStageId }
      case "change_user":  return { member_id: targetMemberId }
    }
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      pipeline_id: pipeline.id,
      stage_id: stageId,
      action_type: actionType,
      trigger_type: triggerType,
      trigger_delay_minutes: triggerType === "delay" ? delayMinutes : null,
      trigger_daily_time: triggerType === "daily" ? dailyTime : null,
      trigger_inactivity_hours: triggerType === "inactivity" ? inactivityHours : null,
      schedule_always: scheduleAlways,
      schedule_days: scheduleAlways ? ["mon","tue","wed","thu","fri","sat","sun"] : scheduleDays,
      schedule_start: scheduleAlways ? null : scheduleStart,
      schedule_end: scheduleAlways ? null : scheduleEnd,
      condition_field: conditionField || null,
      condition_op: conditionField ? "eq" : null,
      condition_value: conditionField ? conditionValue : null,
      action_data: buildActionData(),
      apply_to_existing: applyToExisting,
    }

    const url = automation ? `/api/automations/${automation.id}` : "/api/automations"
    const method = automation ? "PATCH" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    setSaving(false)
    if (res.ok) onDone()
  }

  if (salesbotEditorOpen) {
    return (
      <SalesbotEditor
        onDone={(bot) => {
          setSalesbots((prev) => [bot, ...prev])
          setSelectedSalesbotId(bot.id)
          setSalesbotEditorOpen(false)
        }}
        onBack={() => setSalesbotEditorOpen(false)}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div
        className="flex w-full flex-col rounded-2xl overflow-hidden"
        style={{ background: "#141416", border: "1px solid #2A2A2E", maxWidth: 560, maxHeight: "92vh" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-pf-border px-5 py-4 shrink-0">
          <button onClick={onBack} className="rounded-lg p-1.5 text-pf-text-muted hover:text-pf-text transition-colors">
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <p className="font-heading font-bold text-pf-text text-sm">
              {automation ? "Editar automação" : "Nova automação"}
            </p>
            <p className="text-xs text-pf-text-muted">{stageName}</p>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

          {/* 1. Ação */}
          <div>
            <p className="text-xs font-semibold text-pf-text-muted uppercase tracking-wide mb-2">Ação</p>
            <div className="grid grid-cols-1 gap-2">
              {ACTION_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const active = actionType === opt.key
                return (
                  <button
                    key={opt.key}
                    onClick={() => setActionType(opt.key)}
                    className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors"
                    style={{
                      border: active ? "1px solid rgba(202,255,51,0.4)" : "1px solid #2A2A2E",
                      background: active ? "rgba(202,255,51,0.06)" : "transparent",
                    }}
                  >
                    <Icon className="size-4 shrink-0" style={{ color: active ? "#CAFF33" : "#555559" }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: active ? "#E8E8E8" : "#8A8A8F" }}>{opt.label}</p>
                      <p className="text-[11px] text-pf-text-muted">{opt.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Dados da ação */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-pf-text-muted uppercase tracking-wide">Configuração da ação</p>

            {actionType === "salesbot" && (
              <div className="flex flex-col gap-2">
                <select
                  value={selectedSalesbotId}
                  onChange={(e) => setSelectedSalesbotId(e.target.value)}
                  className="w-full rounded-lg border border-pf-border bg-pf-surface px-3 py-2 text-sm text-pf-text outline-none focus:border-pf-accent/50"
                >
                  <option value="">Selecionar robô...</option>
                  {salesbots.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => setSalesbotEditorOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-pf-accent hover:underline"
                >
                  <Bot className="size-3" /> + Criar novo robô
                </button>
              </div>
            )}

            {actionType === "webhook" && (
              <input
                placeholder="https://meusite.com/webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full rounded-lg border border-pf-border bg-pf-surface px-3 py-2 text-sm text-pf-text outline-none focus:border-pf-accent/50 placeholder:text-pf-text-muted"
              />
            )}

            {actionType === "add_task" && (
              <div className="flex flex-col gap-2">
                <input
                  placeholder="Título da tarefa"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full rounded-lg border border-pf-border bg-pf-surface px-3 py-2 text-sm text-pf-text outline-none focus:border-pf-accent/50 placeholder:text-pf-text-muted"
                />
                <select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                  className="w-full rounded-lg border border-pf-border bg-pf-surface px-3 py-2 text-sm text-pf-text outline-none focus:border-pf-accent/50"
                >
                  {TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <div className="flex gap-2 items-center">
                  <select
                    value={taskDeadlineType}
                    onChange={(e) => setTaskDeadlineType(e.target.value)}
                    className="flex-1 rounded-lg border border-pf-border bg-pf-surface px-3 py-2 text-sm text-pf-text outline-none focus:border-pf-accent/50"
                  >
                    <option value="immediate">Prazo: imediato</option>
                    <option value="hours">Prazo: após X horas</option>
                    <option value="days">Prazo: após X dias</option>
                  </select>
                  {taskDeadlineType !== "immediate" && (
                    <input
                      type="number" min={1}
                      value={taskDeadlineValue}
                      onChange={(e) => setTaskDeadlineValue(Number(e.target.value))}
                      className="w-20 rounded-lg border border-pf-border bg-pf-surface px-3 py-2 text-sm text-pf-text outline-none focus:border-pf-accent/50"
                    />
                  )}
                </div>
                <textarea
                  placeholder="Comentário (opcional)"
                  value={taskComment}
                  onChange={(e) => setTaskComment(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-pf-border bg-pf-surface px-3 py-2 text-sm text-pf-text outline-none focus:border-pf-accent/50 resize-none placeholder:text-pf-text-muted"
                />
              </div>
            )}

            {actionType === "change_stage" && (
              <select
                value={targetStageId}
                onChange={(e) => setTargetStageId(e.target.value)}
                className="w-full rounded-lg border border-pf-border bg-pf-surface px-3 py-2 text-sm text-pf-text outline-none focus:border-pf-accent/50"
              >
                <option value="">Selecionar etapa destino...</option>
                {targetStages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}

            {actionType === "change_user" && (
              <select
                value={targetMemberId}
                onChange={(e) => setTargetMemberId(e.target.value)}
                className="w-full rounded-lg border border-pf-border bg-pf-surface px-3 py-2 text-sm text-pf-text outline-none focus:border-pf-accent/50"
              >
                <option value="">Selecionar membro...</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            )}
          </div>

          {/* 2. Quando executar */}
          <div>
            <p className="text-xs font-semibold text-pf-text-muted uppercase tracking-wide mb-2">Quando executar</p>
            <select
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value)}
              className="w-full rounded-lg border border-pf-border bg-pf-surface px-3 py-2 text-sm text-pf-text outline-none focus:border-pf-accent/50 mb-2"
            >
              <option value="immediate">{isEntry ? "Imediatamente ao criar" : "Imediatamente ao entrar"}</option>
              <option value="delay">Após X minutos/horas</option>
              <option value="daily">Diariamente às...</option>
              <option value="inactivity">X horas sem resposta</option>
            </select>

            {triggerType === "delay" && (
              <div className="flex items-center gap-2">
                <input
                  type="number" min={1}
                  value={delayMinutes}
                  onChange={(e) => setDelayMinutes(Number(e.target.value))}
                  className="w-24 rounded-lg border border-pf-border bg-pf-surface px-3 py-2 text-sm text-pf-text outline-none focus:border-pf-accent/50"
                />
                <span className="text-sm text-pf-text-muted">minutos após o gatilho</span>
              </div>
            )}

            {triggerType === "daily" && (
              <input
                type="time"
                value={dailyTime}
                onChange={(e) => setDailyTime(e.target.value)}
                className="rounded-lg border border-pf-border bg-pf-surface px-3 py-2 text-sm text-pf-text outline-none focus:border-pf-accent/50"
              />
            )}

            {triggerType === "inactivity" && (
              <div className="flex items-center gap-2">
                <input
                  type="number" min={1}
                  value={inactivityHours}
                  onChange={(e) => setInactivityHours(Number(e.target.value))}
                  className="w-24 rounded-lg border border-pf-border bg-pf-surface px-3 py-2 text-sm text-pf-text outline-none focus:border-pf-accent/50"
                />
                <span className="text-sm text-pf-text-muted">horas sem resposta</span>
              </div>
            )}
          </div>

          {/* 3. Horário de funcionamento */}
          <div>
            <p className="text-xs font-semibold text-pf-text-muted uppercase tracking-wide mb-2">Horário de funcionamento</p>
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={scheduleAlways}
                onChange={(e) => setScheduleAlways(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-pf-text">Sempre ativo</span>
            </label>

            {!scheduleAlways && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {WEEK_DAYS.map((d) => {
                    const active = scheduleDays.includes(d.key)
                    return (
                      <button
                        key={d.key}
                        onClick={() => setScheduleDays((prev) => active ? prev.filter(x => x !== d.key) : [...prev, d.key])}
                        className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
                        style={{
                          background: active ? "rgba(202,255,51,0.12)" : "#1A1A1E",
                          color: active ? "#CAFF33" : "#555559",
                          border: active ? "1px solid rgba(202,255,51,0.3)" : "1px solid #2A2A2E",
                        }}
                      >
                        {d.label}
                      </button>
                    )
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-pf-text-muted">de</span>
                  <input type="time" value={scheduleStart} onChange={(e) => setScheduleStart(e.target.value)}
                    className="rounded-lg border border-pf-border bg-pf-surface px-2 py-1.5 text-sm text-pf-text outline-none" />
                  <span className="text-xs text-pf-text-muted">às</span>
                  <input type="time" value={scheduleEnd} onChange={(e) => setScheduleEnd(e.target.value)}
                    className="rounded-lg border border-pf-border bg-pf-surface px-2 py-1.5 text-sm text-pf-text outline-none" />
                </div>
              </div>
            )}
          </div>

          {/* 4. Condição (opcional) */}
          <div>
            <p className="text-xs font-semibold text-pf-text-muted uppercase tracking-wide mb-2">Condição (opcional)</p>
            <select
              value={conditionField}
              onChange={(e) => setConditionField(e.target.value)}
              className="w-full rounded-lg border border-pf-border bg-pf-surface px-3 py-2 text-sm text-pf-text outline-none focus:border-pf-accent/50 mb-2"
            >
              <option value="">Para todos os leads</option>
              <option value="source">Fonte / Origem</option>
              <option value="tag">Tag</option>
              <option value="utm_source">UTM Source</option>
              <option value="utm_medium">UTM Medium</option>
              <option value="utm_campaign">UTM Campaign</option>
            </select>
            {conditionField && (
              <input
                placeholder="Valor da condição"
                value={conditionValue}
                onChange={(e) => setConditionValue(e.target.value)}
                className="w-full rounded-lg border border-pf-border bg-pf-surface px-3 py-2 text-sm text-pf-text outline-none focus:border-pf-accent/50 placeholder:text-pf-text-muted"
              />
            )}
          </div>

          {/* 5. Aplicar a existentes */}
          {!automation && (
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={applyToExisting}
                onChange={(e) => setApplyToExisting(e.target.checked)}
                className="mt-0.5 rounded"
              />
              <div>
                <p className="text-sm text-pf-text">Aplicar a leads já nesta etapa</p>
                <p className="text-xs text-pf-text-muted">Executa a automação nos cards que já estão aqui</p>
              </div>
            </label>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-pf-border px-5 py-4 shrink-0">
          <button onClick={onBack} className="px-4 py-2 text-sm text-pf-text-muted hover:text-pf-text transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-pf-accent px-4 py-2 text-sm font-semibold text-pf-bg transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {saving ? "Salvando..." : "Salvar automação"}
          </button>
        </div>
      </div>
    </div>
  )
}
