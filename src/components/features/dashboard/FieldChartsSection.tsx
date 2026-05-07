"use client"

import { useState, useTransition } from "react"
import { Loader2, ChevronDown } from "lucide-react"
import { getFieldStats } from "@/actions/customFields"
import { FieldCharts } from "./FieldCharts"
import type { FieldStat, Pipeline } from "@/types"

interface FieldChartsSectionProps {
  initialStats: FieldStat[]
  pipelines: Pipeline[]
}

const selectClass =
  "flex h-8 items-center gap-1.5 rounded-lg border border-pf-border bg-pf-surface-2 pl-3 pr-2 text-xs text-pf-text outline-none transition-colors hover:border-pf-accent/40 focus:border-pf-accent/50 cursor-pointer appearance-none"

export function FieldChartsSection({ initialStats, pipelines }: FieldChartsSectionProps) {
  const [stats, setStats] = useState<FieldStat[]>(initialStats)
  const [pipelineId, setPipelineId] = useState<string>("")
  const [stageId, setStageId] = useState<string>("")
  const [isPending, startTransition] = useTransition()

  const selectedPipeline = pipelines.find((p) => p.id === pipelineId)
  const stages = selectedPipeline?.stages ?? []

  function handlePipelineChange(newPipelineId: string) {
    setPipelineId(newPipelineId)
    setStageId("") // reseta stage ao trocar pipeline
    fetchStats(newPipelineId, "")
  }

  function handleStageChange(newStageId: string) {
    setStageId(newStageId)
    fetchStats(pipelineId, newStageId)
  }

  function fetchStats(pid: string, sid: string) {
    startTransition(async () => {
      const filters = {
        pipelineId: pid || undefined,
        stageId: sid || undefined,
      }
      const result = await getFieldStats(filters)
      setStats(result)
    })
  }

  if (initialStats.length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho da seção com filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-pf-text">Análise de Campos</p>
          <p className="text-xs text-pf-text-muted">Distribuição dos campos personalizados</p>
        </div>

        <div className="flex items-center gap-2">
          {isPending && <Loader2 className="size-3.5 animate-spin text-pf-text-muted" />}

          {/* Seletor de Pipeline */}
          <div className="relative">
            <select
              value={pipelineId}
              onChange={(e) => handlePipelineChange(e.target.value)}
              className={selectClass}
            >
              <option value="">Todos os pipelines</option>
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-pf-text-muted" />
          </div>

          {/* Seletor de Etapa */}
          <div className="relative">
            <select
              value={stageId}
              onChange={(e) => handleStageChange(e.target.value)}
              disabled={!pipelineId && stages.length === 0}
              className={`${selectClass} disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <option value="">Todas as etapas</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-pf-text-muted" />
          </div>
        </div>
      </div>

      {/* Gráficos */}
      {stats.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-xl border border-pf-border bg-pf-surface">
          <p className="text-sm text-pf-text-muted">
            Nenhum dado para a combinação selecionada
          </p>
        </div>
      ) : (
        <div className={`flex flex-col gap-4 transition-opacity ${isPending ? "opacity-50" : "opacity-100"}`}>
          {stats.map((stat) => (
            <FieldCharts key={stat.field.id} stat={stat} />
          ))}
        </div>
      )}
    </div>
  )
}
