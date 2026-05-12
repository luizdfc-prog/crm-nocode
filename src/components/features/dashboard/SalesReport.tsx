"use client"

import { useState, useTransition } from "react"
import {
  DollarSign, TrendingUp, TrendingDown, Percent, ShoppingBag, BarChart2,
  ChevronDown, Calendar, Loader2,
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts"
import { getSalesReport } from "@/actions/deals"
import type { SalesReportData, SalesReportFilters } from "@/actions/deals"
import type { Pipeline } from "@/types"

const CHART_COLORS = ["#CAFF33", "#5B7FFF", "#2ED573", "#FF6B35", "#FF4757", "#A29BFE", "#00CEC9", "#FD79A8"]

type Preset = "month" | "quarter" | "year" | "all" | "custom"
const PRESETS: { key: Preset; label: string }[] = [
  { key: "month",   label: "Este mês" },
  { key: "quarter", label: "Últimos 3 meses" },
  { key: "year",    label: "Este ano" },
  { key: "all",     label: "Todo o período" },
  { key: "custom",  label: "Personalizado" },
]

function presetToRange(preset: Preset): { from: string; to: string } | null {
  const now = new Date()
  const pad = (d: Date) => d.toISOString().split("T")[0]
  const today = pad(now)
  switch (preset) {
    case "month": return { from: pad(new Date(now.getFullYear(), now.getMonth(), 1)), to: today }
    case "quarter": { const d = new Date(now); d.setMonth(d.getMonth() - 3); return { from: pad(d), to: today } }
    case "year": return { from: pad(new Date(now.getFullYear(), 0, 1)), to: today }
    default: return null
  }
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
}

function fmtMonth(m: string) {
  const [year, month] = m.split("-")
  const names = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
  return `${names[parseInt(month) - 1]}/${year.slice(2)}`
}

const selectClass =
  "h-8 rounded-lg border border-pf-border bg-pf-surface-2 pl-3 pr-7 text-xs text-pf-text outline-none transition-colors hover:border-pf-accent/40 focus:border-pf-accent/50 cursor-pointer appearance-none"
const inputClass =
  "h-8 rounded-lg border border-pf-border bg-pf-surface-2 px-3 text-xs text-pf-text outline-none transition-colors focus:border-pf-accent/50"

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  accent?: boolean
  positive?: boolean
  negative?: boolean
}

function KpiCard({ label, value, sub, icon: Icon, accent, positive, negative }: KpiCardProps) {
  const iconColor = accent ? "#CAFF33" : positive ? "#2ED573" : negative ? "#FF4757" : "#5B7FFF"
  const iconBg = accent ? "rgba(202,255,51,0.1)" : positive ? "rgba(46,213,115,0.1)" : negative ? "rgba(255,71,87,0.1)" : "rgba(91,127,255,0.1)"
  return (
    <div className="rounded-xl border border-pf-border bg-pf-surface p-4 flex gap-3 items-start">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: iconBg }}>
        <Icon className="w-4 h-4" style={{ color: iconColor }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-pf-text-muted mb-0.5">{label}</p>
        <p className="text-lg font-bold text-pf-text leading-tight">{value}</p>
        {sub && <p className="text-xs text-pf-text-sec mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

interface BarTooltipProps { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }
function EvolutionTooltip({ active, payload, label }: BarTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-pf-border bg-pf-surface px-3 py-2 shadow-lg text-xs space-y-1">
      <p className="font-medium text-pf-text">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

interface PieTooltipProps { active?: boolean; payload?: { name: string; value: number; payload: { label: string; count: number; value: number } }[] }
function DistTooltip({ active, payload }: PieTooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-pf-border bg-pf-surface px-3 py-2 shadow-lg text-xs space-y-0.5">
      <p className="font-medium text-pf-text">{d.label}</p>
      <p className="text-pf-text-sec">{d.count} deal{d.count !== 1 ? "s" : ""}</p>
      {d.value > 0 && <p className="text-pf-positive">{fmt(d.value)}</p>}
    </div>
  )
}

interface HBarTooltipProps { active?: boolean; payload?: { value: number; color: string }[]; label?: string }
function HBarTooltip({ active, payload, label }: HBarTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-pf-border bg-pf-surface px-3 py-2 shadow-lg text-xs space-y-0.5">
      <p className="font-medium text-pf-text">{label}</p>
      <p style={{ color: payload[0].color }}>{payload[0].value} ocorrências</p>
    </div>
  )
}

interface SalesReportProps {
  initialData: SalesReportData
  pipelines: Pipeline[]
}

export function SalesReport({ initialData, pipelines }: SalesReportProps) {
  const [data, setData] = useState(initialData)
  const [pipelineId, setPipelineId] = useState("")
  const [preset, setPreset] = useState<Preset>("all")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [isPending, startTransition] = useTransition()

  function buildFilters(pid: string, p: Preset, cfrom: string, cto: string): SalesReportFilters {
    const range = p === "custom"
      ? (cfrom || cto ? { from: cfrom || "2000-01-01", to: cto || new Date().toISOString().split("T")[0] } : null)
      : presetToRange(p)
    return {
      pipelineId: pid || undefined,
      dateFrom: range ? `${range.from}T00:00:00.000Z` : undefined,
      dateTo: range ? `${range.to}T23:59:59.999Z` : undefined,
    }
  }

  function applyFilters(pid: string, p: Preset, cfrom: string, cto: string) {
    const filters = buildFilters(pid, p, cfrom, cto)
    startTransition(async () => {
      const result = await getSalesReport(filters)
      if (result) setData(result)
    })
  }

  const closedTotal = data.wonDealsCount + data.lostDealsCount

  // Dados para o gráfico de evolução mensal
  const evolutionData = data.monthlyEvolution.map((m) => ({
    month: fmtMonth(m.month),
    Ganhos: m.won,
    Perdidos: m.lost,
    revenue: m.revenue,
  }))

  return (
    <div className="flex flex-col gap-6">

      {/* Cabeçalho + filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-pf-text">Relatório de Vendas</h2>
          <p className="mt-0.5 text-sm text-pf-text-muted">
            Análise de deals encerrados · Ganhos e Perdidos
          </p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <div className="flex flex-wrap items-center gap-2">
            {isPending && <Loader2 className="size-3.5 animate-spin text-pf-text-muted" />}
            <div className="relative">
              <select
                value={pipelineId}
                onChange={(e) => { setPipelineId(e.target.value); applyFilters(e.target.value, preset, customFrom, customTo) }}
                className={selectClass}
              >
                <option value="">Todos os pipelines</option>
                {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-pf-text-muted" />
            </div>
            <div className="relative">
              <select
                value={preset}
                onChange={(e) => {
                  const v = e.target.value as Preset
                  setPreset(v)
                  if (v !== "custom") applyFilters(pipelineId, v, "", "")
                }}
                className={selectClass}
              >
                {PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-pf-text-muted" />
            </div>
          </div>
          {preset === "custom" && (
            <div className="flex items-center gap-2">
              <Calendar className="size-3.5 text-pf-text-muted" />
              <input type="date" value={customFrom} onChange={(e) => { setCustomFrom(e.target.value); applyFilters(pipelineId, "custom", e.target.value, customTo) }} className={inputClass} />
              <span className="text-xs text-pf-text-muted">até</span>
              <input type="date" value={customTo} onChange={(e) => { setCustomTo(e.target.value); applyFilters(pipelineId, "custom", customFrom, e.target.value) }} className={inputClass} />
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className={`grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6 transition-opacity ${isPending ? "opacity-50" : ""}`}>
        <KpiCard
          label="Receita Total"
          value={fmt(data.totalRevenue)}
          sub={`${data.wonDealsCount} deal${data.wonDealsCount !== 1 ? "s" : ""} ganho${data.wonDealsCount !== 1 ? "s" : ""}`}
          icon={DollarSign}
          accent
        />
        <KpiCard
          label="Ticket Médio"
          value={fmt(data.avgTicket)}
          sub="por venda ganha"
          icon={ShoppingBag}
          positive
        />
        <KpiCard
          label="Taxa de Conversão"
          value={`${data.conversionRate}%`}
          sub={`${data.wonDealsCount} de ${closedTotal} encerrados`}
          icon={Percent}
          positive={data.conversionRate >= 50}
          negative={closedTotal > 0 && data.conversionRate < 50}
        />
        <KpiCard
          label="Vendas Ganhas"
          value={String(data.wonDealsCount)}
          sub={fmt(data.totalRevenue)}
          icon={TrendingUp}
          positive
        />
        <KpiCard
          label="Vendas Perdidas"
          value={String(data.lostDealsCount)}
          sub={closedTotal > 0 ? `${Math.round((data.lostDealsCount / closedTotal) * 100)}% dos encerrados` : "—"}
          icon={TrendingDown}
          negative={data.lostDealsCount > 0}
        />
        <KpiCard
          label="Em Negociação"
          value={String(data.openDealsCount)}
          sub={fmt(data.openDealsValue)}
          icon={BarChart2}
        />
      </div>

      {/* Evolução mensal */}
      {evolutionData.length > 0 && (
        <div className={`rounded-xl border border-pf-border bg-pf-surface p-5 transition-opacity ${isPending ? "opacity-50" : ""}`}>
          <p className="text-sm font-semibold text-pf-text mb-0.5">Evolução Mensal</p>
          <p className="text-xs text-pf-text-muted mb-4">Deals ganhos e perdidos por mês</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={evolutionData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#8A8A8F" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#8A8A8F" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<EvolutionTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
              <Bar dataKey="Ganhos" fill="#2ED573" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Perdidos" fill="#FF4757" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Distribuição por funil */}
      {data.funnelData.length > 0 && (
        <div className={`rounded-xl border border-pf-border bg-pf-surface p-5 transition-opacity ${isPending ? "opacity-50" : ""}`}>
          <p className="text-sm font-semibold text-pf-text mb-0.5">Distribuição por Etapa</p>
          <p className="text-xs text-pf-text-muted mb-4">Volume e valor por etapa do pipeline</p>
          <div className="space-y-2">
            {data.funnelData.map((stage) => {
              const max = Math.max(...data.funnelData.map((s) => s.count))
              const pct = max > 0 ? (stage.count / max) * 100 : 0
              const isWon = stage.stage === "Fechado Ganho"
              const isLost = stage.stage === "Fechado Perdido"
              return (
                <div key={stage.stage} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 text-xs text-pf-text-sec truncate">{stage.stage}</span>
                  <div className="flex-1 h-5 rounded-md overflow-hidden bg-pf-surface-2">
                    <div
                      className="h-full rounded-md transition-all"
                      style={{
                        width: `${pct}%`,
                        background: isWon ? "#2ED573" : isLost ? "#FF4757" : "#5B7FFF",
                        minWidth: stage.count > 0 ? "4px" : 0,
                      }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs font-medium text-pf-text">{stage.count}</span>
                  {stage.value > 0 && (
                    <span className="w-24 shrink-0 text-right text-xs text-pf-text-sec">{fmt(stage.value)}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Gráficos de campos personalizados */}
      {data.fieldDistributions.length > 0 && (
        <div className={`grid grid-cols-1 gap-4 lg:grid-cols-2 transition-opacity ${isPending ? "opacity-50" : ""}`}>
          {data.fieldDistributions.map((dist) => {
            const pieData = dist.data.slice(0, 8).map((d) => ({ ...d, name: d.label }))
            const barData = dist.data.slice(0, 10)
            const maxCount = dist.data[0]?.count ?? 1
            const isTextField = dist.fieldType === "text"

            return (
              <div key={dist.fieldKey} className="rounded-xl border border-pf-border bg-pf-surface p-5">
                <p className="text-sm font-semibold text-pf-text mb-0.5">{dist.fieldName}</p>
                <p className="text-xs text-pf-text-muted mb-4">{dist.total} registros</p>

                {isTextField ? (
                  /* Lista rankeada para campos de texto livre */
                  <div className="flex flex-col gap-2">
                    {dist.data.slice(0, 15).map((entry, index) => {
                      const pct = Math.round((entry.count / maxCount) * 100)
                      const color = CHART_COLORS[index % CHART_COLORS.length]
                      return (
                        <div key={entry.label} className="flex items-center gap-3">
                          <span className="w-4 shrink-0 text-right text-[10px] font-semibold text-pf-text-muted">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <span className="truncate text-xs font-medium text-pf-text">{entry.label}</span>
                              <span className="shrink-0 text-xs font-semibold text-pf-text">{entry.count}</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-pf-surface-2">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {dist.data.length > 15 && (
                      <p className="mt-1 text-center text-xs text-pf-text-muted">
                        +{dist.data.length - 15} valores únicos adicionais
                      </p>
                    )}
                  </div>
                ) : dist.data.length <= 6 ? (
                  /* Donut para poucos itens */
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%" cy="50%"
                          innerRadius={45} outerRadius={70}
                          dataKey="count"
                          paddingAngle={2}
                        >
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<DistTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-1.5 min-w-0">
                      {pieData.map((d, i) => (
                        <div key={d.label} className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-xs text-pf-text-sec truncate">{d.label}</span>
                          <span className="ml-auto pl-2 text-xs font-medium text-pf-text shrink-0">{d.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Barras horizontais para muitos itens */
                  <ResponsiveContainer width="100%" height={Math.min(barData.length * 28 + 8, 280)}>
                    <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "#8A8A8F" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 10, fill: "#8A8A8F" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<HBarTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={18}>
                        {barData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            )
          })}
        </div>
      )}

      {data.fieldDistributions.length === 0 && data.wonDealsCount === 0 && data.lostDealsCount === 0 && (
        <div className="rounded-xl border border-pf-border bg-pf-surface p-10 flex flex-col items-center justify-center gap-3">
          <BarChart2 className="w-10 h-10 text-pf-text-muted" />
          <p className="text-sm font-medium text-pf-text">Nenhum deal encerrado no período</p>
          <p className="text-xs text-pf-text-muted text-center max-w-sm">
            Mova deals para <strong>Fechado Ganho</strong> ou <strong>Fechado Perdido</strong> para ver o relatório de vendas aqui.
          </p>
        </div>
      )}

    </div>
  )
}
