"use client"

import { useState, useTransition, useRef } from "react"
import { Loader2, Check, Clock, MessageSquare, Paperclip, X, Image, Mic, Video } from "lucide-react"
import { saveFollowUpConfig, uploadFollowUpMedia } from "@/actions/agent"
import type { FollowUpConfig, FollowUpStep, FollowUpStepMedia } from "@/types"
import { HelpTooltip } from "@/components/ui/HelpTooltip"

const FIXED_STAGES = [
  "Aguardando Resposta",
  "Follow-up 01",
  "Follow-up 02",
  "Follow-up 03",
] as const

interface FollowUpTabProps {
  initialConfig: FollowUpConfig
}

const inputClass =
  "h-9 rounded-lg border border-pf-border bg-pf-surface-2 px-3 text-sm text-pf-text outline-none transition-colors focus:border-pf-accent/50"

const textareaClass =
  "w-full rounded-lg border border-pf-border bg-pf-surface-2 px-3 py-2 text-sm text-pf-text placeholder:text-pf-text-muted outline-none resize-none transition-colors focus:border-pf-accent/50"

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
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

function normalizeSteps(steps: FollowUpStep[]): FollowUpStep[] {
  const defaultDelays: Record<string, number> = {
    "Aguardando Resposta": 2,
    "Follow-up 01": 4,
    "Follow-up 02": 8,
    "Follow-up 03": 24,
  }
  return FIXED_STAGES.map((stage) => {
    const existing = steps.find((s) => s.stage === stage)
    return existing ?? { stage, delay_hours: defaultDelays[stage] ?? 24, message: "" }
  })
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

export function FollowUpTab({ initialConfig }: FollowUpTabProps) {
  const [config, setConfig] = useState<FollowUpConfig>({
    ...initialConfig,
    steps: normalizeSteps(initialConfig.steps),
  })
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
        <div className="flex items-center gap-2">
          <h3 className="font-heading text-base font-bold text-pf-text">Follow-up Automático</h3>
          <HelpTooltip width={320} content={
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-pf-text">Como funciona o follow-up?</p>
              <p>Quando um lead para de responder o agente IA, o sistema move automaticamente o card pelas etapas do pipeline e envia mensagens de reativação no WhatsApp.</p>
              <p className="font-medium text-pf-text">Fluxo completo:</p>
              <ol className="flex flex-col gap-1 list-decimal list-inside">
                <li>Lead fica em silêncio em <span className="text-pf-accent">Qualificando</span></li>
                <li>Após o tempo configurado → vai para <span className="text-pf-accent">Aguardando Resposta</span></li>
                <li>Cada etapa de follow-up avança o card e envia uma mensagem</li>
                <li>Após o Follow-up 03 sem resposta → <span className="text-pf-negative">Fechado Perdido</span> automático</li>
              </ol>
              <p className="text-pf-text-muted">Se o lead responder em qualquer momento, o agente retoma o atendimento normalmente.</p>
            </div>
          } />
        </div>
        <p className="mt-0.5 text-sm text-pf-text-muted">
          Configure intervalos, mensagens e mídias para reativar leads que pararam de responder o agente IA
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

        {/* Etapas fixas */}
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium text-pf-text">Etapas de follow-up</p>
            <p className="mt-0.5 text-xs text-pf-text-muted">
              Cada etapa corresponde a uma coluna do pipeline do Agente IA. Configure o intervalo, mensagem e mídia opcional de cada uma.
            </p>
          </div>

          {config.steps.map((step, idx) => (
            <div
              key={step.stage}
              className="flex flex-col gap-3 rounded-xl border border-pf-border bg-pf-surface-2 p-4"
            >
              {/* Header */}
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-pf-accent/10 text-xs font-bold text-pf-accent">
                  {idx + 1}
                </span>
                <span className="text-sm font-medium text-pf-text">{step.stage}</span>
                <HelpTooltip width={300} content={
                  <div className="flex flex-col gap-2">
                    <p className="font-semibold text-pf-text">Etapa {idx + 1} — {step.stage}</p>
                    {idx === 0 && <p>Primeira tentativa de reativação. Use uma mensagem leve e amigável. Pode enviar uma imagem do produto ou áudio de apresentação.</p>}
                    {idx === 1 && <p>Segunda tentativa. Seja um pouco mais direto. Um vídeo curto ou foto pode ajudar a despertar o interesse.</p>}
                    {idx === 2 && <p>Terceira tentativa. Tom mais assertivo. Pode mencionar que vai encerrar o atendimento em breve.</p>}
                    {idx === 3 && <p>Última tentativa antes de fechar como perdido. Se não quiser enviar mensagem ou mídia nesta etapa, deixe os campos em branco.</p>}
                    <p className="text-pf-text-muted">O intervalo abaixo é contado a partir da etapa anterior.</p>
                  </div>
                } />
              </div>

              {/* Delay */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-pf-text-muted" />
                  <span className="text-xs font-medium text-pf-text-sec">
                    {idx === 0 ? "Tempo de silêncio para disparar" : `Aguardar após a etapa ${idx}`}
                  </span>
                  {idx === 0 && (
                    <HelpTooltip width={300} content={
                      <div className="flex flex-col gap-2">
                        <p className="font-semibold text-pf-text">Quando esta mensagem é enviada?</p>
                        <p>Quando o lead fica esse tempo todo sem responder na etapa <span className="text-pf-accent">Qualificando</span>, o sistema move o card para <span className="text-pf-accent">Aguardando Resposta</span> e dispara esta mensagem automaticamente.</p>
                        <p className="text-pf-text-muted">Recomendado: 2–4h para leads quentes, 24h para leads frios.</p>
                      </div>
                    } />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={168}
                    value={idx === 0 ? config.silence_hours : step.delay_hours}
                    onChange={(e) => {
                      if (idx === 0) {
                        setConfig((prev) => ({ ...prev, silence_hours: Number(e.target.value) }))
                        setSaved(false)
                      } else {
                        patchStep(idx, { delay_hours: Number(e.target.value) })
                      }
                    }}
                    className={`${inputClass} w-24`}
                  />
                  <span className="text-sm text-pf-text-muted">horas sem resposta</span>
                </div>
              </div>

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
                      <p className="text-pf-text-muted">A mídia é enviada junto com a mensagem de texto. Se a mensagem de texto estiver vazia, apenas a mídia é enviada.</p>
                    </div>
                  } />
                </div>
                <MediaUpload
                  media={step.media}
                  onChange={(media) => patchStep(idx, { media })}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Fluxo resumido */}
        <div className="rounded-xl border border-pf-border bg-pf-surface-2/50 p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <p className="text-xs font-medium text-pf-text-sec">Fluxo resultante</p>
            <HelpTooltip width={280} content={
              <div className="flex flex-col gap-1.5">
                <p className="font-semibold text-pf-text">Lendo o fluxo</p>
                <p>Este resumo mostra o caminho que um lead percorre desde o silêncio até ser fechado como perdido, com os intervalos configurados entre cada etapa.</p>
                <p className="text-pf-text-muted">Atualiza em tempo real conforme você edita os campos acima.</p>
              </div>
            } />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-pf-text-muted">
            <span className="rounded bg-pf-surface px-2 py-0.5 text-pf-text">Qualificando</span>
            <span>→ {config.silence_hours}h →</span>
            {config.steps.map((step) => (
              <span key={step.stage} className="flex items-center gap-1.5">
                <span className="flex items-center gap-1 rounded bg-pf-cool/10 px-2 py-0.5 text-pf-cool">
                  {step.stage}
                  {step.media && <span title={mediaLabel(step.media.type)}>{mediaIcon(step.media.type)}</span>}
                </span>
                <span>→ {step.delay_hours}h →</span>
              </span>
            ))}
            <span className="rounded bg-pf-negative/10 px-2 py-0.5 text-pf-negative">Fechado Perdido</span>
          </div>
        </div>
      </div>

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
