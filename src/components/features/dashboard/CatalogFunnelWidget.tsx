"use client"

import { useState, useTransition } from "react"
import { Loader2, MousePointerClick, Eye, MessageCircle, TrendingUp, ArrowDown, Calendar } from "lucide-react"
import { getCatalogFunnelStats } from "@/actions/catalogTracking"
import type { CatalogFunnelStats } from "@/actions/catalogTracking"

type PeriodKey = "7d" | "30d" | "90d" | "custom"
const PERIODS: { key: PeriodKey; label: string; days: number | undefined }[] = [
  { key: "7d",     label: "7d",          days: 7 },
  { key: "30d",    label: "30d",         days: 30 },
  { key: "90d",    label: "90d",         days: 90 },
  { key: "custom", label: "Personalizado", days: undefined },
]

const inputClass =
  "h-7 rounded-lg px-2.5 text-xs text-[#E8E8E8] outline-none transition-colors focus:border-[#CAFF33]"

function rate(value: number, color: string) {
  return (
    <span className="text-xs font-semibold" style={{ color }}>
      {value}%
    </span>
  )
}

function FunnelStep({
  icon: Icon,
  label,
  value,
  color,
  isFirst,
  conversionRate,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: string
  isFirst?: boolean
  conversionRate?: number
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      {!isFirst && (
        <div className="flex flex-col items-center gap-0.5 py-1">
          <ArrowDown className="size-3.5 text-[#555559]" />
          {conversionRate !== undefined && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: conversionRate >= 50 ? "#2ED57318" : conversionRate >= 20 ? "#FF6B3518" : "#FF475718",
                color: conversionRate >= 50 ? "#2ED573" : conversionRate >= 20 ? "#FF6B35" : "#FF4757",
              }}
            >
              {conversionRate}%
            </span>
          )}
        </div>
      )}
      <div
        className="w-full rounded-xl border px-4 py-3 flex items-center gap-3"
        style={{ background: "#141416", borderColor: "#2A2A2E" }}
      >
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}18` }}
        >
          <Icon className="size-4" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#8A8A8F]">{label}</p>
          <p className="text-lg font-bold text-[#E8E8E8]">{value.toLocaleString("pt-BR")}</p>
        </div>
      </div>
    </div>
  )
}

interface Props {
  initialData: CatalogFunnelStats | null
}

export function CatalogFunnelWidget({ initialData }: Props) {
  const [data, setData] = useState<CatalogFunnelStats | null>(initialData)
  const [activePeriod, setActivePeriod] = useState<PeriodKey>("30d")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [isPending, startTransition] = useTransition()

  function fetchData(key: PeriodKey, cfrom: string, cto: string) {
    startTransition(async () => {
      if (key === "custom") {
        const df = cfrom ? `${cfrom}T00:00:00.000Z` : undefined
        const dt = cto ? `${cto}T23:59:59.999Z` : undefined
        const next = await getCatalogFunnelStats(30, df, dt)
        setData(next)
      } else {
        const opt = PERIODS.find((p) => p.key === key)!
        const next = await getCatalogFunnelStats(opt.days as number)
        setData(next)
      }
    })
  }

  function changePeriod(key: PeriodKey) {
    setActivePeriod(key)
    if (key !== "custom") fetchData(key, "", "")
  }

  function handleCustomFrom(v: string) {
    setCustomFrom(v)
    fetchData("custom", v, customTo)
  }

  function handleCustomTo(v: string) {
    setCustomTo(v)
    fetchData("custom", customFrom, v)
  }

  const hasData = data && (data.visits > 0 || data.product_views > 0 || data.whatsapp_clicks > 0)

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-bold text-[#E8E8E8]">Funil do Catálogo</h2>
          <p className="mt-0.5 text-sm text-[#8A8A8F]">Conversão Campanha → Catálogo → WhatsApp</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => changePeriod(p.key)}
                disabled={isPending}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  backgroundColor: activePeriod === p.key ? "#CAFF33" : "#1A1A1E",
                  color: activePeriod === p.key ? "#0C0C0E" : "#8A8A8F",
                  border: `1px solid ${activePeriod === p.key ? "#CAFF33" : "#2A2A2E"}`,
                }}
              >
                {isPending && activePeriod === p.key ? <Loader2 className="size-3 animate-spin" /> : p.label}
              </button>
            ))}
          </div>
          {activePeriod === "custom" && (
            <div className="flex items-center gap-2">
              <Calendar className="size-3.5 text-[#555559]" />
              <input
                type="date"
                value={customFrom}
                onChange={(e) => handleCustomFrom(e.target.value)}
                className={inputClass}
                style={{ background: "#1A1A1E", border: "1px solid #2A2A2E" }}
              />
              <span className="text-xs text-[#555559]">até</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => handleCustomTo(e.target.value)}
                className={inputClass}
                style={{ background: "#1A1A1E", border: "1px solid #2A2A2E" }}
              />
            </div>
          )}
        </div>
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center rounded-xl border border-dashed border-[#2A2A2E]">
          <TrendingUp className="size-8 text-[#2A2A2E]" />
          <p className="text-sm text-[#555559]">Nenhum dado no período. O funil aparece assim que o catálogo receber visitas.</p>
        </div>
      ) : (
        <div className={`grid grid-cols-1 gap-4 lg:grid-cols-3 transition-opacity ${isPending ? "opacity-50" : ""}`}>

          {/* Funil principal */}
          <div className="lg:col-span-1 flex flex-col gap-0 rounded-xl border border-[#2A2A2E] p-4" style={{ background: "#141416" }}>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#555559] mb-3">Funil de conversão</p>
            <FunnelStep
              icon={Eye}
              label="Visitas ao catálogo"
              value={data.visits}
              color="#5B7FFF"
              isFirst
            />
            <FunnelStep
              icon={MousePointerClick}
              label="Visualizaram produto"
              value={data.product_views}
              color="#CAFF33"
              conversionRate={data.visit_to_product_rate}
            />
            <FunnelStep
              icon={MessageCircle}
              label="Clicaram no WhatsApp"
              value={data.whatsapp_clicks}
              color="#2ED573"
              conversionRate={data.product_to_wa_rate}
            />

            {/* Taxa global */}
            <div className="mt-4 pt-3 border-t border-[#2A2A2E] flex items-center justify-between">
              <span className="text-xs text-[#555559]">Conversão global (visita → WhatsApp)</span>
              <span
                className="text-sm font-bold"
                style={{
                  color: data.visit_to_wa_rate >= 20 ? "#2ED573" : data.visit_to_wa_rate >= 8 ? "#FF6B35" : "#FF4757",
                }}
              >
                {data.visit_to_wa_rate}%
              </span>
            </div>
          </div>

          {/* Por campanha */}
          <div className="lg:col-span-2 flex flex-col rounded-xl border border-[#2A2A2E] overflow-hidden" style={{ background: "#141416" }}>
            <div className="px-4 py-3 border-b border-[#2A2A2E] flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#555559]">Conversão por campanha (utm_campaign)</p>
            </div>

            {data.by_campaign.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-xs text-[#555559]">
                Nenhuma campanha detectada no período.
              </div>
            ) : (
              <div className="divide-y divide-[#2A2A2E]">
                {/* Cabeçalho */}
                <div className="grid grid-cols-4 px-4 py-2 text-[10px] uppercase tracking-wider text-[#555559]">
                  <span className="col-span-2">Campanha</span>
                  <span className="text-right">Visitas</span>
                  <span className="text-right">WhatsApp</span>
                </div>
                {data.by_campaign.map((row) => (
                  <div key={row.campaign} className="grid grid-cols-4 items-center px-4 py-2.5 gap-2">
                    <div className="col-span-2 flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm text-[#E8E8E8] truncate font-medium">{row.campaign}</span>
                      {/* Barra de progresso */}
                      <div className="h-1 rounded-full bg-[#2A2A2E] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(row.rate, 100)}%`,
                            backgroundColor: row.rate >= 20 ? "#2ED573" : row.rate >= 8 ? "#FF6B35" : "#FF4757",
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-sm text-right text-[#8A8A8F]">{row.visits.toLocaleString("pt-BR")}</span>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-sm text-[#E8E8E8]">{row.whatsapp_clicks.toLocaleString("pt-BR")}</span>
                      <span
                        className="text-[10px] font-semibold"
                        style={{
                          color: row.rate >= 20 ? "#2ED573" : row.rate >= 8 ? "#FF6B35" : "#FF4757",
                        }}
                      >
                        {row.rate}%
      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Legenda de taxa */}
            <div className="px-4 py-2.5 border-t border-[#2A2A2E] flex items-center gap-4">
              <span className="text-[10px] text-[#555559]">Taxa (visita → WhatsApp):</span>
              <span className="flex items-center gap-1 text-[10px] text-[#2ED573]">● ≥ 20% boa</span>
              <span className="flex items-center gap-1 text-[10px] text-[#FF6B35]">● 8–19% média</span>
              <span className="flex items-center gap-1 text-[10px] text-[#FF4757]">● &lt; 8% baixa</span>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
