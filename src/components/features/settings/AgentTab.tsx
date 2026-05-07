"use client"

import { useState } from "react"
import { Loader2, Check } from "lucide-react"
import { saveAgentConfig } from "@/actions/agent"
import { HelpTooltip } from "@/components/ui/HelpTooltip"
import { LeadRoutingSection } from "./LeadRoutingSection"
import { AgentMediaLibrary } from "./AgentMediaLibrary"
import type { AgentConfig, AgentMedia, RoutingConfig, Pipeline } from "@/types"
import type { WorkspaceRow } from "@/types/supabase"

interface AgentTabProps {
  workspace: WorkspaceRow
  salesPipelines?: Pipeline[]
  initialRoutingConfig?: RoutingConfig
}

const textareaClass =
  "w-full rounded-lg border border-pf-border bg-pf-surface-2 px-3 py-2.5 text-sm text-pf-text placeholder:text-pf-text-muted outline-none resize-none transition-colors focus:border-pf-accent/50"

const inputClass =
  "h-9 w-24 rounded-lg border border-pf-border bg-pf-surface-2 px-3 text-sm text-pf-text outline-none transition-colors focus:border-pf-accent/50"

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-pf-text-sec">{children}</span>
      {hint && <span className="text-xs text-pf-text-muted">{hint}</span>}
    </div>
  )
}

export function AgentTab({ workspace, salesPipelines = [], initialRoutingConfig }: AgentTabProps) {
  const raw = workspace.agent_config as Partial<AgentConfig> | null ?? {}
  const [config, setConfig] = useState<AgentConfig>({
    enabled: raw.enabled ?? false,
    prompt: raw.prompt ?? "",
    knowledge: raw.knowledge ?? "",
    qualification_rules: raw.qualification_rules ?? "",
    out_of_hours_message: raw.out_of_hours_message ?? "",
    media_library: raw.media_library ?? [],
    business_hours: {
      enabled: raw.business_hours?.enabled ?? false,
      start: raw.business_hours?.start ?? "08:00",
      end: raw.business_hours?.end ?? "18:00",
      timezone: raw.business_hours?.timezone ?? "America/Sao_Paulo",
    },
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function patch<K extends keyof AgentConfig>(key: K, value: AgentConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
    setError(null)
  }

  function patchHours<K extends keyof AgentConfig["business_hours"]>(
    key: K,
    value: AgentConfig["business_hours"][K],
  ) {
    setConfig((prev) => ({
      ...prev,
      business_hours: { ...prev.business_hours, [key]: value },
    }))
    setSaved(false)
    setError(null)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const result = await saveAgentConfig(config)

    setSaving(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      <div>
        <h3 className="font-heading text-base font-bold text-pf-text">Agente IA</h3>
        <p className="mt-0.5 text-sm text-pf-text-muted">
          Configure o comportamento do agente que atenderá seus clientes no WhatsApp
        </p>
      </div>

      {/* Toggle ativar agente */}
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-pf-border bg-pf-surface-2 p-4">
        <div>
          <p className="text-sm font-medium text-pf-text">Ativar agente</p>
          <p className="mt-0.5 text-xs text-pf-text-muted">
            O agente passa a responder automaticamente no WhatsApp quando ativado
          </p>
        </div>
        <div
          onClick={() => patch("enabled", !config.enabled)}
          className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
            config.enabled ? "bg-pf-accent" : "bg-pf-border"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              config.enabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </div>
      </label>

      {/* Prompt base */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Label hint="Personalidade, tom de voz, restrições e comportamento do agente">
            Prompt base
          </Label>
          <HelpTooltip width={300} content={
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-pf-text">Prompt base</p>
              <p>Define a personalidade e regras do agente. Exemplos do que incluir:</p>
              <ul className="list-disc pl-4 flex flex-col gap-1">
                <li>Nome e empresa ("Você é a Ana, assistente da Empresa X")</li>
                <li>Tom de voz ("formal", "descontraído", "objetivo")</li>
                <li>O que nunca fazer ("nunca ofereça desconto sem aprovação")</li>
                <li>O que sempre coletar ("sempre peça nome e e-mail")</li>
              </ul>
            </div>
          } />
        </div>
        <textarea
          rows={8}
          className={textareaClass}
          placeholder="Ex: Você é a assistente virtual da empresa X. Seu tom é profissional e amigável. Nunca ofereça descontos acima de 10% sem aprovação do gerente. Sempre colete nome e telefone do cliente antes de apresentar propostas..."
          value={config.prompt}
          onChange={(e) => patch("prompt", e.target.value)}
          maxLength={5000}
        />
        <p className="text-right text-xs text-pf-text-muted">{config.prompt.length}/5000</p>
      </div>

      {/* Conhecimento do produto */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Label hint="Produtos, serviços, preços, FAQs e qualquer informação que o agente precisa conhecer">
            Conhecimento do produto
          </Label>
          <HelpTooltip width={300} content={
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-pf-text">Conhecimento do produto</p>
              <p>Tudo que o agente precisa saber para responder perguntas dos clientes:</p>
              <ul className="list-disc pl-4 flex flex-col gap-1">
                <li>Planos e preços</li>
                <li>Formas de pagamento aceitas</li>
                <li>Prazo de entrega / instalação</li>
                <li>Perguntas frequentes (FAQ)</li>
                <li>Restrições ("não atendemos fora do Brasil")</li>
              </ul>
            </div>
          } />
        </div>
        <textarea
          rows={8}
          className={textareaClass}
          placeholder="Ex: Nossos planos são: Starter R$99/mês (até 5 usuários), Pro R$299/mês (ilimitado). Não trabalhamos com pagamento via boleto. Suporte disponível de segunda a sexta das 9h às 18h..."
          value={config.knowledge}
          onChange={(e) => patch("knowledge", e.target.value)}
          maxLength={10000}
        />
        <p className="text-right text-xs text-pf-text-muted">{config.knowledge.length}/10000</p>
      </div>

      {/* Regras de qualificação */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Label hint="Quando mover um lead para cada etapa do pipeline">
            Regras de qualificação
          </Label>
          <HelpTooltip width={300} content={
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-pf-text">Regras de qualificação</p>
              <p>Instrui o agente sobre quando avançar o lead no pipeline. Exemplos:</p>
              <ul className="list-disc pl-4 flex flex-col gap-1">
                <li>Mover para "Proposta" quando confirmar interesse e fornecer e-mail</li>
                <li>Mover para "Negociação" quando pedir desconto ou prazo especial</li>
                <li>Marcar como perdido quando recusar explicitamente</li>
                <li>Coletar dados obrigatórios antes de avançar etapa</li>
              </ul>
            </div>
          } />
        </div>
        <textarea
          rows={5}
          className={textareaClass}
          placeholder="Ex: Mover para 'Proposta Enviada' quando o cliente confirmar interesse e fornecer o e-mail. Mover para 'Negociação' quando solicitar desconto ou prazo especial..."
          value={config.qualification_rules}
          onChange={(e) => patch("qualification_rules", e.target.value)}
          maxLength={3000}
        />
        <p className="text-right text-xs text-pf-text-muted">{config.qualification_rules.length}/3000</p>
      </div>

      {/* Horário de atendimento */}
      <div className="flex flex-col gap-3 rounded-xl border border-pf-border p-4">
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-pf-text">Horário de atendimento</p>
            <p className="mt-0.5 text-xs text-pf-text-muted">
              Fora do horário, o agente envia a mensagem configurada abaixo
            </p>
          </div>
          <div
            onClick={() => patchHours("enabled", !config.business_hours.enabled)}
            className={`relative h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors ${
              config.business_hours.enabled ? "bg-pf-accent" : "bg-pf-border"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                config.business_hours.enabled ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </div>
        </label>

        <div
          className={`flex flex-col gap-4 transition-opacity ${
            config.business_hours.enabled ? "opacity-100" : "pointer-events-none opacity-40"
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-pf-text-sec">Início</span>
              <input
                type="time"
                className={inputClass}
                value={config.business_hours.start}
                onChange={(e) => patchHours("start", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-pf-text-sec">Fim</span>
              <input
                type="time"
                className={inputClass}
                value={config.business_hours.end}
                onChange={(e) => patchHours("end", e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label hint="Mensagem enviada automaticamente fora do horário de atendimento">
              Mensagem fora do horário
            </Label>
            <textarea
              rows={3}
              className={textareaClass}
              placeholder="Ex: Olá! Nosso atendimento funciona de segunda a sexta das 9h às 18h. Deixe sua mensagem e retornaremos assim que possível!"
              value={config.out_of_hours_message}
              onChange={(e) => patch("out_of_hours_message", e.target.value)}
              maxLength={1000}
            />
            <p className="text-right text-xs text-pf-text-muted">
              {config.out_of_hours_message.length}/1000
            </p>
          </div>
        </div>
      </div>

      {/* Biblioteca de mídias */}
      <div className="flex flex-col gap-2">
        <AgentMediaLibrary
          mediaLibrary={config.media_library ?? []}
          onChange={(library: AgentMedia[]) => patch("media_library", library)}
        />
      </div>

      {/* Distribuição de leads */}
      <div className="flex flex-col gap-2">
        <div>
          <h4 className="text-sm font-semibold text-pf-text">Distribuição de Leads</h4>
          <p className="mt-0.5 text-xs text-pf-text-muted">
            Defina para quais pipelines o agente enviará os leads ao transferir, e em qual proporção
          </p>
        </div>
        <LeadRoutingSection
          initialConfig={initialRoutingConfig ?? { enabled: false, pipelines: [] }}
          salesPipelines={salesPipelines}
        />
      </div>

      {/* Salvar */}
      <div>
        {error && (
          <p className="mb-2 text-xs text-pf-negative">{error}</p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="flex h-9 items-center gap-2 rounded-lg bg-pf-accent px-4 text-sm font-semibold text-pf-bg transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          {saved && <Check className="size-3.5" />}
          {saved ? "Salvo!" : "Salvar configuração"}
        </button>
      </div>
    </form>
  )
}
