"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

interface FunnelChartProps {
  data: { stage: string; count: number; value: number }[]
}

interface TooltipPayloadItem {
  payload: { stage: string; count: number; value: number }
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-pf-border bg-pf-surface px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs font-medium text-pf-text">{d.stage}</p>
      <p className="text-xs text-pf-text-sec">
        {d.count} {d.count === 1 ? "negócio" : "negócios"}
      </p>
      <p className="text-xs text-pf-text-sec">
        {d.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
      </p>
    </div>
  )
}

export function FunnelChart({ data }: FunnelChartProps) {
  const max = Math.max(...data.map((d) => d.count), 1)

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
        barCategoryGap="30%"
      >
        <XAxis
          type="number"
          domain={[0, max]}
          tick={{ fill: "#555559", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="stage"
          width={148}
          tick={{ fill: "#8A8A8F", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: "rgba(202,255,51,0.04)" }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {data.map((entry, index) => {
            const opacity = 1 - (index / data.length) * 0.55
            return (
              <Cell
                key={entry.stage}
                fill={`rgba(202,255,51,${opacity})`}
              />
            )
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
