"use client"

import { useState, useTransition } from "react"
import { Loader2, ChevronDown, Calendar } from "lucide-react"
import { getFieldStats } from "@/actions/customFields"
import { FieldCharts } from "./FieldCharts"
import type { FieldStat, Pipeline } from "@/types"

interface FieldChartsSectionProps {
  initialStats: FieldStat[]
  pipelines: Pipeline[]
}

type Preset = "today" | "week" | "month" | "quarter" | "year" | "all" | "custom"

interface DateRange {
  from: string
  to: string
}

const PRESETS: { key: Preset; label: string }[] = [
  { key: "today",   label: "Hoje" },
  { key: "week",    label: "Esta semana" },
  { key: "month",   label: "Este mês" },
  { key: "quarter", label: "Últimos 3 meses" },
  { key: "year",    label: "Este ano" },
  { key: "all",     label: "Tudo" },
  { key: "custom",  label: "Personalizado" },
]

function presetToRange(preset: Preset): DateRange | null {
  const now = new Date()
  const pad = (d: Date) => d.toISOString().split("T")[0]
  const today = pad(now)

  switch (preset) {
    case "today":
      return { from: today, to: today }
    case "week": {
      const d = new Date(now)
      d.setDate(d.getDate() - d.getDay())
      return { from: pad(d), to: today }
    }
    case "month": {
      const d = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from: pad(d), to: today }
    }
    case "quarter": {
      const d = new Date(now)
      d.setMonth(d.getMonth() - 3)
      return { from: pad(d), to: today }
    }
    case "year": {
      const d = new Date(now.getFullYear(), 0, 1)
      return { from: pad(d), to: today }
    }
    case "all":
    case "custom":
      return null
  }
}

const selectClass =
  "h-8 rounded-lg border border-pf-border bg-pf-surface-2 pl-3 pr-7 text-xs text-pf-text outline-none transition-colors hover:border-pf-accent/40 focus:border-pf-accent/50 cursor-pointer appearance-none"

const inputClass =
  "h-8 rounded-lg border border-pf-border bg-pf-surface-2 px-3 text-xs text-pf-text outline-none transition-colors focus:border-pf-accent/50"

// Etapas globais disponíveis quando nenhum pipeline está selecionado
const GLOBAL_STAGES = [
  { id: "fechado_ganho",   label: "Fechado Ganho" },
  { id: "fechado_perdido", label: "Fechado Perdido" },
]

export function FieldChartsSection({ initialStats, pipelines }: FieldChartsSectionProps) {
  const [stats, setStats] = useState<FieldStat[]>(initialStats)
  const [pipelineId, setPipelineId] = useState<string>("")
  const [stageId, setStageId] = useState<string>("")
  const [preset, setPreset] = useState<Preset>("all")
  const [customFrom, setCustomFrom] = useState<string>("")
  const [customTo, setCustomTo] = useState<string>("")
  const [isPending, startTransition] = useTransition()

  const selectedPipeline = pipelines.find((p) => p.id === pipelineId)
  // Sem pipeline selecionado → mostra etapas globais; com pipeline → etapas do pipeline
  const stages = pipelineId ? (selectedPipeline?.stages ?? []) : []
  const globalStages = !pipelineId ? GLOBAL_STAGES : []

  function buildFilters(pid: string, sid: string, p: Preset, cfrom: string, cto: string) {
    const range = p === "custom"
      ? (cfrom || cto ? { from: cfrom || "2000-01-01", to: cto || new Date().toISOString().split("T")[0] } : null)
      : presetToRange(p)

    // sid pode ser um stage_id (pipeline_stages) ou um dealStage legado (fechado_ganho etc.)
    const isGlobalStage = GLOBAL_STAGES.some((g) => g.id === sid)

    return {
      pipelineId: pid || undefined,
      stageId: (!isGlobalStage && sid) ? sid : undefined,
      dealStage: (isGlobalStage && sid) ? sid : undefined,
      dateFrom: range ? `${range.from}T00:00:00.000Z` : undefined,
      dateTo: range ? `${range.to}T23:59:59.999Z` : undefined,
    }
  }

  function fetch(pid: string, sid: string, p: Preset, cfrom: string, cto: string) {
    startTransition(async () => {
      const result = await getFieldStats(buildFilters(pid, sid, p, cfrom, cto))
      setStats(result)
    })
  }

  function handlePipelineChange(v: string) {
    setPipelineId(v); setStageId("")
    fetch(v, "", preset, customFrom, customTo)
  }

  function handleStageChange(v: string) {
    setStageId(v)
    fetch(pipelineId, v, preset, customFrom, customTo)
  }

  function handlePresetChange(v: Preset) {
    setPreset(v)
    if (v !== "custom") fetch(pipelineId, stageId, v, "", "")
  }

  function handleCustomFrom(v: string) {
    setCustomFrom(v)
    fetch(pipelineId, stageId, "custom", v, customTo)
  }

  function handleCustomTo(v: string) {
    setCustomTo(v)
    fetch(pipelineId, stageId, "custom", customFrom, v)
  }

  if (initialStats.length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-pf-text">Análise de Campos</p>
            <p className="text-xs text-pf-text-muted">Distribuição dos campos personalizados</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isPending && <Loader2 className="size-3.5 animate-spin text-pf-text-muted" />}

            {/* Pipeline */}
            <div className="relative">
              <select value={pipelineId} onChange={(e) => handlePipelineChange(e.target.value)} className={selectClass}>
                <option value="">Todos os pipelines</option>
                {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-pf-text-muted" />
            </div>

            {/* Etapa */}
            <div className="relative">
              <select
                value={stageId}
                onChange={(e) => handleStageChange(e.target.value)}
                className={selectClass}
              >
                <option value="">Todas as etapas</option>
                {/* Sem pipeline: mostra Fechado Ganho / Fechado Perdido */}
                {globalStages.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
                {/* Com pipeline: mostra etapas do pipeline */}
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-pf-text-muted" />
            </div>

            {/* Separador */}
            <div className="h-5 w-px bg-pf-border" />

            {/* Período predefinido */}
            <div className="relative">
              <select value={preset} onChange={(e) => handlePresetChange(e.target.value as Preset)} className={selectClass}>
                {PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-pf-text-muted" />
            </div>
          </div>
        </div>

        {/* Intervalo personalizado */}
        {preset === "custom" && (
          <div className="flex items-center gap-2 self-end">
            <Calendar className="size-3.5 text-pf-text-muted" />
            <input
              type="date"
              value={customFrom}
              onChange={(e) => handleCustomFrom(e.target.value)}
              className={inputClass}
            />
            <span className="text-xs text-pf-text-muted">até</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => handleCustomTo(e.target.value)}
              className={inputClass}
            />
          </div>
        )}
      </div>

      {/* Gráficos */}
      {stats.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-xl border border-pf-border bg-pf-surface">
          <p className="text-sm text-pf-text-muted">Nenhum dado para a combinação selecionada</p>
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
