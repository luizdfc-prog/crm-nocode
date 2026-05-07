"use client"

import { useState, useTransition } from "react"
import { Loader2, Check, Clock, MessageSquare } from "lucide-react"
import { saveFollowUpConfig } from "@/actions/agent"
import type { FollowUpConfig, FollowUpStep } from "@/types"
import { HelpTooltip } from "@/components/ui/HelpTooltip"

// Etapas fixas — espelham exatamente o pipeline do Agente IA
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

// Garante que o config sempre tem as 4 etapas fixas, preenchendo com defaults se faltar
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
            <HelpTooltip width={300} content={
              <div className="flex flex-col gap-2">
                <p className="font-semibold text-pf-text">O que é o tempo de silêncio?</p>
                <p>É quantas horas o lead precisa ficar <strong>sem responder</strong> na etapa <span className="text-pf-accent">Qualificando</span> para o sistema entender que o atendimento travou e iniciar o follow-up.</p>
                <p><strong>Exemplo:</strong> com 2 horas configurado — se o agente mandou a última mensagem e o lead não respondeu em 2h, o card move automaticamente para <span className="text-pf-accent">Aguardando Resposta</span>.</p>
                <p className="text-pf-text-muted">Recomendado: 2–4h para leads quentes, 24h para leads frios.</p>
              </div>
            } />
          </div>
          <p className="text-xs text-pf-text-muted">
            Horas sem resposta do lead até mover para &quot;Aguardando Resposta&quot; e iniciar o primeiro follow-up
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

        {/* Etapas fixas */}
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium text-pf-text">Etapas de follow-up</p>
            <p className="mt-0.5 text-xs text-pf-text-muted">
              Cada etapa corresponde a uma coluna do pipeline do Agente IA. Configure o intervalo e a mensagem de cada uma.
            </p>
          </div>

          {config.steps.map((step, idx) => (
            <div
              key={step.stage}
              className="flex flex-col gap-3 rounded-xl border border-pf-border bg-pf-surface-2 p-4"
            >
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-pf-accent/10 text-xs font-bold text-pf-accent">
                  {idx + 1}
                </span>
                <span className="text-sm font-medium text-pf-text">{step.stage}</span>
                <HelpTooltip width={300} content={
                  <div className="flex flex-col gap-2">
                    <p className="font-semibold text-pf-text">Etapa {idx + 1} — {step.stage}</p>
                    {idx === 0 && <p>Primeira tentativa de reativação. O lead acabou de ficar em silêncio. Use uma mensagem leve e amigável, como se estivesse checando se ele ainda precisa de ajuda.</p>}
                    {idx === 1 && <p>Segunda tentativa. O lead já não respondeu à primeira mensagem. Seja um pouco mais direto, mas ainda sem pressão. Lembre que você está disponível.</p>}
                    {idx === 2 && <p>Terceira tentativa. Tom mais assertivo. Pode mencionar que vai encerrar o atendimento em breve caso não haja retorno.</p>}
                    {idx === 3 && <p>Última tentativa antes de fechar como perdido. Após este intervalo sem resposta, o card vai automaticamente para <span className="text-pf-negative">Fechado Perdido</span>. Se não quiser enviar mensagem nesta etapa, deixe o campo em branco.</p>}
                    <p className="text-pf-text-muted">O intervalo abaixo é contado a partir da etapa anterior.</p>
                  </div>
                } />
              </div>

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
            {config.steps.map((step, idx) => (
              <span key={step.stage} className="flex items-center gap-1.5">
                <span className="rounded bg-pf-cool/10 px-2 py-0.5 text-pf-cool">{step.stage}</span>
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
