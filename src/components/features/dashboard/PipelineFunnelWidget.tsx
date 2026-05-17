"use client"

import { useState, useTransition } from "react"
import { TrendingDown, ArrowRight, ChevronDown, ChevronUp, Users, Zap, MessageSquare, Loader2, Calendar } from "lucide-react"
import { getFunnelStats } from "@/actions/deals"
import type { PipelineFunnelStats } from "@/actions/deals"

interface Props {
  data: PipelineFunnelStats[]
}

type PeriodKey = "7d" | "30d" | "90d" | "365d" | "all" | "custom"
type PeriodOption = { key: PeriodKey; label: string; days: number | undefined }
const PERIOD_OPTIONS: PeriodOption[] = [
  { key: "7d",     label: "Últimos 7 dias",   days: 7 },
  { key: "30d",    label: "Últimos 30 dias",  days: 30 },
  { key: "90d",    label: "Últimos 90 dias",  days: 90 },
  { key: "365d",   label: "Últimos 365 dias", days: 365 },
  { key: "all",    label: "Todo período",     days: undefined },
  { key: "custom", label: "Personalizado",    days: undefined },
]

const inputClass =
  "h-7 rounded-lg border border-[#2A2A2E] bg-[#1A1A1E] px-2.5 text-xs text-[#E8E8E8] outline-none transition-colors focus:border-[#CAFF33]"

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-pf-surface-2">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-pf-surface-2 px-3 py-2.5 flex-1">
      <span className="text-[10px] uppercase tracking-wide text-pf-text-muted">{label}</span>
      <span className="text-lg font-bold" style={{ color: color ?? "var(--text)" }}>{value}</span>
      {sub && <span className="text-[10px] text-pf-text-muted">{sub}</span>}
    </div>
  )
}

function AgentFunnelCard({ pipeline }: { pipeline: PipelineFunnelStats }) {
  const [showLost, setShowLost] = useState(false)
  const ov = pipeline.agentOverview
  const core = pipeline.agentCoreFunnel ?? []
  const fup = pipeline.followUpEfficiency ?? []
  const hasLost = (pipeline.lostReasons?.length ?? 0) > 0
  const hasFollowUp = fup.length > 0
  const maxCoreCount = Math.max(...core.map((s) => s.count), 1)

  // Para pipelines não-agente: visão geral derivada do funil (entrada vs última etapa core)
  const genericOverview = !ov && core.length >= 2 ? (() => {
    const entrada = core[0].count
    const saida = core[core.length - 1].count
    const taxa = entrada > 0 ? Math.round((saida / entrada) * 100) : 0
    return { entrada, saida, taxa, labelEntrada: core[0].stageName, labelSaida: core[core.length - 1].stageName }
  })() : null

  return (
    <div className="rounded-xl border border-pf-border bg-pf-surface p-5 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-pf-text">{pipeline.pipelineName}</p>
          <p className="text-xs text-pf-text-muted mt-0.5">{pipeline.totalDeals} deal{pipeline.totalDeals !== 1 ? "s" : ""} no total</p>
        </div>
        {pipeline.pipelineType === "agent" && (
          <span className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ backgroundColor: "rgba(91,127,255,0.15)", color: "#5B7FFF", border: "1px solid rgba(91,127,255,0.3)" }}>
            Agente IA
          </span>
        )}
        {pipeline.pipelineType === "sales" && (
          <span className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ backgroundColor: "rgba(46,213,115,0.12)", color: "#2ED573", border: "1px solid rgba(46,213,115,0.25)" }}>
            Vendas
          </span>
        )}
        {pipeline.pipelineType === "custom" && (
          <span className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ backgroundColor: "rgba(255,107,53,0.12)", color: "#FF6B35", border: "1px solid rgba(255,107,53,0.25)" }}>
            Custom
          </span>
        )}
      </div>

      {/* Seção 1 — Visão Geral */}
      {ov && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <Users className="size-3.5 text-pf-accent" />
            <span className="text-xs font-semibold text-pf-text">Visão Geral</span>
          </div>
          <div className="flex gap-2">
            <StatCard label="Atendidos" value={ov.totalAtendidos} sub="total de leads" />
            <StatCard
              label="Transferidos"
              value={ov.totalTransferidos}
              sub={`${ov.taxaTransferencia}% do total`}
              color={ov.taxaTransferencia >= 40 ? "#2ED573" : ov.taxaTransferencia >= 20 ? "#FF6B35" : "#FF4757"}
            />
          </div>
          {/* Barra de progresso geral */}
          <div className="rounded-lg bg-pf-surface-2 px-3 py-2.5">
            <div className="flex justify-between mb-1.5">
              <span className="text-[10px] text-pf-text-muted">Taxa de conversão geral</span>
              <span className="text-[10px] font-semibold" style={{
                color: ov.taxaTransferencia >= 40 ? "#2ED573" : ov.taxaTransferencia >= 20 ? "#FF6B35" : "#FF4757"
              }}>{ov.taxaTransferencia}%</span>
            </div>
            <Bar pct={ov.taxaTransferencia} color={ov.taxaTransferencia >= 40 ? "#2ED573" : ov.taxaTransferencia >= 20 ? "#FF6B35" : "#FF4757"} />
          </div>
        </div>
      )}

      {/* Visão Geral — pipelines não-agente */}
      {genericOverview && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <Users className="size-3.5 text-pf-accent" />
            <span className="text-xs font-semibold text-pf-text">Visão Geral</span>
          </div>
          <div className="flex gap-2">
            <StatCard label={genericOverview.labelEntrada} value={genericOverview.entrada} sub="entrada no funil" />
            <StatCard
              label={genericOverview.labelSaida}
              value={genericOverview.saida}
              sub={`${genericOverview.taxa}% de conversão`}
              color={genericOverview.taxa >= 40 ? "#2ED573" : genericOverview.taxa >= 20 ? "#FF6B35" : "#FF4757"}
            />
          </div>
          <div className="rounded-lg bg-pf-surface-2 px-3 py-2.5">
            <div className="flex justify-between mb-1.5">
              <span className="text-[10px] text-pf-text-muted">Taxa de conversão geral</span>
              <span className="text-[10px] font-semibold" style={{
                color: genericOverview.taxa >= 40 ? "#2ED573" : genericOverview.taxa >= 20 ? "#FF6B35" : "#FF4757"
              }}>{genericOverview.taxa}%</span>
            </div>
            <Bar pct={genericOverview.taxa} color={genericOverview.taxa >= 40 ? "#2ED573" : genericOverview.taxa >= 20 ? "#FF6B35" : "#FF4757"} />
          </div>
        </div>
      )}

      {/* Seção 2 — Funil Limpo */}
      {core.length > 0 && (
        <div className="flex flex-col gap-2 pt-4 border-t border-pf-border">
          <div className="flex items-center gap-1.5">
            <Zap className="size-3.5 text-pf-accent" />
            <span className="text-xs font-semibold text-pf-text">
              {pipeline.pipelineType === "agent" ? "Funil de Qualificação" : "Etapas do Funil"}
            </span>
            <span className="ml-auto text-[10px] text-pf-text-muted">sem follow-ups</span>
          </div>
          <div className="flex flex-col gap-2.5">
            {core.map((s, idx) => {
              const barPct = maxCoreCount > 0 ? (s.count / maxCoreCount) * 100 : 0
              return (
                <div key={s.stageName}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0 size-2 rounded-full" style={{ backgroundColor: s.stageColor }} />
                      <span className="text-xs text-pf-text truncate">{s.stageName}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {idx > 0 && (
                        <span className="text-[10px] font-medium" style={{
                          color: s.pct >= 50 ? "#2ED573" : s.pct >= 25 ? "#FF6B35" : "#FF4757"
                        }}>{s.pct}%</span>
                      )}
                      <span className="text-xs font-semibold text-pf-text w-6 text-right">{s.count}</span>
                    </div>
                  </div>
                  <Bar pct={barPct} color={s.stageColor} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Seção 3 — Eficiência de Follow-ups */}
      {hasFollowUp && (
        <div className="flex flex-col gap-2 pt-4 border-t border-pf-border">
          <div className="flex items-center gap-1.5">
            <MessageSquare className="size-3.5 text-pf-accent" />
            <span className="text-xs font-semibold text-pf-text">Eficiência dos Follow-ups</span>
          </div>
          <p className="text-[10px] text-pf-text-muted -mt-1">
            % de leads que voltaram a responder por etapa de follow-up
          </p>
          <div className="flex flex-col gap-2.5">
            {fup.map((s) => (
              <div key={s.stageName}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0 size-2 rounded-full" style={{ backgroundColor: s.stageColor }} />
                    <span className="text-xs text-pf-text truncate">{s.stageName}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] text-pf-text-muted" title="responderam / passaram por esta etapa">
                      {s.leadsResponderam}/{s.entradas ?? s.leadsParados}
                    </span>
                    <span className="text-[10px] font-semibold w-8 text-right" style={{
                      color: s.taxaResposta >= 50 ? "#2ED573" : s.taxaResposta >= 25 ? "#FF6B35" : "#FF4757"
                    }}>{s.taxaResposta}%</span>
                  </div>
                </div>
                <Bar pct={s.taxaResposta} color={s.stageColor} />
                {s.leadsParados > 0 && (
                  <p className="text-[9px] text-pf-text-muted mt-0.5">{s.leadsParados} aguardando agora</p>
                )}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-pf-text-muted mt-1 leading-relaxed">
            Leads que voltam a responder são movidos de volta para <span className="text-pf-text">Qualificando</span> automaticamente.
          </p>
        </div>
      )}

      {/* Transferências */}
      {(pipeline.transferBreakdown?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-2 pt-4 border-t border-pf-border">
          <div className="flex items-center gap-1.5">
            <ArrowRight className="size-3.5 text-pf-accent" />
            <span className="text-xs font-semibold text-pf-text">Destino das Transferências</span>
            <span className="ml-auto text-[10px] text-pf-text-muted">
              {pipeline.transferBreakdown!.reduce((s, t) => s + t.count, 0)} total
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {pipeline.transferBreakdown!.map((t) => {
              const total = pipeline.transferBreakdown!.reduce((s, x) => s + x.count, 0)
              const pct = total > 0 ? Math.round((t.count / total) * 100) : 0
              return (
                <div key={t.targetPipelineId} className="flex items-center gap-2">
                  <span className="text-xs text-pf-text-muted flex-1 truncate">{t.targetPipelineName}</span>
                  <span className="text-xs font-medium text-pf-text">{t.count}</span>
                  <span className="text-[10px] text-pf-text-muted w-8 text-right">{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Motivos de perda */}
      {hasLost && (
        <div className="flex flex-col gap-2 pt-4 border-t border-pf-border">
          <button type="button" onClick={() => setShowLost((v) => !v)}
            className="w-full flex items-center gap-1.5 text-xs font-semibold text-pf-text">
            <TrendingDown className="size-3 text-pf-negative" />
            Motivos de Perda
            <span className="ml-auto text-pf-text-muted font-normal">
              {pipeline.lostReasons!.reduce((s, r) => s + r.count, 0)} registros
            </span>
            {showLost ? <ChevronUp className="size-3 text-pf-text-muted" /> : <ChevronDown className="size-3 text-pf-text-muted" />}
          </button>
          {showLost && (
            <div className="flex flex-col gap-1.5">
              {pipeline.lostReasons!.map((r) => {
                const total = pipeline.lostReasons!.reduce((s, x) => s + x.count, 0)
                const pct = total > 0 ? Math.round((r.count / total) * 100) : 0
                return (
                  <div key={r.reason}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-pf-text-muted truncate flex-1 pr-2">{r.reason}</span>
                      <span className="text-xs font-medium text-pf-negative">{r.count}</span>
                      <span className="text-[10px] text-pf-text-muted w-8 text-right">{pct}%</span>
                    </div>
                    <Bar pct={pct} color="#FF4757" />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SalesFunnelCard({ pipeline }: { pipeline: PipelineFunnelStats }) {
  const maxCount = Math.max(...pipeline.stages.map((s) => s.count), 1)
  return (
    <div className="rounded-xl border border-pf-border bg-pf-surface p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-pf-text">{pipeline.pipelineName}</p>
          <p className="text-xs text-pf-text-muted mt-0.5">{pipeline.totalDeals} deal{pipeline.totalDeals !== 1 ? "s" : ""} no total</p>
        </div>
        <span className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ backgroundColor: "rgba(46,213,115,0.12)", color: "#2ED573", border: "1px solid rgba(46,213,115,0.25)" }}>
          {pipeline.pipelineType === "sales" ? "Vendas" : "Custom"}
        </span>
      </div>
      {pipeline.stages.length === 0 ? (
        <p className="text-xs text-pf-text-muted">Nenhuma etapa configurada</p>
      ) : (
        <div className="flex flex-col gap-3">
          {pipeline.stages.map((stage, idx) => (
            <div key={stage.stageId}>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0 size-2 rounded-full" style={{ backgroundColor: stage.stageColor }} />
                  <span className="text-xs text-pf-text truncate">{stage.stageName}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {idx > 0 && stage.conversionFromPrev !== null && (
                    <span className="text-[10px] font-medium" style={{
                      color: stage.conversionFromPrev >= 50 ? "#2ED573" : stage.conversionFromPrev >= 25 ? "#FF6B35" : "#FF4757"
                    }}>{stage.conversionFromPrev}%</span>
                  )}
                  <span className="text-xs font-semibold text-pf-text w-6 text-right">{stage.count}</span>
                </div>
              </div>
              <Bar pct={maxCount > 0 ? (stage.count / maxCount) * 100 : 0} color={stage.stageColor} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function PipelineFunnelWidget({ data: initialData }: Props) {
  const [data, setData] = useState(initialData)
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>(PERIOD_OPTIONS[1]) // 30 dias default
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [isPending, startTransition] = useTransition()

  function fetchData(option: PeriodOption, cfrom: string, cto: string) {
    startTransition(async () => {
      if (option.key === "custom") {
        const df = cfrom ? `${cfrom}T00:00:00.000Z` : undefined
        const dt = cto ? `${cto}T23:59:59.999Z` : undefined
        const fresh = await getFunnelStats(undefined, df, dt)
        setData(fresh)
      } else {
        const fresh = await getFunnelStats(option.days)
        setData(fresh)
      }
    })
  }

  function handlePeriodChange(option: PeriodOption) {
    setSelectedPeriod(option)
    if (option.key !== "custom") fetchData(option, "", "")
  }

  function handleCustomFrom(v: string) {
    setCustomFrom(v)
    fetchData(selectedPeriod, v, customTo)
  }

  function handleCustomTo(v: string) {
    setCustomTo(v)
    fetchData(selectedPeriod, customFrom, v)
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-pf-border bg-pf-surface py-16">
        <p className="text-sm text-pf-text-muted">Nenhum pipeline configurado</p>
      </div>
    )
  }

  const agentPipelines = data.filter((p) => p.pipelineType === "agent")
  const otherPipelines = data.filter((p) => p.pipelineType !== "agent")
  const ordered = [...agentPipelines, ...otherPipelines]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-pf-text">Conversão por Funil</p>
          <p className="text-xs text-pf-text-muted mt-0.5">
            Visão geral, funil de qualificação e eficiência dos follow-ups
          </p>
        </div>
        {/* Filtro de período */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {isPending && <Loader2 className="size-3.5 animate-spin text-pf-text-muted" />}
            <div className="flex flex-wrap gap-1">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handlePeriodChange(opt)}
                  className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${
                    selectedPeriod.key === opt.key
                      ? "bg-pf-accent text-pf-bg font-semibold"
                      : "bg-pf-surface-2 text-pf-text-muted hover:text-pf-text"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {selectedPeriod.key === "custom" && (
            <div className="flex items-center gap-2">
              <Calendar className="size-3.5 text-pf-text-muted" />
              <input type="date" value={customFrom} onChange={(e) => handleCustomFrom(e.target.value)} className={inputClass} />
              <span className="text-xs text-pf-text-muted">até</span>
              <input type="date" value={customTo} onChange={(e) => handleCustomTo(e.target.value)} className={inputClass} />
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {ordered.map((pipeline) => (
          <AgentFunnelCard key={pipeline.pipelineId} pipeline={pipeline} />
        ))}
      </div>
    </div>
  )
}
