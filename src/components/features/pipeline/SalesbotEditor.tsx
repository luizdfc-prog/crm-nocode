"use client"

import { useState, useRef } from "react"
import { ArrowLeft, Plus, Trash2, Loader2, Save, GripVertical, Image, Video, Mic, FileText } from "lucide-react"

interface Step {
  type: "text" | "media"
  message: string
  media_url: string
  media_type: "image" | "video" | "audio" | ""
  delay_minutes: number
}

interface Salesbot {
  id: string
  name: string
}

interface SalesbotEditorProps {
  onDone: (bot: Salesbot) => void
  onBack: () => void
}

const VARIABLES = ["{{nome}}", "{{empresa}}", "{{telefone}}"]

const MEDIA_TYPE_ICONS = {
  image: Image,
  video: Video,
  audio: Mic,
}

function emptyStep(): Step {
  return { type: "text", message: "", media_url: "", media_type: "", delay_minutes: 0 }
}

export function SalesbotEditor({ onDone, onBack }: SalesbotEditorProps) {
  const [name, setName] = useState("Novo Robô")
  const [steps, setSteps] = useState<Step[]>([emptyStep()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Drag-and-drop refs
  const dragIndex = useRef<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  function addStep() {
    setSteps((prev) => [...prev, emptyStep()])
  }

  function removeStep(i: number) {
    setSteps((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateStep(i: number, patch: Partial<Step>) {
    setSteps((prev) => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s))
  }

  function insertVariable(i: number, variable: string) {
    setSteps((prev) => prev.map((s, idx) =>
      idx === i ? { ...s, message: s.message + variable } : s
    ))
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
    const validSteps = steps.filter((s) => (s.type === "text" && s.message.trim()) || (s.type === "media" && s.media_url.trim()))
    if (validSteps.length === 0) { setError("Adicione ao menos uma mensagem válida"); return }

    setSaving(true)
    setError(null)

    const res = await fetch("/api/salesbots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        steps: validSteps.map((s, i) => ({
          position: i,
          type: s.type,
          message: s.type === "text" ? s.message : undefined,
          media_url: s.type === "media" ? s.media_url : undefined,
          media_type: s.type === "media" ? s.media_type || undefined : undefined,
          delay_minutes: s.delay_minutes,
        })),
      }),
    })

    setSaving(false)
    if (res.ok) {
      const bot = await res.json()
      onDone(bot)
    } else {
      setError("Erro ao salvar. Tente novamente.")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div
        className="flex w-full flex-col rounded-2xl overflow-hidden"
        style={{ background: "#141416", border: "1px solid #2A2A2E", maxWidth: 540, maxHeight: "92vh" }}
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
          {steps.map((step, i) => (
            <div
              key={i}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={() => handleDrop(i)}
              onDragEnd={() => setDragOver(null)}
              className="rounded-xl border transition-colors"
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
                <div className="flex items-center gap-1 flex-1">
                  <button
                    onClick={() => updateStep(i, { type: "text" })}
                    className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${step.type === "text" ? "bg-pf-accent/10 text-pf-accent" : "text-pf-text-muted hover:text-pf-text"}`}
                  >
                    <FileText className="size-3" /> Texto
                  </button>
                  <button
                    onClick={() => updateStep(i, { type: "media" })}
                    className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${step.type === "media" ? "bg-pf-accent/10 text-pf-accent" : "text-pf-text-muted hover:text-pf-text"}`}
                  >
                    <Image className="size-3" /> Mídia
                  </button>
                </div>
                <button onClick={() => removeStep(i)} className="text-pf-text-muted hover:text-pf-negative transition-colors">
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              {/* Step body */}
              <div className="p-3 flex flex-col gap-2">
                {step.type === "text" ? (
                  <>
                    <textarea
                      value={step.message}
                      onChange={(e) => updateStep(i, { message: e.target.value })}
                      placeholder="Escreva a mensagem..."
                      rows={3}
                      className="w-full rounded-lg border border-pf-border bg-pf-surface px-3 py-2 text-sm text-pf-text outline-none focus:border-pf-accent/50 resize-none placeholder:text-pf-text-muted"
                    />
                    <div className="flex flex-wrap gap-1">
                      {VARIABLES.map((v) => (
                        <button
                          key={v}
                          onClick={() => insertVariable(i, v)}
                          className="rounded-md border border-pf-border px-2 py-0.5 font-mono text-[10px] text-pf-text-muted hover:border-pf-accent/30 hover:text-pf-accent transition-colors"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      {(["image", "video", "audio"] as const).map((mt) => {
                        const Icon = MEDIA_TYPE_ICONS[mt]
                        const active = step.media_type === mt
                        return (
                          <button
                            key={mt}
                            onClick={() => updateStep(i, { media_type: mt })}
                            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                              active
                                ? "border-pf-accent/40 bg-pf-accent/10 text-pf-accent"
                                : "border-pf-border text-pf-text-muted hover:text-pf-text"
                            }`}
                          >
                            <Icon className="size-3.5" />
                            {mt === "image" ? "Imagem" : mt === "video" ? "Vídeo" : "Áudio"}
                          </button>
                        )
                      })}
                    </div>
                    <input
                      value={step.media_url}
                      onChange={(e) => updateStep(i, { media_url: e.target.value })}
                      placeholder="URL da mídia (https://...)"
                      className="w-full rounded-lg border border-pf-border bg-pf-surface px-3 py-2 text-sm text-pf-text outline-none focus:border-pf-accent/50 placeholder:text-pf-text-muted"
                    />
                    {step.media_type === "audio" && (
                      <p className="text-[11px] text-pf-text-muted">Use um arquivo .mp3 ou .ogg — será enviado como áudio no WhatsApp</p>
                    )}
                  </div>
                )}

                {/* Delay */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-pf-text-muted shrink-0">Aguardar</span>
                  <input
                    type="number" min={0}
                    value={step.delay_minutes}
                    onChange={(e) => updateStep(i, { delay_minutes: Number(e.target.value) })}
                    className="w-16 rounded-md border border-pf-border bg-pf-surface px-2 py-1 text-xs text-pf-text outline-none focus:border-pf-accent/50 text-center"
                  />
                  <span className="text-[11px] text-pf-text-muted">min antes deste passo</span>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addStep}
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-pf-border py-3 text-sm text-pf-text-muted hover:border-pf-accent/30 hover:text-pf-accent transition-colors"
          >
            <Plus className="size-4" />
            Adicionar próximo passo
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-pf-border px-5 py-4 shrink-0">
          {error && <p className="text-xs text-pf-negative flex-1">{error}</p>}
          <div className="flex items-center gap-3 ml-auto">
            <button onClick={onBack} className="px-4 py-2 text-sm text-pf-text-muted hover:text-pf-text transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-pf-accent px-4 py-2 text-sm font-semibold text-pf-bg transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saving ? "Salvando..." : "Salvar robô"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
