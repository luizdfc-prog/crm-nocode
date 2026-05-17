"use client"

import { useState, useTransition } from "react"
import { Loader2, ShoppingCart, MessageCircle, TrendingUp, TrendingDown, Package } from "lucide-react"
import { getCatalogCartStats } from "@/actions/catalogTracking"
import type { CatalogCartStats } from "@/types"

const PERIODS = [
  { label: "7d",  days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
]

interface Props {
  initialData: CatalogCartStats | null
}

export function CatalogCartWidget({ initialData }: Props) {
  const [data, setData] = useState<CatalogCartStats | null>(initialData)
  const [days, setDays] = useState(30)
  const [isPending, startTransition] = useTransition()

  function changePeriod(d: number) {
    setDays(d)
    startTransition(async () => {
      const next = await getCatalogCartStats(d)
      setData(next)
    })
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
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              onClick={() => changePeriod(p.days)}
              disabled={isPending}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor: days === p.days ? "#CAFF33" : "#1A1A1E",
                color: days === p.days ? "#0C0C0E" : "#8A8A8F",
                border: `1px solid ${days === p.days ? "#CAFF33" : "#2A2A2E"}`,
              }}
            >
              {isPending && days === p.days ? <Loader2 className="size-3 animate-spin" /> : p.label}
            </button>
          ))}
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
