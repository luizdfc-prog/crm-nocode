"use client"

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import type { FieldStat } from "@/types"

const CHART_COLORS = [
  "#CAFF33",
  "#5B7FFF",
  "#2ED573",
  "#FF6B35",
  "#FF4757",
  "#A29BFE",
  "#00CEC9",
  "#FD79A8",
]

interface TooltipProps {
  active?: boolean
  payload?: { name: string; value: number; payload: { label: string; count: number } }[]
}

function DonutTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-pf-border bg-pf-surface px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-pf-text">{d.label}</p>
      <p className="text-xs text-pf-text-sec">{d.count} lead{d.count !== 1 ? "s" : ""}</p>
    </div>
  )
}

function BarTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-pf-border bg-pf-surface px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-pf-text">{d.label}</p>
      <p className="text-xs text-pf-text-sec">{d.count} lead{d.count !== 1 ? "s" : ""}</p>
    </div>
  )
}

interface FieldChartsProps {
  stat: FieldStat
}

// Lista rankeada para campos de texto livre
function TextRanking({ stat }: { stat: FieldStat }) {
  const { field, data, total } = stat
  const maxCount = data[0]?.count ?? 1
  // Exibe no máximo 15 entradas
  const visible = data.slice(0, 15)

  return (
    <div className="rounded-xl border border-pf-border bg-pf-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-pf-text">{field.name}</p>
          <p className="text-xs text-pf-text-muted">Valores mais frequentes</p>
        </div>
        <span className="rounded-md border border-pf-border px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-pf-text-muted">
          {total} lead{total !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {visible.map((entry, index) => {
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
                  <span className="shrink-0 text-xs font-semibold text-pf-text">
                    {entry.count}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-pf-surface-2">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            </div>
          )
        })}
        {data.length > 15 && (
          <p className="mt-1 text-center text-xs text-pf-text-muted">
            +{data.length - 15} valores únicos adicionais
          </p>
        )}
      </div>
    </div>
  )
}

export function FieldCharts({ stat }: FieldChartsProps) {
  // Campos de texto: lista rankeada
  if (stat.field.field_type === "text") {
    return <TextRanking stat={stat} />
  }

  const { field, data, total } = stat

  return (
    <div className="rounded-xl border border-pf-border bg-pf-surface p-5">
      {/* Cabeçalho */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-pf-text">{field.name}</p>
          <p className="text-xs text-pf-text-muted">Distribuição por categoria</p>
        </div>
        <span className="rounded-md border border-pf-border px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-pf-text-muted">
          {total} lead{total !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Donut — distribuição % */}
        <div>
          <p className="mb-3 text-xs font-medium text-pf-text-sec">Distribuição percentual</p>
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={72}
                  paddingAngle={2}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={entry.label}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Legenda */}
            <ul className="flex flex-col gap-1.5">
              {data.map((entry, index) => {
                const pct = Math.round((entry.count / total) * 100)
                return (
                  <li key={entry.label} className="flex items-center gap-2 text-xs">
                    <span
                      className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <span className="text-pf-text-sec truncate max-w-[120px]">{entry.label}</span>
                    <span className="ml-auto pl-2 font-semibold text-pf-text">{pct}%</span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        {/* Barras — quantidade absoluta */}
        <div>
          <p className="mb-3 text-xs font-medium text-pf-text-sec">Quantidade por categoria</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={data}
              margin={{ top: 0, right: 8, bottom: 0, left: -16 }}
              barCategoryGap="30%"
            >
              <CartesianGrid vertical={false} stroke="rgba(42,42,46,0.8)" />
              <XAxis
                dataKey="label"
                tick={{ fill: "#8A8A8F", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={0}
                tickFormatter={(v: string) => v.length > 10 ? v.slice(0, 10) + "…" : v}
              />
              <YAxis
                tick={{ fill: "#555559", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<BarTooltip />} cursor={{ fill: "rgba(202,255,51,0.04)" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {data.map((entry, index) => (
                  <Cell
                    key={entry.label}
                    fill={`rgba(202,255,51,${1 - (index / data.length) * 0.55})`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
