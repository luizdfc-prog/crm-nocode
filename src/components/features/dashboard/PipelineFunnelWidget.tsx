"use client"

import { useState } from "react"
import { TrendingDown, ArrowRight, ChevronDown, ChevronUp } from "lucide-react"
import type { PipelineFunnelStats } from "@/actions/deals"

interface Props {
  data: PipelineFunnelStats[]
}

function ConversionBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-pf-surface-2">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  )
}

function PipelineFunnel({ pipeline }: { pipeline: PipelineFunnelStats }) {
  const [showLost, setShowLost] = useState(false)

  const maxCount = Math.max(...pipeline.stages.map((s) => s.count), 1)
  const hasLostReasons = (pipeline.lostReasons?.length ?? 0) > 0
  const hasTransfers = (pipeline.transferBreakdown?.length ?? 0) > 0

  const totalTransferred = pipeline.transferBreakdown?.reduce((s, t) => s + t.count, 0) ?? 0

  return (
    <div className="rounded-xl border border-pf-border bg-pf-surface p-5">
      {/* Cabeçalho */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-pf-text">{pipeline.pipelineName}</p>
          <p className="text-xs text-pf-text-muted mt-0.5">
            {pipeline.totalDeals} deal{pipeline.totalDeals !== 1 ? "s" : ""} no total
          </p>
        </div>
        <span
          className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={
            pipeline.pipelineType === "agent"
              ? { backgroundColor: "rgba(91,127,255,0.15)", color: "#5B7FFF", border: "1px solid rgba(91,127,255,0.3)" }
              : { backgroundColor: "rgba(46,213,115,0.12)", color: "#2ED573", border: "1px solid rgba(46,213,115,0.25)" }
          }
        >
          {pipeline.pipelineType === "agent" ? "Agente IA" : pipeline.pipelineType === "sales" ? "Vendas" : "Custom"}
        </span>
      </div>

      {/* Etapas do funil */}
      {pipeline.stages.length === 0 ? (
        <p className="text-xs text-pf-text-muted">Nenhuma etapa configurada</p>
      ) : (
        <div className="flex flex-col gap-3">
          {pipeline.stages.map((stage, idx) => {
            const barPct = maxCount > 0 ? (stage.count / maxCount) * 100 : 0
            return (
              <div key={stage.stageId}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="shrink-0 size-2 rounded-full"
                      style={{ backgroundColor: stage.stageColor }}
                    />
                    <span className="text-xs text-pf-text truncate">{stage.stageName}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {idx > 0 && stage.conversionFromPrev !== null && (
                      <span
                        className="text-[10px] font-medium"
                        style={{ color: stage.conversionFromPrev >= 50 ? "#2ED573" : stage.conversionFromPrev >= 25 ? "#FF6B35" : "#FF4757" }}
                      >
                        {stage.conversionFromPrev}%
                      </span>
                    )}
                    <span className="text-xs font-semibold text-pf-text w-6 text-right">{stage.count}</span>
                  </div>
                </div>
                <ConversionBar pct={barPct} color={stage.stageColor} />
              </div>
            )
          })}
        </div>
      )}

      {/* Transferências (apenas agente) */}
      {hasTransfers && (
        <div className="mt-4 pt-4 border-t border-pf-border">
          <p className="text-xs font-semibold text-pf-text mb-2 flex items-center gap-1.5">
            <ArrowRight className="size-3 text-pf-accent" />
            Transferidos para Vendas
            <span className="ml-auto text-pf-text-muted font-normal">{totalTransferred} total</span>
          </p>
          <div className="flex flex-col gap-1.5">
            {pipeline.transferBreakdown!.map((t) => {
              const pct = totalTransferred > 0 ? Math.round((t.count / totalTransferred) * 100) : 0
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

      {/* Motivos de perda (apenas agente) */}
      {hasLostReasons && (
        <div className="mt-4 pt-4 border-t border-pf-border">
          <button
            type="button"
            onClick={() => setShowLost((v) => !v)}
            className="w-full flex items-center gap-1.5 text-xs font-semibold text-pf-text mb-2"
          >
            <TrendingDown className="size-3 text-pf-negative" />
            Motivos de Perda
            <span className="ml-auto text-pf-text-muted font-normal">
              {pipeline.lostReasons!.reduce((s, r) => s + r.count, 0)} registros
            </span>
            {showLost
              ? <ChevronUp className="size-3 text-pf-text-muted" />
              : <ChevronDown className="size-3 text-pf-text-muted" />
            }
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
                    <ConversionBar pct={pct} color="#FF4757" />
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

export function PipelineFunnelWidget({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-pf-border bg-pf-surface py-16">
        <p className="text-sm text-pf-text-muted">Nenhum pipeline configurado</p>
      </div>
    )
  }

  // Separa agente dos demais para exibir agente primeiro
  const agentPipelines = data.filter((p) => p.pipelineType === "agent")
  const otherPipelines = data.filter((p) => p.pipelineType !== "agent")
  const ordered = [...agentPipelines, ...otherPipelines]

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold text-pf-text">Conversão por Funil</p>
        <p className="text-xs text-pf-text-muted mt-0.5">
          Taxa de avanço entre etapas em cada pipeline — % exibido é a conversão da etapa anterior
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {ordered.map((pipeline) => (
          <PipelineFunnel key={pipeline.pipelineId} pipeline={pipeline} />
        ))}
      </div>
    </div>
  )
}
