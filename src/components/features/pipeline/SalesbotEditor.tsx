"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  ArrowLeft, Plus, Trash2, Loader2, Save, GripVertical,
  Image, Video, Mic, FileText, Clock, Zap, GitBranch,
  MoreHorizontal, Copy, Eye, Pencil, StickyNote,
  CheckSquare, Settings2, Webhook, Tag, Share2, UserCheck, ChevronDown,
} from "lucide-react"

// ─── tipos ────────────────────────────────────────────────────────────────────

type StepType = "text" | "media" | "wait" | "action" | "condition"

type ActionSubtype =
  | "add_note"
  | "add_task"
  | "set_field"
  | "webhook"
  | "manage_tags"
  | "meta_capi"
  | "change_stage"
  | "change_user"

interface Step {
  id: string           // client-side key
  type: StepType
  label: string
  delay_minutes: number
  // text
  message: string
  // media
  media_url: string
  media_type: "image" | "video" | "audio" | ""
  // wait
  wait_mode: "reply" | "timer"
  wait_hours: number
  wait_minutes: number
  wait_seconds: number
  // action
  action_sub: ActionSubtype
  action_config: Record<string, unknown>
  // condition
  conditions: { field: string; op: "eq" | "neq" | "contains"; value: string }[]
  // graph references (resolved after save, for display only)
  next_step_id: string | null
  timeout_step_id: string | null
  no_match_step_id: string | null
}

interface Salesbot {
  id: string
  name: string
}

interface SalesbotEditorProps {
  onDone: (bot: Salesbot) => void
  onBack: () => void
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const VARIABLES = ["{{nome}}", "{{empresa}}", "{{telefone}}"]

let _uid = 0
function uid() { return `step_${++_uid}` }

function emptyStep(type: StepType = "text"): Step {
  return {
    id: uid(), type, label: "", delay_minutes: 0,
    message: "", media_url: "", media_type: "",
    wait_mode: "reply", wait_hours: 0, wait_minutes: 0, wait_seconds: 0,
    action_sub: "add_note", action_config: {},
    conditions: [{ field: "message", op: "contains", value: "" }],
    next_step_id: null, timeout_step_id: null, no_match_step_id: null,
  }
}

// ─── sub-components ───────────────────────────────────────────────────────────

interface StepMenuProps {
  onRename: () => void
  onDuplicate: () => void
  onPreview: () => void
  onDelete: () => void
}

function StepMenu({ onRename, onDuplicate, onPreview, onDelete }: StepMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((p) => !p) }}
        className="rounded p-1 text-pf-text-muted hover:text-pf-text transition-colors"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-50 min-w-[170px] rounded-xl border border-pf-border bg-pf-surface shadow-xl" onClick={() => setOpen(false)}>
          <button onClick={onPreview} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-pf-text-sec hover:bg-pf-surface-2 transition-colors">
            <Eye className="size-3.5" /> Iniciar pré-visualização aqui
          </button>
          <button onClick={onRename} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-pf-text-sec hover:bg-pf-surface-2 transition-colors">
            <Pencil className="size-3.5" /> Renomear
          </button>
          <button onClick={onDuplicate} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-pf-text-sec hover:bg-pf-surface-2 transition-colors">
            <Copy className="size-3.5" /> Duplicar
          </button>
          <div className="border-t border-pf-border" />
          <button onClick={onDelete} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-pf-negative hover:bg-pf-surface-2 transition-colors">
            <Trash2 className="size-3.5" /> Excluir
          </button>
        </div>
      )}
    </div>
  )
}

// ─── step type selector ───────────────────────────────────────────────────────

const STEP_TYPES: { type: StepType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: "text",      label: "Enviar mensagem", icon: <FileText className="size-3.5" />,  color: "text-pf-cool" },
  { type: "media",     label: "Enviar mídia",    icon: <Image className="size-3.5" />,     color: "text-pf-accent" },
  { type: "wait",      label: "Pausar",          icon: <Clock className="size-3.5" />,     color: "text-pf-warm" },
  { type: "action",    label: "Ação",            icon: <Zap className="size-3.5" />,       color: "text-pf-positive" },
  { type: "condition", label: "Condição",        icon: <GitBranch className="size-3.5" />, color: "text-purple-400" },
]

const ACTION_SUBTYPES: { sub: ActionSubtype; label: string; icon: React.ReactNode }[] = [
  { sub: "add_note",    label: "Adicionar nota",          icon: <StickyNote className="size-3.5" /> },
  { sub: "add_task",    label: "Adicionar tarefa",        icon: <CheckSquare className="size-3.5" /> },
  { sub: "set_field",   label: "Definir campo",           icon: <Settings2 className="size-3.5" /> },
  { sub: "webhook",     label: "Enviar um webhook",       icon: <Webhook className="size-3.5" /> },
  { sub: "manage_tags", label: "Gerenciar tags",          icon: <Tag className="size-3.5" /> },
  { sub: "meta_capi",   label: "Meta Conversions API",    icon: <Share2 className="size-3.5" /> },
  { sub: "change_stage",label: "Mudar status do lead",    icon: <GitBranch className="size-3.5" /> },
  { sub: "change_user", label: "Mudar usuário resp.",     icon: <UserCheck className="size-3.5" /> },
]

// ─── action config forms ──────────────────────────────────────────────────────

interface ActionFormProps {
  sub: ActionSubtype
  config: Record<string, unknown>
  onChange: (patch: Record<string, unknown>) => void
}

function ActionForm({ sub, config, onChange }: ActionFormProps) {
  const [members, setMembers] = useState<{ id: string; name: string }[]>([])
  const [stages, setStages] = useState<{ id: string; name: string; pipeline: string }[]>([])
  const [fields, setFields] = useState<{ id: string; name: string; field_type: string; options?: string[] }[]>([])
  const [tags, setTags] = useState<{ id: string; name: string; color: string }[]>([])

  useEffect(() => {
    if (sub === "change_user") {
      fetch("/api/workspace/members").then((r) => r.json()).then((d) => setMembers(d ?? []))
    }
    if (sub === "change_stage") {
      fetch("/api/pipeline/stages").then((r) => r.json()).then((d) => setStages(d ?? []))
    }
    if (sub === "set_field") {
      fetch("/api/custom-fields").then((r) => r.json()).then((d) => setFields(d ?? []))
    }
    if (sub === "manage_tags") {
      fetch("/api/tags").then((r) => r.json()).then((d) => setTags(d ?? []))
    }
  }, [sub])

  const inputCls = "w-full rounded-lg border border-pf-border bg-pf-surface px-3 py-2 text-sm text-pf-text outline-none focus:border-pf-accent/50 placeholder:text-pf-text-muted"
  const selectCls = inputCls + " cursor-pointer"

  switch (sub) {
    case "add_note":
      return (
        <textarea
          value={(config.note as string) ?? ""}
          onChange={(e) => onChange({ note: e.target.value })}
          placeholder="Adicionar uma nota ao lead..."
          rows={3}
          className={inputCls + " resize-none"}
        />
      )

    case "add_task":
      return (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <select
              value={(config.deadline_type as string) ?? "immediate"}
              onChange={(e) => onChange({ ...config, deadline_type: e.target.value })}
              className={selectCls + " flex-1"}
            >
              <option value="immediate">Imediatamente</option>
              <option value="hours">Em X horas</option>
              <option value="days">Em X dias</option>
            </select>
            {!!(config.deadline_type) && (config.deadline_type as string) !== "immediate" && (
              <input
                type="number" min={1}
                value={(config.deadline_value as number) ?? 1}
                onChange={(e) => onChange({ ...config, deadline_value: Number(e.target.value) })}
                className="w-20 rounded-lg border border-pf-border bg-pf-surface px-2 py-2 text-sm text-pf-text outline-none focus:border-pf-accent/50 text-center"
              />
            )}
          </div>
          <select
            value={(config.assignee as string) ?? "current"}
            onChange={(e) => onChange({ ...config, assignee: e.target.value })}
            className={selectCls}
          >
            <option value="current">Usuário responsável atual</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select
            value={(config.task_type as string) ?? "Acompanhar"}
            onChange={(e) => onChange({ ...config, task_type: e.target.value })}
            className={selectCls}
          >
            {["Acompanhar", "Ligar", "Email", "Reunião", "Tarefa"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <textarea
            value={(config.comment as string) ?? ""}
            onChange={(e) => onChange({ ...config, comment: e.target.value })}
            placeholder="Comentário (opcional)"
            rows={2}
            className={inputCls + " resize-none"}
          />
        </div>
      )

    case "set_field":
      return (
        <div className="flex flex-col gap-2">
          <select
            value={(config.field_id as string) ?? ""}
            onChange={(e) => {
              const f = fields.find((x) => x.id === e.target.value)
              onChange({ ...config, field_id: e.target.value, field_type: f?.field_type, field_value: "" })
            }}
            className={selectCls}
          >
            <option value="">Selecionar campo...</option>
            {fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          {!!(config.field_id) && (
            (config.field_type as string) === "select" || (config.field_type as string) === "multiselect" ? (
              <select
                value={(config.field_value as string) ?? ""}
                onChange={(e) => onChange({ ...config, field_value: e.target.value })}
                className={selectCls}
              >
                <option value="">Selecionar valor...</option>
                {(fields.find((f) => f.id === config.field_id)?.options ?? []).map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                value={(config.field_value as string) ?? ""}
                onChange={(e) => onChange({ ...config, field_value: e.target.value })}
                placeholder="Valor do campo..."
                className={inputCls}
              />
            )
          )}
        </div>
      )

    case "webhook":
      return (
        <input
          value={(config.url as string) ?? ""}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="https://..."
          className={inputCls}
        />
      )

    case "manage_tags":
      return (
        <div className="flex flex-col gap-2">
          <select
            value={(config.tag_action as string) ?? "add"}
            onChange={(e) => onChange({ ...config, tag_action: e.target.value })}
            className={selectCls}
          >
            <option value="add">Adicionar tag</option>
            <option value="remove">Remover tag</option>
          </select>
          <select
            value={(config.tag_id as string) ?? ""}
            onChange={(e) => onChange({ ...config, tag_id: e.target.value })}
            className={selectCls}
          >
            <option value="">Selecionar tag...</option>
            {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {tags.length === 0 && (
            <p className="text-[11px] text-pf-text-muted">
              Crie tags em <strong>Configurações → Tags</strong> antes de usar aqui.
            </p>
          )}
        </div>
      )

    case "meta_capi":
      return (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] text-pf-text-muted">Sincroniza um evento com a Meta Conversions API.</p>
          <select
            value={(config.event as string) ?? "Lead"}
            onChange={(e) => onChange({ event: e.target.value })}
            className={selectCls}
          >
            {["Lead", "Purchase", "CompleteRegistration", "InitiateCheckout", "AddToCart", "ViewContent"].map((ev) => (
              <option key={ev} value={ev}>{ev}</option>
            ))}
          </select>
        </div>
      )

    case "change_stage":
      return (
        <select
          value={(config.stage_id as string) ?? ""}
          onChange={(e) => {
            const s = stages.find((x) => x.id === e.target.value)
            onChange({ stage_id: e.target.value, stage_name: s?.name })
          }}
          className={selectCls}
        >
          <option value="">Selecionar etapa...</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>{s.pipeline} → {s.name}</option>
          ))}
        </select>
      )

    case "change_user":
      return (
        <select
          value={(config.member_id as string) ?? ""}
          onChange={(e) => onChange({ member_id: e.target.value })}
          className={selectCls}
        >
          <option value="">Selecionar usuário...</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      )

    default:
      return null
  }
}

// ─── main editor ──────────────────────────────────────────────────────────────

export function SalesbotEditor({ onDone, onBack }: SalesbotEditorProps) {
  const [name, setName] = useState("Novo Robô")
  const [steps, setSteps] = useState<Step[]>([emptyStep("text")])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const addMenuRef = useRef<HTMLDivElement>(null)
  const dragIndex = useRef<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) setAddMenuOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [])

  const addStep = useCallback((type: StepType) => {
    setSteps((prev) => [...prev, emptyStep(type)])
    setAddMenuOpen(false)
  }, [])

  function removeStep(id: string) {
    setSteps((prev) => prev.filter((s) => s.id !== id))
  }

  function duplicateStep(id: string) {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      if (idx < 0) return prev
      const copy = { ...prev[idx], id: uid() }
      const next = [...prev]
      next.splice(idx + 1, 0, copy)
      return next
    })
  }

  function updateStep(id: string, patch: Partial<Step>) {
    setSteps((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s))
  }

  function insertVariable(id: string, variable: string) {
    setSteps((prev) => prev.map((s) => s.id === id ? { ...s, message: s.message + variable } : s))
  }

  function startRename(step: Step) {
    setRenamingId(step.id)
    setRenameValue(step.label || defaultLabel(step.type))
  }

  function defaultLabel(type: StepType) {
    return STEP_TYPES.find((t) => t.type === type)?.label ?? "Passo"
  }

  function handleDragStart(i: number) { dragIndex.current = i }
  function handleDragOver(e: React.DragEvent, i: number) { e.preventDefault(); setDragOver(i) }
  function handleDrop(i: number) {
    if (dragIndex.current === null || dragIndex.current === i) { setDragOver(null); return }
    const next = [...steps]
    const [moved] = next.splice(dragIndex.current, 1)
    next.splice(i, 0, moved)
    setSteps(next)
    dragIndex.current = null
    setDragOver(null)
  }

  async function handleSave() {
    if (!name.trim()) { setError("Dê um nome ao robô"); return }
    if (steps.length === 0) { setError("Adicione ao menos um passo"); return }
    setSaving(true)
    setError(null)

    const serialized = steps.map((s, i) => ({
      position: i,
      type: s.type,
      label: s.label || null,
      delay_minutes: s.delay_minutes,
      message: s.type === "text" ? s.message : undefined,
      media_url: s.type === "media" ? s.media_url : undefined,
      media_type: s.type === "media" ? (s.media_type || undefined) : undefined,
      config: buildConfig(s),
    }))

    const res = await fetch("/api/salesbots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), steps: serialized }),
    })

    setSaving(false)
    if (res.ok) {
      onDone(await res.json())
    } else {
      setError("Erro ao salvar. Tente novamente.")
    }
  }

  function buildConfig(s: Step): Record<string, unknown> {
    switch (s.type) {
      case "wait":
        return { mode: s.wait_mode, hours: s.wait_hours, minutes: s.wait_minutes, seconds: s.wait_seconds }
      case "action":
        return { action: s.action_sub, ...s.action_config }
      case "condition":
        return { conditions: s.conditions }
      default:
        return {}
    }
  }

  const typeInfo = (type: StepType) => STEP_TYPES.find((t) => t.type === type)!

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
          <div className="flex-1">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent font-heading font-bold text-pf-text text-sm outline-none border-b border-transparent focus:border-pf-accent/40 pb-0.5"
              placeholder="Nome do robô"
            />
            <p className="text-xs text-pf-text-muted mt-0.5">Sequência de mensagens WhatsApp</p>
          </div>
        </div>

        {/* Steps */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
          {steps.map((step, i) => {
            const meta = typeInfo(step.type)
            return (
              <div key={step.id}>
                {/* Step card */}
                <div
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDrop={() => handleDrop(i)}
                  onDragEnd={() => setDragOver(null)}
                  className="rounded-xl transition-colors"
                  style={{
                    border: dragOver === i ? "1px solid rgba(202,255,51,0.4)" : "1px solid #2A2A2E",
                    background: "#0C0C0E",
                  }}
                >
                  {/* Step header */}
                  <div className="flex items-center gap-2 px-3 py-2.5 border-b border-pf-border">
                    <GripVertical className="size-4 text-pf-text-muted cursor-grab shrink-0" />
                    <span className="flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-pf-bg shrink-0" style={{ background: "#CAFF33" }}>
                      {i + 1}
                    </span>
                    <span className={`flex items-center gap-1 text-xs font-semibold ${meta.color}`}>
                      {meta.icon}
                      {renamingId === step.id ? (
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => { updateStep(step.id, { label: renameValue }); setRenamingId(null) }}
                          onKeyDown={(e) => { if (e.key === "Enter") { updateStep(step.id, { label: renameValue }); setRenamingId(null) } }}
                          className="bg-transparent outline-none border-b border-pf-accent/40 text-pf-text min-w-0 w-32"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        step.label || meta.label
                      )}
                    </span>
                    <div className="ml-auto">
                      <StepMenu
                        onRename={() => startRename(step)}
                        onDuplicate={() => duplicateStep(step.id)}
                        onPreview={() => {}}
                        onDelete={() => removeStep(step.id)}
                      />
                    </div>
                  </div>

                  {/* Step body */}
                  <div className="p-3 flex flex-col gap-2">
                    {step.type === "text" && (
                      <>
                        <textarea
                          value={step.message}
                          onChange={(e) => updateStep(step.id, { message: e.target.value })}
                          placeholder="Escreva a mensagem..."
                          rows={3}
                          className="w-full rounded-lg border border-pf-border bg-pf-surface px-3 py-2 text-sm text-pf-text outline-none focus:border-pf-accent/50 resize-none placeholder:text-pf-text-muted"
                        />
                        <div className="flex flex-wrap gap-1">
                          {VARIABLES.map((v) => (
                            <button key={v} onClick={() => insertVariable(step.id, v)}
                              className="rounded-md border border-pf-border px-2 py-0.5 font-mono text-[10px] text-pf-text-muted hover:border-pf-accent/30 hover:text-pf-accent transition-colors">
                              {v}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {step.type === "media" && (
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          {(["image", "video", "audio"] as const).map((mt) => {
                            const Icon = mt === "image" ? Image : mt === "video" ? Video : Mic
                            return (
                              <button key={mt} onClick={() => updateStep(step.id, { media_type: mt })}
                                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${step.media_type === mt ? "border-pf-accent/40 bg-pf-accent/10 text-pf-accent" : "border-pf-border text-pf-text-muted hover:text-pf-text"}`}>
                                <Icon className="size-3.5" />
                                {mt === "image" ? "Imagem" : mt === "video" ? "Vídeo" : "Áudio"}
                              </button>
                            )
                          })}
                        </div>
                        <input value={step.media_url} onChange={(e) => updateStep(step.id, { media_url: e.target.value })}
                          placeholder="URL da mídia (https://...)"
                          className="w-full rounded-lg border border-pf-border bg-pf-surface px-3 py-2 text-sm text-pf-text outline-none focus:border-pf-accent/50 placeholder:text-pf-text-muted" />
                        {step.media_type === "audio" && (
                          <p className="text-[11px] text-pf-text-muted">Use um arquivo .mp3 ou .ogg — será enviado como áudio no WhatsApp</p>
                        )}
                      </div>
                    )}

                    {step.type === "wait" && (
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          {(["reply", "timer"] as const).map((mode) => (
                            <button key={mode} onClick={() => updateStep(step.id, { wait_mode: mode })}
                              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${step.wait_mode === mode ? "border-pf-warm/40 bg-pf-warm/10 text-pf-warm" : "border-pf-border text-pf-text-muted hover:text-pf-text"}`}>
                              {mode === "reply" ? "⏳ Até mensagem recebida" : "⏱ Cronômetro"}
                            </button>
                          ))}
                        </div>
                        {step.wait_mode === "timer" && (
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col items-center gap-0.5">
                              <input type="number" min={0} value={step.wait_hours}
                                onChange={(e) => updateStep(step.id, { wait_hours: Number(e.target.value) })}
                                className="w-14 rounded-lg border border-pf-border bg-pf-surface px-2 py-1.5 text-sm text-pf-text outline-none focus:border-pf-accent/50 text-center" />
                              <span className="text-[10px] text-pf-text-muted">horas</span>
                            </div>
                            <span className="text-pf-text-muted text-sm">:</span>
                            <div className="flex flex-col items-center gap-0.5">
                              <input type="number" min={0} max={59} value={step.wait_minutes}
                                onChange={(e) => updateStep(step.id, { wait_minutes: Number(e.target.value) })}
                                className="w-14 rounded-lg border border-pf-border bg-pf-surface px-2 py-1.5 text-sm text-pf-text outline-none focus:border-pf-accent/50 text-center" />
                              <span className="text-[10px] text-pf-text-muted">min</span>
                            </div>
                            <span className="text-pf-text-muted text-sm">:</span>
                            <div className="flex flex-col items-center gap-0.5">
                              <input type="number" min={0} max={59} value={step.wait_seconds}
                                onChange={(e) => updateStep(step.id, { wait_seconds: Number(e.target.value) })}
                                className="w-14 rounded-lg border border-pf-border bg-pf-surface px-2 py-1.5 text-sm text-pf-text outline-none focus:border-pf-accent/50 text-center" />
                              <span className="text-[10px] text-pf-text-muted">seg</span>
                            </div>
                          </div>
                        )}
                        {step.wait_mode === "reply" && (
                          <p className="text-[11px] text-pf-text-muted">O bot aguarda o lead enviar qualquer mensagem antes de continuar.</p>
                        )}
                      </div>
                    )}

                    {step.type === "action" && (
                      <div className="flex flex-col gap-2">
                        <div className="relative">
                          <select
                            value={step.action_sub}
                            onChange={(e) => updateStep(step.id, { action_sub: e.target.value as ActionSubtype, action_config: {} })}
                            className="w-full appearance-none rounded-lg border border-pf-border bg-pf-surface px-3 py-2 pr-8 text-sm text-pf-text outline-none focus:border-pf-accent/50 cursor-pointer"
                          >
                            {ACTION_SUBTYPES.map((a) => <option key={a.sub} value={a.sub}>{a.label}</option>)}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 size-4 text-pf-text-muted" />
                        </div>
                        <ActionForm
                          sub={step.action_sub}
                          config={step.action_config}
                          onChange={(patch) => updateStep(step.id, { action_config: patch })}
                        />
                      </div>
                    )}

                    {step.type === "condition" && (
                      <div className="flex flex-col gap-2">
                        {step.conditions.map((cond, ci) => (
                          <div key={ci} className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] text-pf-text-muted shrink-0">Se</span>
                            <select value={cond.field} onChange={(e) => {
                              const next = [...step.conditions]
                              next[ci] = { ...next[ci], field: e.target.value }
                              updateStep(step.id, { conditions: next })
                            }} className="rounded-lg border border-pf-border bg-pf-surface px-2 py-1.5 text-xs text-pf-text outline-none focus:border-pf-accent/50">
                              <option value="message">Cliente enviar</option>
                            </select>
                            <select value={cond.op} onChange={(e) => {
                              const next = [...step.conditions]
                              next[ci] = { ...next[ci], op: e.target.value as "eq" | "neq" | "contains" }
                              updateStep(step.id, { conditions: next })
                            }} className="rounded-lg border border-pf-border bg-pf-surface px-2 py-1.5 text-xs text-pf-text outline-none focus:border-pf-accent/50">
                              <option value="eq">Iguais</option>
                              <option value="neq">Desiguais</option>
                              <option value="contains">Contém</option>
                            </select>
                            <input value={cond.value} onChange={(e) => {
                              const next = [...step.conditions]
                              next[ci] = { ...next[ci], value: e.target.value }
                              updateStep(step.id, { conditions: next })
                            }} placeholder="Valor..." className="flex-1 min-w-[80px] rounded-lg border border-pf-border bg-pf-surface px-2 py-1.5 text-xs text-pf-text outline-none focus:border-pf-accent/50 placeholder:text-pf-text-muted" />
                            {step.conditions.length > 1 && (
                              <button onClick={() => {
                                const next = step.conditions.filter((_, j) => j !== ci)
                                updateStep(step.id, { conditions: next })
                              }} className="text-pf-text-muted hover:text-pf-negative transition-colors">
                                <Trash2 className="size-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button onClick={() => updateStep(step.id, { conditions: [...step.conditions, { field: "message", op: "contains", value: "" }] })}
                          className="flex items-center gap-1 text-[11px] text-pf-text-muted hover:text-pf-accent transition-colors">
                          <Plus className="size-3" /> Adicionar condição (e)
                        </button>
                        <div className="mt-1 flex flex-col gap-1 rounded-lg border border-pf-border/50 bg-pf-surface-2 p-2">
                          <p className="text-[10px] font-semibold text-pf-text-muted uppercase tracking-wide">Saídas</p>
                          <p className="text-[11px] text-pf-positive">✓ Condição atendida → próximo passo</p>
                          <p className="text-[11px] text-pf-text-muted">✗ Nenhuma das condições → próximo passo (alternativo)</p>
                        </div>
                      </div>
                    )}

                    {/* Delay (não para wait/condition) */}
                    {step.type !== "wait" && step.type !== "condition" && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[11px] text-pf-text-muted shrink-0">Aguardar</span>
                        <input type="number" min={0} value={step.delay_minutes}
                          onChange={(e) => updateStep(step.id, { delay_minutes: Number(e.target.value) })}
                          className="w-16 rounded-md border border-pf-border bg-pf-surface px-2 py-1 text-xs text-pf-text outline-none focus:border-pf-accent/50 text-center" />
                        <span className="text-[11px] text-pf-text-muted">min antes deste passo</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Connector line between steps */}
                {i < steps.length - 1 && (
                  <div className="flex justify-center">
                    <div className="w-px h-4 bg-pf-border" />
                  </div>
                )}
              </div>
            )
          })}

          {/* Add step button */}
          <div className="relative" ref={addMenuRef}>
            <button
              onClick={() => setAddMenuOpen((p) => !p)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-pf-border py-3 text-sm text-pf-text-muted hover:border-pf-accent/30 hover:text-pf-accent transition-colors"
            >
              <Plus className="size-4" />
              Adicionar próximo passo
            </button>
            {addMenuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-full z-50 rounded-xl border border-pf-border bg-pf-surface shadow-xl overflow-hidden">
                {STEP_TYPES.map((t) => (
                  <button
                    key={t.type}
                    onClick={() => addStep(t.type)}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-pf-text-sec hover:bg-pf-surface-2 transition-colors"
                  >
                    <span className={t.color}>{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-pf-border px-5 py-4 shrink-0">
          {error && <p className="text-xs text-pf-negative flex-1">{error}</p>}
          <div className="flex items-center gap-3 ml-auto">
            <button onClick={onBack} className="px-4 py-2 text-sm text-pf-text-muted hover:text-pf-text transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-pf-accent px-4 py-2 text-sm font-semibold text-pf-bg transition-opacity hover:opacity-90 disabled:opacity-60">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saving ? "Salvando..." : "Salvar robô"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
