"use client"

import { useState, useTransition, useRef } from "react"
import { Loader2, Check, Clock, MessageSquare, Paperclip, X, Image, Mic, Video, ChevronDown, ChevronUp } from "lucide-react"
import { saveFollowUpConfig, uploadFollowUpMedia } from "@/actions/agent"
import type { FollowUpConfig, FollowUpStep, FollowUpStepMedia } from "@/types"
import { HelpTooltip } from "@/components/ui/HelpTooltip"

const FOLLOWUP_STAGES = [
  "Follow-up 01",
  "Follow-up 02",
  "Follow-up 03",
  "Follow-up 04",
  "Follow-up 05",
] as const

const DEFAULT_DELAYS: Record<string, number> = {
  "Follow-up 01": 4,
  "Follow-up 02": 8,
  "Follow-up 03": 24,
  "Follow-up 04": 48,
  "Follow-up 05": 72,
}

const DEFAULT_MESSAGES: Record<string, string> = {
  "Follow-up 01": "Olá! Tudo bem? Ainda posso te ajudar com alguma dúvida? 😊",
  "Follow-up 02": "Ei, percebi que você não respondeu ainda. Fico por aqui caso precise! 👋",
  "Follow-up 03": "Última tentativa de contato. Se mudar de ideia, é só chamar! 🙏",
  "Follow-up 04": "",
  "Follow-up 05": "",
}

interface FollowUpTabProps {
  initialConfig: FollowUpConfig
}

const inputClass =
  "h-9 rounded-lg border border-pf-border bg-pf-surface-2 px-3 text-sm text-pf-text outline-none transition-colors focus:border-pf-accent/50"

const textareaClass =
  "w-full rounded-lg border border-pf-border bg-pf-surface-2 px-3 py-2 text-sm text-pf-text placeholder:text-pf-text-muted outline-none resize-none transition-colors focus:border-pf-accent/50"

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
      } ${checked ? "bg-pf-accent" : "bg-pf-border"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </div>
  )
}

function mediaIcon(type: FollowUpStepMedia["type"]) {
  if (type === "image") return <Image className="size-3.5" />
  if (type === "audio") return <Mic className="size-3.5" />
  return <Video className="size-3.5" />
}

function mediaLabel(type: FollowUpStepMedia["type"]) {
  if (type === "image") return "Imagem"
  if (type === "audio") return "Áudio"
  return "Vídeo"
}

interface MediaUploadProps {
  media: FollowUpStepMedia | undefined
  onChange: (media: FollowUpStepMedia | undefined) => void
}

function MediaUpload({ media, onChange }: MediaUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setUploading(true)
    setUploadError(null)
    const fd = new FormData()
    fd.append("file", file)
    const result = await uploadFollowUpMedia(fd)
    setUploading(false)
    if (!result.success) {
      setUploadError(result.error)
      return
    }
    onChange({ url: result.url, type: result.type })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  if (media) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-pf-border bg-pf-surface-2 px-3 py-2">
          <span className="text-pf-accent">{mediaIcon(media.type)}</span>
          <span className="flex-1 text-xs text-pf-text truncate">{mediaLabel(media.type)} anexado</span>
          {media.type === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.url} alt="preview" className="size-8 rounded object-cover border border-pf-border" />
          )}
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="rounded p-0.5 text-pf-text-muted hover:text-pf-negative transition-colors"
            title="Remover mídia"
          >
            <X className="size-3.5" />
          </button>
        </div>
        {media.type !== "audio" && (
          <input
            type="text"
            value={media.caption ?? ""}
            onChange={(e) => onChange({ ...media, caption: e.target.value })}
            placeholder="Legenda (opcional)"
            maxLength={1000}
            className={`${inputClass} w-full`}
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-pf-border bg-pf-surface-2/50 px-4 py-3 transition-colors hover:border-pf-accent/50 hover:bg-pf-surface-2"
      >
        {uploading ? (
          <Loader2 className="size-4 animate-spin text-pf-text-muted" />
        ) : (
          <Paperclip className="size-4 text-pf-text-muted" />
        )}
        <p className="text-xs text-pf-text-muted text-center">
          {uploading ? "Enviando..." : "Clique ou arraste uma imagem, áudio ou vídeo"}
        </p>
        <p className="text-[10px] text-pf-text-muted">Máx. 16 MB</p>
      </div>
      {uploadError && <p className="text-xs text-pf-negative">{uploadError}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,audio/*,video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ""
        }}
      />
    </div>
  )
}

function normalizeSteps(steps: FollowUpStep[]): FollowUpStep[] {
  return FOLLOWUP_STAGES.map((stage) => {
    const existing = steps.find((s) => s.stage === stage)
    // Migração: configs antigas podem não ter o campo enabled (tratadas como ativas)
    if (existing) {
      return { ...existing, enabled: existing.enabled ?? true }
    }
    return {
      stage,
      enabled: false,
      delay_hours: DEFAULT_DELAYS[stage] ?? 24,
      message: DEFAULT_MESSAGES[stage] ?? "",
    }
  })
}

export function FollowUpTab({ initialConfig }: FollowUpTabProps) {
  const [steps, setSteps] = useState<FollowUpStep[]>(
    normalizeSteps(initialConfig.steps)
  )
  const [silenceHours, setSilenceHours] = useState(initialConfig.silence_hours ?? 2)
  const [expanded, setExpanded] = useState<Set<number>>(
    () => new Set(initialConfig.steps.map((_, i) => i).filter((i) => initialConfig.steps[i]?.enabled ?? true))
  )
  const [saving, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function patchStep(index: number, patch: Partial<FollowUpStep>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
    setSaved(false)
    setError(null)
  }

  function toggleStep(index: number, enabled: boolean) {
    setSteps((prev) => {
      const next = [...prev]
      if (enabled) {
        // Ativar: só permite se todas as anteriores estão ativas
        for (let i = 0; i < index; i++) {
          next[i] = { ...next[i], enabled: true }
        }
        next[index] = { ...next[index], enabled: true }
        setExpanded((e) => new Set([...e, index]))
      } else {
        // Desativar: desativa esta e todas as seguintes
        for (let i = index; i < next.length; i++) {
          next[i] = { ...next[i], enabled: false }
        }
        setExpanded((e) => {
          const n = new Set(e)
          for (let i = index; i < next.length; i++) n.delete(i)
          return n
        })
      }
      return next
    })
    setSaved(false)
    setError(null)
  }

  function toggleExpanded(index: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await saveFollowUpConfig({ silence_hours: silenceHours, steps })
      if (!result.success) {
        setError(result.error)
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  const activeSteps = steps.filter((s) => s.enabled)
  const activeCount = activeSteps.length

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="font-heading text-base font-bold text-pf-text">Follow-up Automático</h3>
          <HelpTooltip width={320} content={
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-pf-text">Como funciona o follow-up?</p>
              <p>Quando um lead para de responder o agente IA, o sistema move automaticamente o card pelas etapas ativas e envia mensagens de reativação no WhatsApp.</p>
              <p className="font-medium text-pf-text">Regras de ativação:</p>
              <ul className="flex flex-col gap-1 list-disc list-inside">
                <li>Ative de 1 a 5 etapas conforme necessário</li>
                <li>As etapas devem seguir a ordem (01, 02, 03…)</li>
                <li>Só aparecem no pipeline e no dashboard as etapas ativas</li>
              </ul>
              <p className="font-medium text-pf-text">Fluxo completo:</p>
              <ol className="flex flex-col gap-1 list-decimal list-inside">
                <li>Lead fica em silêncio em <span className="text-pf-accent">Qualificando</span></li>
                <li>Após o tempo configurado → vai para <span className="text-pf-accent">Follow-up 01</span></li>
                <li>Cada etapa ativa avança o card e envia a mensagem configurada</li>
                <li>Após a última etapa ativa sem resposta → <span className="text-pf-negative">Fechado Perdido</span> automático</li>
              </ol>
              <p className="text-pf-text-muted">Se o lead responder em qualquer etapa de follow-up, o card volta automaticamente para <strong>Qualificando</strong>.</p>
            </div>
          } />
        </div>
        <p className="mt-0.5 text-sm text-pf-text-muted">
          Ative de 1 a 5 etapas em sequência. Cada etapa ativa gera uma coluna no pipeline e aparece no dashboard.
        </p>
      </div>

      {/* Tempo de silêncio global */}
      <div className="flex flex-col gap-2 rounded-xl border border-pf-border bg-pf-surface-2 p-4">
        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5 text-pf-text-muted" />
          <span className="text-sm font-medium text-pf-text">Tempo de silêncio para iniciar o follow-up</span>
          <HelpTooltip width={300} content={
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-pf-text">Quando começa o follow-up?</p>
              <p>Quando o lead fica esse tempo todo sem responder na etapa <span className="text-pf-accent">Qualificando</span>, o sistema move o card para <span className="text-pf-accent">Follow-up 01</span> e dispara a primeira mensagem.</p>
              <p className="text-pf-text-muted">Recomendado: 2–4h para leads quentes, 24h para leads frios.</p>
            </div>
          } />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={168}
            value={silenceHours}
            onChange={(e) => { setSilenceHours(Number(e.target.value)); setSaved(false) }}
            className={`${inputClass} w-24`}
          />
          <span className="text-sm text-pf-text-muted">horas sem resposta em Qualificando</span>
        </div>
      </div>

      {/* Etapas */}
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-medium text-pf-text">Etapas de follow-up</p>
          <p className="mt-0.5 text-xs text-pf-text-muted">
            {activeCount === 0
              ? "Nenhuma etapa ativa — ative ao menos uma para iniciar o fluxo"
              : `${activeCount} etapa${activeCount > 1 ? "s" : ""} ativa${activeCount > 1 ? "s" : ""} · as colunas do pipeline e o dashboard serão atualizados ao salvar`}
          </p>
        </div>

        {steps.map((step, idx) => {
          const isOpen = expanded.has(idx)
          const canEnable = idx === 0 || steps[idx - 1].enabled
          const disabledReason = !canEnable ? `Ative o Follow-up ${String(idx).padStart(2, "0")} primeiro` : undefined

          return (
            <div
              key={step.stage}
              className={`rounded-xl border transition-colors ${
                step.enabled ? "border-pf-border bg-pf-surface-2" : "border-pf-border/50 bg-pf-surface-2/40"
              }`}
            >
              {/* Header da etapa */}
              <div className="flex items-center gap-3 px-4 py-3">
                <span className={`flex size-6 items-center justify-center rounded-full text-xs font-bold flex-shrink-0 ${
                  step.enabled ? "bg-pf-accent/10 text-pf-accent" : "bg-pf-border/40 text-pf-text-muted"
                }`}>
                  {idx + 1}
                </span>
                <span className={`flex-1 text-sm font-medium ${step.enabled ? "text-pf-text" : "text-pf-text-muted"}`}>
                  {step.stage}
                  {step.enabled && (
                    <span className="ml-2 text-xs text-pf-text-muted font-normal">
                      {idx === 0
                        ? `${silenceHours}h após silêncio em Qualificando`
                        : `${step.delay_hours}h após etapa ${idx}`}
                    </span>
                  )}
                </span>

                {/* Toggle ativo/inativo */}
                <div className="flex items-center gap-2" title={disabledReason}>
                  {!canEnable && (
                    <span className="text-xs text-pf-text-muted hidden sm:block">{disabledReason}</span>
                  )}
                  <Toggle
                    checked={step.enabled}
                    onChange={(v) => toggleStep(idx, v)}
                    disabled={!canEnable}
                  />
                </div>

                {/* Expandir/recolher (só quando ativa) */}
                {step.enabled && (
                  <button
                    type="button"
                    onClick={() => toggleExpanded(idx)}
                    className="rounded p-1 text-pf-text-muted hover:text-pf-text transition-colors"
                  >
                    {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </button>
                )}
              </div>

              {/* Conteúdo expandido */}
              {step.enabled && isOpen && (
                <div className="flex flex-col gap-4 border-t border-pf-border px-4 pb-4 pt-4">
                  {/* Delay (não para a primeira etapa — usa silence_hours global) */}
                  {idx > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3.5 text-pf-text-muted" />
                        <span className="text-xs font-medium text-pf-text-sec">Aguardar após a etapa {idx}</span>
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
                  )}

                  {/* Mensagem */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="size-3.5 text-pf-text-muted" />
                      <span className="text-xs font-medium text-pf-text-sec">Mensagem de texto</span>
                    </div>
                    <textarea
                      rows={3}
                      value={step.message}
                      onChange={(e) => patchStep(idx, { message: e.target.value })}
                      placeholder="Ex: Olá! Ainda posso te ajudar? 😊"
                      maxLength={1000}
                      className={textareaClass}
                    />
                    <p className="text-right text-xs text-pf-text-muted">{step.message.length}/1000</p>
                  </div>

                  {/* Mídia */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <Paperclip className="size-3.5 text-pf-text-muted" />
                      <span className="text-xs font-medium text-pf-text-sec">Mídia (opcional)</span>
                      <HelpTooltip width={260} content={
                        <div className="flex flex-col gap-1.5">
                          <p className="font-semibold text-pf-text">Tipos aceitos</p>
                          <ul className="flex flex-col gap-1">
                            <li><span className="text-pf-accent">Imagem</span> — JPG, PNG, WebP (máx. 16 MB)</li>
                            <li><span className="text-pf-accent">Áudio</span> — MP3, OGG, M4A (máx. 16 MB)</li>
                            <li><span className="text-pf-accent">Vídeo</span> — MP4 (máx. 16 MB)</li>
                          </ul>
                          <p className="text-pf-text-muted">A mídia é enviada junto com a mensagem de texto.</p>
                        </div>
                      } />
                    </div>
                    <MediaUpload
                      media={step.media}
                      onChange={(media) => patchStep(idx, { media })}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Fluxo resumido */}
      {activeCount > 0 && (
        <div className="rounded-xl border border-pf-border bg-pf-surface-2/50 p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <p className="text-xs font-medium text-pf-text-sec">Fluxo resultante</p>
            <HelpTooltip width={280} content={
              <div className="flex flex-col gap-1.5">
                <p className="font-semibold text-pf-text">Lendo o fluxo</p>
                <p>Este resumo mostra o caminho que um lead percorre desde o silêncio até ser fechado como perdido, com os intervalos entre cada etapa.</p>
                <p className="text-pf-text-muted">Atualiza em tempo real conforme você edita os campos acima.</p>
              </div>
            } />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-pf-text-muted">
            <span className="rounded bg-pf-surface px-2 py-0.5 text-pf-text">Qualificando</span>
            <span>→ {silenceHours}h →</span>
            {activeSteps.map((step, i) => (
              <span key={step.stage} className="flex items-center gap-1.5">
                <span className="flex items-center gap-1 rounded bg-pf-cool/10 px-2 py-0.5 text-pf-cool">
                  {step.stage}
                  {step.media && <span title={mediaLabel(step.media.type)}>{mediaIcon(step.media.type)}</span>}
                </span>
                <span>→ {i < activeSteps.length - 1 ? `${step.delay_hours}h →` : ""}</span>
              </span>
            ))}
            <span className="rounded bg-pf-negative/10 px-2 py-0.5 text-pf-negative">Fechado Perdido</span>
          </div>
        </div>
      )}

      <div>
        {error && <p className="mb-2 text-xs text-pf-negative">{error}</p>}
        <button
          type="submit"
          disabled={saving || activeCount === 0}
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
