"use client"

import { useState, useEffect, useCallback } from "react"
import { X, Plus, Trash2, Bot, CheckSquare, Webhook, ArrowRight, UserCheck, Zap, ChevronRight, ToggleLeft, ToggleRight } from "lucide-react"
import type { Pipeline, PipelineStage } from "@/types"
import { AutomationForm } from "./AutomationForm"

interface AutomationListItem {
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

interface AutomationsModalProps {
  pipeline: Pipeline
  onClose: () => void
}

const ACTION_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  salesbot:     { label: "Robô de vendas",  icon: <Bot className="size-3.5" />,        color: "text-pf-cool border-pf-cool/30 bg-pf-cool/10" },
  add_task:     { label: "Adicionar tarefa", icon: <CheckSquare className="size-3.5" />, color: "text-pf-positive border-pf-positive/30 bg-pf-positive/10" },
  webhook:      { label: "Webhook",          icon: <Webhook className="size-3.5" />,     color: "text-pf-warm border-pf-warm/30 bg-pf-warm/10" },
  change_stage: { label: "Mudar etapa",      icon: <ArrowRight className="size-3.5" />,  color: "text-pf-accent border-pf-accent/30 bg-pf-accent/10" },
  change_user:  { label: "Alterar usuário",  icon: <UserCheck className="size-3.5" />,   color: "text-pf-text-sec border-pf-border bg-pf-surface-2" },
}

const TRIGGER_LABELS: Record<string, string> = {
  immediate:  "Imediatamente",
  delay:      "Após delay",
  daily:      "Diariamente",
  inactivity: "Por inatividade",
}

export function AutomationsModal({ pipeline, onClose }: AutomationsModalProps) {
  const stages: PipelineStage[] = pipeline.stages ?? []

  // Coluna "Leads de Entrada" + etapas reais
  const columns = [
    { id: null as string | null, name: "Leads de Entrada", isEntry: true },
    ...stages.map((s) => ({ id: s.id, name: s.name, isEntry: false })),
  ]

  const [automations, setAutomations] = useState<AutomationListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [formStageId, setFormStageId] = useState<string | null>(null)
  const [editingAutomation, setEditingAutomation] = useState<AutomationListItem | undefined>(undefined)

  const fetchAutomations = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/automations?pipeline_id=${pipeline.id}`)
    if (res.ok) setAutomations(await res.json())
    setLoading(false)
  }, [pipeline.id])

  useEffect(() => { fetchAutomations() }, [fetchAutomations])

  async function toggleActive(automation: AutomationListItem) {
    await fetch(`/api/automations/${automation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !automation.active }),
    })
    setAutomations((prev) => prev.map((a) => a.id === automation.id ? { ...a, active: !a.active } : a))
  }

  async function deleteAutomation(id: string) {
    if (!confirm("Remover esta automação?")) return
    await fetch(`/api/automations/${id}`, { method: "DELETE" })
    setAutomations((prev) => prev.filter((a) => a.id !== id))
  }

  function openNew(stageId: string | null) {
    setEditingAutomation(undefined)
    setFormStageId(stageId)
    setFormOpen(true)
  }

  function openEdit(automation: AutomationListItem) {
    setEditingAutomation(automation)
    setFormStageId(automation.stage_id)
    setFormOpen(true)
  }

  function handleFormDone() {
    setFormOpen(false)
    fetchAutomations()
  }

  if (formOpen) {
    return (
      <AutomationForm
        pipeline={pipeline}
        stageId={formStageId}
        automation={editingAutomation}
        onDone={handleFormDone}
        onBack={() => setFormOpen(false)}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div
        className="flex w-full flex-col rounded-2xl"
        style={{
          background: "#141416",
          border: "1px solid #2A2A2E",
          maxWidth: 960,
          maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-pf-border px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <Zap className="size-4 text-pf-accent" />
            <div>
              <p className="font-heading font-bold text-pf-text">Automações</p>
              <p className="text-xs text-pf-text-muted">{pipeline.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-pf-text-muted hover:text-pf-text transition-colors">
            <X className="size-4" />
          </button>
        </div>

        {/* Kanban de etapas */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-3 p-5 h-full" style={{ minWidth: columns.length * 260 }}>
            {columns.map((col) => {
              const colAutomations = automations.filter((a) => a.stage_id === col.id)

              return (
                <div
                  key={col.id ?? "__entry__"}
                  className="flex flex-col rounded-xl shrink-0"
                  style={{
                    width: 248,
                    background: "#0C0C0E",
                    border: col.isEntry ? "1px solid rgba(202,255,51,0.2)" : "1px solid #2A2A2E",
                  }}
                >
                  {/* Cabeçalho da coluna */}
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-pf-border">
                    <div>
                      <p
                        className="text-xs font-semibold"
                        style={{ color: col.isEntry ? "#CAFF33" : "#E8E8E8" }}
                      >
                        {col.name}
                      </p>
                      {col.isEntry && (
                        <p className="text-[10px] text-pf-text-muted mt-0.5">ao criar novo card</p>
                      )}
                    </div>
                    <button
                      onClick={() => openNew(col.id)}
                      className="flex size-6 items-center justify-center rounded-md border border-pf-border text-pf-text-muted hover:border-pf-accent/40 hover:text-pf-accent transition-colors"
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>

                  {/* Lista de automações */}
                  <div className="flex flex-col gap-2 p-2 flex-1 overflow-y-auto">
                    {loading ? (
                      <div className="flex items-center justify-center py-6">
                        <div className="size-4 animate-spin rounded-full border-2 border-pf-border border-t-pf-accent" />
                      </div>
                    ) : colAutomations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 gap-2">
                        <p className="text-[11px] text-pf-text-muted text-center">Nenhuma automação</p>
                        <button
                          onClick={() => openNew(col.id)}
                          className="text-[11px] text-pf-accent hover:underline"
                        >
                          + Adicionar
                        </button>
                      </div>
                    ) : (
                      colAutomations.map((auto) => {
                        const meta = ACTION_LABELS[auto.action_type]
                        return (
                          <div
                            key={auto.id}
                            className="rounded-lg border p-2.5 cursor-pointer hover:border-pf-accent/20 transition-colors"
                            style={{
                              background: "#141416",
                              border: auto.active ? "1px solid #2A2A2E" : "1px solid #1A1A1E",
                              opacity: auto.active ? 1 : 0.5,
                            }}
                            onClick={() => openEdit(auto)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${meta.color}`}>
                                {meta.icon}
                                {meta.label}
                              </span>
                              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => toggleActive(auto)}
                                  className="text-pf-text-muted hover:text-pf-accent transition-colors"
                                  title={auto.active ? "Desativar" : "Ativar"}
                                >
                                  {auto.active
                                    ? <ToggleRight className="size-4 text-pf-accent" />
                                    : <ToggleLeft className="size-4" />
                                  }
                                </button>
                                <button
                                  onClick={() => deleteAutomation(auto.id)}
                                  className="text-pf-text-muted hover:text-pf-negative transition-colors"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            </div>
                            <p className="mt-1.5 text-[11px] text-pf-text-muted">
                              {TRIGGER_LABELS[auto.trigger_type] ?? auto.trigger_type}
                            </p>
                            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-pf-text-muted">
                              <ChevronRight className="size-3" />
                              Editar
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
