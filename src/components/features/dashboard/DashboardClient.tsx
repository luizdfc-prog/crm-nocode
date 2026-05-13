"use client"

import { useState, useTransition } from "react"
import { Users, TrendingUp, DollarSign, Percent, Loader2, ChevronDown, Calendar, LayoutDashboard, FileBarChart2, ShoppingBag, GitMerge } from "lucide-react"
import { MetricCard } from "./MetricCard"
import { FunnelChart } from "./FunnelChart"
import { UpcomingDeals } from "./UpcomingDeals"
import { RecentActivity } from "./RecentActivity"
import { FieldCharts } from "./FieldCharts"
import { SalesReport } from "./SalesReport"
import { CatalogFunnelWidget } from "./CatalogFunnelWidget"
import { PipelineFunnelWidget } from "./PipelineFunnelWidget"
import { getDashboardMetrics } from "@/actions/deals"
import { getFieldStats } from "@/actions/customFields"
import type { Activity, Deal, FieldStat, Pipeline } from "@/types"
import type { DashboardFilters, SalesReportData, PipelineFunnelStats } from "@/actions/deals"
import type { CatalogFunnelStats } from "@/actions/catalogTracking"

type Preset = "today" | "yesterday" | "week" | "month" | "quarter" | "year" | "all" | "custom"

const PRESETS: { key: Preset; label: string }[] = [
  { key: "today",     label: "Hoje" },
  { key: "yesterday", label: "Ontem" },
  { key: "week",      label: "Esta semana" },
  { key: "month",     label: "Este mês" },
  { key: "quarter",   label: "Últimos 3 meses" },
  { key: "year",      label: "Este ano" },
  { key: "all",       label: "Tudo" },
  { key: "custom",    label: "Personalizado" },
]

const GLOBAL_STAGES = [
  { id: "fechado_ganho",   label: "Fechado Ganho" },
  { id: "fechado_perdido", label: "Fechado Perdido" },
]

function presetToRange(preset: Preset): { from: string; to: string } | null {
  const now = new Date()
  const pad = (d: Date) => d.toISOString().split("T")[0]
  const today = pad(now)

  switch (preset) {
    case "today":
      return { from: today, to: today }
    case "yesterday": {
      const d = new Date(now); d.setDate(d.getDate() - 1)
      const yesterday = pad(d)
      return { from: yesterday, to: yesterday }
    }
    case "week": {
      const d = new Date(now); d.setDate(d.getDate() - d.getDay())
      return { from: pad(d), to: today }
    }
    case "month": {
      const d = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from: pad(d), to: today }
    }
    case "quarter": {
      const d = new Date(now); d.setMonth(d.getMonth() - 3)
      return { from: pad(d), to: today }
    }
    case "year": {
      const d = new Date(now.getFullYear(), 0, 1)
      return { from: pad(d), to: today }
    }
    default:
      return null
  }
}

interface DashboardMetrics {
  totalLeads: number
  newLeadsThisWeek: number
  openDealsCount: number
  pipelineValue: number
  wonValue: number
  conversionRate: number
  wonDealsCount: number
  closedDealsCount: number
  funnelData: { stage: string; count: number; value: number }[]
  upcomingDeals: Deal[]
}

interface DashboardClientProps {
  initialMetrics: DashboardMetrics
  initialFieldStats: FieldStat[]
  initialActivities: Activity[]
  pipelines: Pipeline[]
  initialSalesReport: SalesReportData
  initialCatalogFunnel: CatalogFunnelStats | null
  initialFunnelStats: PipelineFunnelStats[]
}

const selectClass =
  "h-8 rounded-lg border border-pf-border bg-pf-surface-2 pl-3 pr-7 text-xs text-pf-text outline-none transition-colors hover:border-pf-accent/40 focus:border-pf-accent/50 cursor-pointer appearance-none"

const inputClass =
  "h-8 rounded-lg border border-pf-border bg-pf-surface-2 px-3 text-xs text-pf-text outline-none transition-colors focus:border-pf-accent/50"

type Tab = "overview" | "report" | "funnel" | "catalog"

export function DashboardClient({
  initialMetrics,
  initialFieldStats,
  initialActivities,
  pipelines,
  initialSalesReport,
  initialCatalogFunnel,
  initialFunnelStats,
}: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics)
  const [fieldStats, setFieldStats] = useState<FieldStat[]>(initialFieldStats)
  const [pipelineId, setPipelineId] = useState("")
  const [stageId, setStageId] = useState("")
  const [preset, setPreset] = useState<Preset>("all")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [isPending, startTransition] = useTransition()

  const selectedPipeline = pipelines.find((p) => p.id === pipelineId)
  const stages = pipelineId ? (selectedPipeline?.stages ?? []) : []
  const globalStages = !pipelineId ? GLOBAL_STAGES : []

  const urgentCount = metrics.upcomingDeals.filter((d) => {
    const due = new Date(d.due_date!).setHours(0, 0, 0, 0)
    const now = new Date().setHours(0, 0, 0, 0)
    return due <= now + 7 * 86_400_000
  }).length

  function buildFilters(pid: string, sid: string, p: Preset, cfrom: string, cto: string): DashboardFilters {
    const range = p === "custom"
      ? (cfrom || cto ? { from: cfrom || "2000-01-01", to: cto || new Date().toISOString().split("T")[0] } : null)
      : presetToRange(p)

    const isGlobalStage = GLOBAL_STAGES.some((g) => g.id === sid)

    return {
      pipelineId: pid || undefined,
      stageId: (!isGlobalStage && sid) ? sid : undefined,
      dealStage: (isGlobalStage && sid) ? sid : undefined,
      dateFrom: range ? `${range.from}T00:00:00.000Z` : undefined,
      dateTo: range ? `${range.to}T23:59:59.999Z` : undefined,
    }
  }

  function applyFilters(pid: string, sid: string, p: Preset, cfrom: string, cto: string) {
    const filters = buildFilters(pid, sid, p, cfrom, cto)
    startTransition(async () => {
      const [newMetrics, newStats] = await Promise.all([
        getDashboardMetrics(filters),
        getFieldStats({ ...filters, dealContext: "active" }),
      ])
      if (newMetrics) setMetrics(newMetrics)
      setFieldStats(newStats)
    })
  }

  function handlePipelineChange(v: string) {
    setPipelineId(v); setStageId("")
    applyFilters(v, "", preset, customFrom, customTo)
  }

  function handleStageChange(v: string) {
    setStageId(v)
    applyFilters(pipelineId, v, preset, customFrom, customTo)
  }

  function handlePresetChange(v: Preset) {
    setPreset(v)
    if (v !== "custom") applyFilters(pipelineId, stageId, v, "", "")
  }

  function handleCustomFrom(v: string) {
    setCustomFrom(v)
    applyFilters(pipelineId, stageId, "custom", v, customTo)
  }

  function handleCustomTo(v: string) {
    setCustomTo(v)
    applyFilters(pipelineId, stageId, "custom", customFrom, v)
  }

  const periodLabel = preset === "all" ? "nos últimos 7 dias" : `no período selecionado`

  return (
    <div className="flex flex-col gap-6">

      {/* Abas */}
      <div className="flex items-center gap-1 border-b border-pf-border">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "overview"
              ? "border-pf-accent text-pf-text"
              : "border-transparent text-pf-text-muted hover:text-pf-text"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Pipeline Ativo
        </button>
        <button
          onClick={() => setActiveTab("report")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "report"
              ? "border-pf-accent text-pf-text"
              : "border-transparent text-pf-text-muted hover:text-pf-text"
          }`}
        >
          <FileBarChart2 className="w-4 h-4" />
          Relatório de Vendas
        </button>
        <button
          onClick={() => setActiveTab("funnel")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "funnel"
              ? "border-pf-accent text-pf-text"
              : "border-transparent text-pf-text-muted hover:text-pf-text"
          }`}
        >
          <GitMerge className="w-4 h-4" />
          Funis
        </button>
        <button
          onClick={() => setActiveTab("catalog")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "catalog"
              ? "border-pf-accent text-pf-text"
              : "border-transparent text-pf-text-muted hover:text-pf-text"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Catálogo
        </button>
      </div>

      {/* Aba: Relatório de Vendas */}
      {activeTab === "report" && (
        <SalesReport initialData={initialSalesReport} pipelines={pipelines} />
      )}

      {/* Aba: Funis de Conversão */}
      {activeTab === "funnel" && (
        <PipelineFunnelWidget data={initialFunnelStats} />
      )}

      {/* Aba: Catálogo */}
      {activeTab === "catalog" && (
        <CatalogFunnelWidget initialData={initialCatalogFunnel} />
      )}

      {/* Aba: Pipeline Ativo */}
      {activeTab === "overview" && <>

      {/* Cabeçalho + filtros globais */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-pf-text">Visão Geral</h2>
          <p className="mt-0.5 text-sm text-pf-text-muted">
            Dados do workspace atual · atualizados agora
          </p>
        </div>

        <div className="flex flex-col gap-2 items-end">
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
              <select value={stageId} onChange={(e) => handleStageChange(e.target.value)} className={selectClass}>
                <option value="">Todas as etapas</option>
                {globalStages.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-pf-text-muted" />
            </div>

            <div className="h-5 w-px bg-pf-border" />

            {/* Período */}
            <div className="relative">
              <select value={preset} onChange={(e) => handlePresetChange(e.target.value as Preset)} className={selectClass}>
                {PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-pf-text-muted" />
            </div>
          </div>

          {preset === "custom" && (
            <div className="flex items-center gap-2">
              <Calendar className="size-3.5 text-pf-text-muted" />
              <input type="date" value={customFrom} onChange={(e) => handleCustomFrom(e.target.value)} className={inputClass} />
              <span className="text-xs text-pf-text-muted">até</span>
              <input type="date" value={customTo} onChange={(e) => handleCustomTo(e.target.value)} className={inputClass} />
            </div>
          )}
        </div>
      </div>

      {/* Cards de métricas */}
      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 transition-opacity ${isPending ? "opacity-50" : "opacity-100"}`}>
        <MetricCard
          label="Total de Leads"
          value={String(metrics.totalLeads)}
          icon={Users}
          description={`${metrics.newLeadsThisWeek} novo${metrics.newLeadsThisWeek !== 1 ? "s" : ""} ${periodLabel}`}
          change={metrics.newLeadsThisWeek > 0 ? `+${metrics.newLeadsThisWeek} ${periodLabel}` : `Nenhum novo ${periodLabel}`}
          changeType={metrics.newLeadsThisWeek > 0 ? "positive" : "neutral"}
        />
        <MetricCard
          label="Negócios Abertos"
          value={String(metrics.openDealsCount)}
          icon={TrendingUp}
          description="Em etapas ativas do pipeline"
          change={`${metrics.openDealsCount} ativo${metrics.openDealsCount !== 1 ? "s" : ""} agora`}
          changeType="neutral"
        />
        <MetricCard
          label="Valor do Pipeline"
          value={metrics.pipelineValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
          icon={DollarSign}
          description="Soma dos negócios em aberto"
          change={
            metrics.openDealsCount > 0
              ? `Média de ${(metrics.pipelineValue / metrics.openDealsCount).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })} por negócio`
              : "Nenhum negócio aberto"
          }
          changeType="positive"
          accent
        />
        <MetricCard
          label="Taxa de Conversão"
          value={`${metrics.conversionRate}%`}
          icon={Percent}
          description={`${metrics.wonDealsCount} ganhos de ${metrics.closedDealsCount} encerrados`}
          change={
            metrics.closedDealsCount === 0
              ? "Nenhum negócio encerrado ainda"
              : metrics.conversionRate >= 50
              ? `${metrics.conversionRate}% acima da meta de 50%`
              : `Meta: 50% · faltam ${50 - metrics.conversionRate}pp`
          }
          changeType={metrics.closedDealsCount === 0 ? "neutral" : metrics.conversionRate >= 50 ? "positive" : "negative"}
        />
      </div>

      {/* Funil + Atividades */}
      <div className={`grid grid-cols-1 gap-4 lg:grid-cols-5 transition-opacity ${isPending ? "opacity-50" : "opacity-100"}`}>
        <div className="lg:col-span-3 rounded-xl border border-pf-border bg-pf-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-pf-text">Funil de Vendas</p>
              <p className="text-xs text-pf-text-muted">Negócios por etapa do pipeline</p>
            </div>
            <span className="rounded-md border border-pf-border px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-pf-text-muted">
              Ativos
            </span>
          </div>
          <FunnelChart data={metrics.funnelData} />
          <div className="mt-4 flex items-center justify-between border-t border-pf-border pt-3">
            <span className="text-xs text-pf-text-muted">Total encerrado (ganho)</span>
            <span className="text-sm font-semibold text-pf-positive">
              {metrics.wonValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-pf-border bg-pf-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-pf-text">Atividades Recentes</p>
              <p className="text-xs text-pf-text-muted">Últimas interações com leads</p>
            </div>
          </div>
          <RecentActivity activities={initialActivities} />
        </div>
      </div>

      {/* Negócios com prazo próximo */}
      <div className={`rounded-xl border border-pf-border bg-pf-surface p-5 transition-opacity ${isPending ? "opacity-50" : "opacity-100"}`}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-pf-text">Negócios com Prazo Próximo</p>
            <p className="text-xs text-pf-text-muted">
              {metrics.upcomingDeals.length > 0
                ? `${metrics.upcomingDeals.length} negócio${metrics.upcomingDeals.length > 1 ? "s" : ""} vencem nos próximos 30 dias`
                : "Nenhum prazo nos próximos 30 dias"}
            </p>
          </div>
          {urgentCount > 0 && (
            <span className="rounded-full bg-pf-warm/10 px-2.5 py-0.5 text-xs font-medium text-pf-warm">
              {urgentCount} urgente{urgentCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <UpcomingDeals deals={metrics.upcomingDeals} />
      </div>

      {/* Gráficos de campos personalizados */}
      {fieldStats.length > 0 && (
        <div className={`flex flex-col gap-4 transition-opacity ${isPending ? "opacity-50" : "opacity-100"}`}>
          <div>
            <p className="text-sm font-semibold text-pf-text">Análise de Campos</p>
            <p className="text-xs text-pf-text-muted">Distribuição dos campos personalizados</p>
          </div>
          {fieldStats.map((stat) => (
            <FieldCharts key={stat.field.id} stat={stat} />
          ))}
        </div>
      )}

      </>}
    </div>
  )
}
