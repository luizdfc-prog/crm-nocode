"use client"

import { useState, useTransition } from "react"
import { Loader2, ShoppingCart, MessageCircle, TrendingUp } from "lucide-react"
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
        <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 transition-opacity ${isPending ? "opacity-50" : ""}`}>

          {/* Adições ao carrinho */}
          <div
            className="rounded-xl border p-4 flex items-center gap-3"
            style={{ background: "#141416", borderColor: "#2A2A2E" }}
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "#CAFF3318" }}>
              <ShoppingCart className="size-5" style={{ color: "#CAFF33" }} />
            </div>
            <div>
              <p className="text-xs text-[#8A8A8F]">Adições ao carrinho</p>
              <p className="text-2xl font-bold text-[#E8E8E8]">{data.total_add_to_cart.toLocaleString("pt-BR")}</p>
            </div>
          </div>

          {/* Cliques no CTA do carrinho */}
          <div
            className="rounded-xl border p-4 flex items-center gap-3"
            style={{ background: "#141416", borderColor: "#2A2A2E" }}
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "#2ED57318" }}>
              <MessageCircle className="size-5" style={{ color: "#2ED573" }} />
            </div>
            <div>
              <p className="text-xs text-[#8A8A8F]">Pedidos enviados (WhatsApp)</p>
              <p className="text-2xl font-bold text-[#E8E8E8]">{data.total_cart_whatsapp_clicks.toLocaleString("pt-BR")}</p>
            </div>
          </div>

          {/* Taxa de conversão */}
          <div
            className="rounded-xl border p-4 flex items-center gap-3"
            style={{ background: "#141416", borderColor: "#2A2A2E" }}
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "#5B7FFF18" }}>
              <TrendingUp className="size-5" style={{ color: "#5B7FFF" }} />
            </div>
            <div>
              <p className="text-xs text-[#8A8A8F]">Carrinho → Pedido</p>
              <p
                className="text-2xl font-bold"
                style={{
                  color: data.conversion_rate >= 50 ? "#2ED573" : data.conversion_rate >= 20 ? "#FF6B35" : "#FF4757",
                }}
              >
                {data.conversion_rate}%
              </p>
              <p className="text-[10px] text-[#555559]">
                {data.conversion_rate >= 50 ? "Ótimo" : data.conversion_rate >= 20 ? "Médio" : "Baixo"}
              </p>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
