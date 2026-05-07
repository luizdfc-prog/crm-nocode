"use client"

import { useState, useTransition } from "react"
import { Loader2, Check, Plus, Trash2, Clock, MessageSquare } from "lucide-react"
import { saveFollowUpConfig } from "@/actions/agent"
import type { FollowUpConfig, FollowUpStep } from "@/types"

interface FollowUpTabProps {
  initialConfig: FollowUpConfig
}

const STAGE_SEQUENCE = [
  "Aguardando Resposta",
  "Follow-up 01",
  "Follow-up 02",
  "Follow-up 03",
]

const inputClass =
  "h-9 rounded-lg border border-pf-border bg-pf-surface-2 px-3 text-sm text-pf-text outline-none transition-colors focus:border-pf-accent/50"

const textareaClass =
  "w-full rounded-lg border border-pf-border bg-pf-surface-2 px-3 py-2 text-sm text-pf-text placeholder:text-pf-text-muted outline-none resize-none transition-colors focus:border-pf-accent/50"

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors ${
        checked ? "bg-pf-accent" : "bg-pf-border"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </div>
  )
}

export function FollowUpTab({ initialConfig }: FollowUpTabProps) {
  const [config, setConfig] = useState<FollowUpConfig>(initialConfig)
  const [saving, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function patchStep(index: number, patch: Partial<FollowUpStep>) {
    setConfig((prev) => {
      const steps = prev.steps.map((s, i) => (i === index ? { ...s, ...patch } : s))
      return { ...prev, steps }
    })
    setSaved(false)
    setError(null)
  }

  function addStep() {
    if (config.steps.length >= 4) return
    const nextStage = STAGE_SEQUENCE.find(
      (s) => !config.steps.some((step) => step.stage === s),
    ) ?? `Follow-up ${config.steps.length}`
    setConfig((prev) => ({
      ...prev,
      steps: [
        ...prev.steps,
        { stage: nextStage, delay_hours: 24, message: "" },
      ],
    }))
    setSaved(false)
  }

  function removeStep(index: number) {
    if (config.steps.length <= 1) return
    setConfig((prev) => ({ ...prev, steps: prev.steps.filter((_, i) => i !== index) }))
    setSaved(false)
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await saveFollowUpConfig(config)
      if (!result.success) {
        setError(result.error)
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      <div>
        <h3 className="font-heading text-base font-bold text-pf-text">Follow-up Automático</h3>
        <p className="mt-0.5 text-sm text-pf-text-muted">
          Configure intervalos e mensagens para reativar leads que pararam de responder o agente IA
        </p>
      </div>

      {/* Toggle global */}
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-pf-border bg-pf-surface-2 p-4">
        <div>
          <p className="text-sm font-medium text-pf-text">Ativar follow-up automático</p>
          <p className="mt-0.5 text-xs text-pf-text-muted">
            O agente envia mensagens de reativação nos intervalos configurados abaixo
          </p>
        </div>
        <Toggle
          checked={config.enabled}
          onChange={(v) => {
            setConfig((prev) => ({ ...prev, enabled: v }))
            setSaved(false)
          }}
        />
      </label>

      <div
        className={`flex flex-col gap-5 transition-opacity ${
          config.enabled ? "opacity-100" : "pointer-events-none opacity-40"
        }`}
      >
        {/* Silêncio mínimo para ativar o primeiro follow-up */}
        <div className="flex flex-col gap-2 rounded-xl border border-pf-border bg-pf-surface-2 p-4">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-pf-text-muted" />
            <span className="text-sm font-medium text-pf-text">Tempo de silêncio para iniciar</span>
          </div>
          <p className="text-xs text-pf-text-muted">
            Quantas horas sem resposta do lead até o sistema mover para &quot;Aguardando Resposta&quot; e iniciar o primeiro follow-up
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={168}
              value={config.silence_hours}
              onChange={(e) => {
                setConfig((prev) => ({ ...prev, silence_hours: Number(e.target.value) }))
                setSaved(false)
              }}
              className={`${inputClass} w-24`}
            />
            <span className="text-sm text-pf-text-muted">horas</span>
          </div>
        </div>

        {/* Etapas de follow-up */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-pf-text">Etapas de follow-up</p>
              <p className="mt-0.5 text-xs text-pf-text-muted">
                Cada etapa move o card no pipeline do Agente IA e envia a mensagem configurada
              </p>
            </div>
            {config.steps.length < 4 && (
              <button
                type="button"
                onClick={addStep}
                className="flex items-center gap-1.5 rounded-lg border border-pf-border bg-pf-surface-2 px-3 py-1.5 text-xs font-medium text-pf-text-sec transition-colors hover:border-pf-accent/50 hover:text-pf-text"
              >
                <Plus className="size-3.5" />
                Adicionar etapa
              </button>
            )}
          </div>

          {config.steps.map((step, idx) => (
            <div
              key={idx}
              className="flex flex-col gap-3 rounded-xl border border-pf-border bg-pf-surface-2 p-4"
            >
              {/* Header da etapa */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-pf-accent/10 text-xs font-bold text-pf-accent">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium text-pf-text">
                    {step.stage}
                  </span>
                </div>
                {config.steps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStep(idx)}
                    className="rounded p-1 text-pf-text-muted transition-colors hover:text-pf-negative"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>

              {/* Intervalo */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-pf-text-muted" />
                  <span className="text-xs font-medium text-pf-text-sec">
                    {idx === 0
                      ? "Aguardar após o silêncio inicial"
                      : `Aguardar após a etapa ${idx}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={168}
                    value={step.delay_hours}
                    onChange={(e) => patchStep(idx, { delay_hours: Number(e.target.value) })}
                    className={`${inputClass} w-24`}
                  />
                  <span className="text-sm text-pf-text-muted">horas sem resposta</span>
                </div>
              </div>

              {/* Mensagem */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="size-3.5 text-pf-text-muted" />
                  <span className="text-xs font-medium text-pf-text-sec">Mensagem enviada</span>
                </div>
                <textarea
                  rows={3}
                  value={step.message}
                  onChange={(e) => patchStep(idx, { message: e.target.value })}
                  placeholder="Ex: Olá! Ainda posso te ajudar? 😊"
                  maxLength={1000}
                  className={textareaClass}
                />
                <p className="text-right text-xs text-pf-text-muted">
                  {step.message.length}/1000
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Resumo do fluxo */}
        <div className="rounded-xl border border-pf-border bg-pf-surface-2/50 p-4">
          <p className="mb-2 text-xs font-medium text-pf-text-sec">Fluxo resultante</p>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-pf-text-muted">
            <span className="rounded bg-pf-surface px-2 py-0.5 text-pf-text">Qualificando</span>
            <span>→ {config.silence_hours}h sem resposta →</span>
            {config.steps.map((step, idx) => (
              <span key={idx} className="flex items-center gap-1.5">
                <span className="rounded bg-pf-cool/10 px-2 py-0.5 text-pf-cool">{step.stage}</span>
                {idx < config.steps.length - 1 && (
                  <span>→ {step.delay_hours}h →</span>
                )}
              </span>
            ))}
            <span>→ {config.steps[config.steps.length - 1]?.delay_hours ?? 0}h →</span>
            <span className="rounded bg-pf-negative/10 px-2 py-0.5 text-pf-negative">Fechado Perdido</span>
          </div>
        </div>
      </div>

      {/* Salvar */}
      <div>
        {error && <p className="mb-2 text-xs text-pf-negative">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="flex h-9 items-center gap-2 rounded-lg bg-pf-accent px-4 text-sm font-semibold text-pf-bg transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          {saved && <Check className="size-3.5" />}
          {saved ? "Salvo!" : "Salvar follow-up"}
        </button>
      </div>
    </form>
  )
}
