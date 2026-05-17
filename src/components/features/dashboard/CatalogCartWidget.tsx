"use client"

import { useState, useTransition } from "react"
import { Loader2, ShoppingCart, MessageCircle, TrendingUp, TrendingDown, Package, Calendar, Bell, MousePointerClick } from "lucide-react"
import { getCatalogCartStats } from "@/actions/catalogTracking"
import type { CatalogCartStats } from "@/types"

type PeriodKey = "7d" | "30d" | "90d" | "custom"
const PERIODS: { key: PeriodKey; label: string; days: number | undefined }[] = [
  { key: "7d",     label: "7d",            days: 7 },
  { key: "30d",    label: "30d",           days: 30 },
  { key: "90d",    label: "90d",           days: 90 },
  { key: "custom", label: "Personalizado", days: undefined },
]

const inputClass =
  "h-7 rounded-lg px-2.5 text-xs text-[#E8E8E8] outline-none transition-colors focus:border-[#CAFF33]"

interface Props {
  initialData: CatalogCartStats | null
}

export function CatalogCartWidget({ initialData }: Props) {
  const [data, setData] = useState<CatalogCartStats | null>(initialData)
  const [activePeriod, setActivePeriod] = useState<PeriodKey>("30d")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [isPending, startTransition] = useTransition()

  function fetchData(key: PeriodKey, cfrom: string, cto: string) {
    startTransition(async () => {
      if (key === "custom") {
        const df = cfrom ? `${cfrom}T00:00:00.000Z` : undefined
        const dt = cto ? `${cto}T23:59:59.999Z` : undefined
        const next = await getCatalogCartStats(30, df, dt)
        setData(next)
      } else {
        const opt = PERIODS.find((p) => p.key === key)!
        const next = await getCatalogCartStats(opt.days as number)
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

  const hasData = data && (data.total_add_to_cart > 0 || data.total_cart_whatsapp_clicks > 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-bold text-[#E8E8E8]">Desempenho do Carrinho</h2>
          <p className="mt-0.5 text-sm text-[#8A8A8F]">Adições ao carrinho e conversão para WhatsApp</p>
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
        <div className="flex flex-col items-center gap-3 py-16 text-center rounded-xl border border-dashed border-[#2A2A2E]">
          <ShoppingCart className="size-8 text-[#2A2A2E]" />
          <p className="text-sm text-[#555559]">Nenhum dado no período. Os dados do carrinho aparecem assim que clientes começarem a adicionar produtos.</p>
        </div>
      ) : (
        <div className={`flex flex-col gap-4 transition-opacity ${isPending ? "opacity-50" : ""}`}>

          {/* Métricas principais — 4 cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Adições ao carrinho */}
            <div className="rounded-xl border p-4 flex items-center gap-3" style={{ background: "#141416", borderColor: "#2A2A2E" }}>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "#CAFF3318" }}>
                <ShoppingCart className="size-4" style={{ color: "#CAFF33" }} />
              </div>
              <div>
                <p className="text-[11px] text-[#8A8A8F]">Adições</p>
                <p className="text-xl font-bold text-[#E8E8E8]">{data.total_add_to_cart.toLocaleString("pt-BR")}</p>
              </div>
            </div>

            {/* Pedidos enviados */}
            <div className="rounded-xl border p-4 flex items-center gap-3" style={{ background: "#141416", borderColor: "#2A2A2E" }}>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "#2ED57318" }}>
                <MessageCircle className="size-4" style={{ color: "#2ED573" }} />
              </div>
              <div>
                <p className="text-[11px] text-[#8A8A8F]">Pedidos (WA)</p>
                <p className="text-xl font-bold text-[#E8E8E8]">{data.total_cart_whatsapp_clicks.toLocaleString("pt-BR")}</p>
              </div>
            </div>

            {/* Carrinhos abandonados */}
            <div className="rounded-xl border p-4 flex items-center gap-3" style={{ background: "#141416", borderColor: "#2A2A2E" }}>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "#FF475718" }}>
                <TrendingDown className="size-4" style={{ color: "#FF4757" }} />
              </div>
              <div>
                <p className="text-[11px] text-[#8A8A8F]">Abandonados</p>
                <p className="text-xl font-bold text-[#E8E8E8]">{data.total_abandoned.toLocaleString("pt-BR")}</p>
                <p className="text-[10px]" style={{ color: data.abandoned_rate >= 70 ? "#FF4757" : data.abandoned_rate >= 40 ? "#FF6B35" : "#2ED573" }}>
                  {data.abandoned_rate}% do total
                </p>
              </div>
            </div>

            {/* Taxa de conversão */}
            <div className="rounded-xl border p-4 flex items-center gap-3" style={{ background: "#141416", borderColor: "#2A2A2E" }}>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "#5B7FFF18" }}>
                <TrendingUp className="size-4" style={{ color: "#5B7FFF" }} />
              </div>
              <div>
                <p className="text-[11px] text-[#8A8A8F]">Conversão</p>
                <p className="text-xl font-bold" style={{ color: data.conversion_rate >= 50 ? "#2ED573" : data.conversion_rate >= 20 ? "#FF6B35" : "#FF4757" }}>
                  {data.conversion_rate}%
                </p>
                <p className="text-[10px] text-[#555559]">
                  {data.conversion_rate >= 50 ? "Ótimo" : data.conversion_rate >= 20 ? "Médio" : "Baixo"}
                </p>
              </div>
            </div>
          </div>

          {/* Recuperador de carrinho */}
          {data.total_recovery_shown > 0 && (
            <div className="rounded-xl border p-4 flex flex-col gap-3" style={{ background: "#141416", borderColor: "#2A2A2E" }}>
              <div className="flex items-center gap-2">
                <Bell className="size-4 text-[#8A8A8F]" />
                <p className="text-xs font-semibold text-[#8A8A8F] uppercase tracking-wide">Recuperador de carrinho abandonado</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1 rounded-xl border p-3" style={{ background: "#1A1A1E", borderColor: "#2A2A2E" }}>
                  <span className="text-[11px] text-[#8A8A8F]">Banners exibidos</span>
                  <span className="text-xl font-bold text-[#E8E8E8]">{data.total_recovery_shown}</span>
                </div>
                <div className="flex flex-col gap-1 rounded-xl border p-3" style={{ background: "#1A1A1E", borderColor: "#2A2A2E" }}>
                  <div className="flex items-center gap-1">
                    <MousePointerClick className="size-3 text-[#8A8A8F]" />
                    <span className="text-[11px] text-[#8A8A8F]">Clicaram em Ver</span>
                  </div>
                  <span className="text-xl font-bold text-[#E8E8E8]">{data.total_recovery_clicks}</span>
                </div>
                <div className="flex flex-col gap-1 rounded-xl border p-3" style={{ background: "#1A1A1E", borderColor: "#2A2A2E" }}>
                  <span className="text-[11px] text-[#8A8A8F]">Taxa de retorno</span>
                  <span
                    className="text-xl font-bold"
                    style={{ color: data.recovery_rate >= 40 ? "#2ED573" : data.recovery_rate >= 20 ? "#FF6B35" : "#FF4757" }}
                  >
                    {data.recovery_rate}%
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-[#555559]">
                Taxa de retorno = % de clientes que viram o banner e clicaram em "Ver" para reabrir o carrinho.
              </p>
            </div>
          )}

          {/* Produtos mais adicionados */}
          {data.top_products.length > 0 && (
            <div className="rounded-xl border p-4 flex flex-col gap-3" style={{ background: "#141416", borderColor: "#2A2A2E" }}>
              <div className="flex items-center gap-2">
                <Package className="size-4 text-[#8A8A8F]" />
                <p className="text-xs font-semibold text-[#8A8A8F] uppercase tracking-wide">Produtos mais adicionados</p>
              </div>
              <div className="flex flex-col gap-2">
                {data.top_products.map((p, i) => {
                  const max = data.top_products[0].count
                  const pct = max === 0 ? 0 : Math.round((p.count / max) * 100)
                  return (
                    <div key={p.product_name} className="flex items-center gap-3">
                      <span className="text-[11px] font-mono text-[#555559] w-4 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs text-[#E8E8E8] truncate">{p.product_name}</span>
                          <span className="text-xs font-bold text-[#CAFF33] shrink-0">{p.count}x</span>
                        </div>
                        <div className="h-1 rounded-full bg-[#2A2A2E] overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: "#CAFF33" }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
