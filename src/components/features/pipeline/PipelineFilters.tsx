"use client"

import { useState } from "react"
import { Search, X, SlidersHorizontal, ChevronDown } from "lucide-react"
import type { Profile, PipelineStage, DealStage } from "@/types"

export interface PipelineFilterState {
  search: string
  ownerId: string | "all"
  stageId: string | "all"
  period: "all" | "today" | "week" | "month" | "quarter"
  isReturn: boolean
}

export const PIPELINE_FILTER_DEFAULT: PipelineFilterState = {
  search: "",
  ownerId: "all",
  stageId: "all",
  period: "all",
  isReturn: false,
}

const PERIOD_OPTIONS = [
  { value: "all",     label: "Qualquer período" },
  { value: "today",   label: "Hoje" },
  { value: "week",    label: "Esta semana" },
  { value: "month",   label: "Este mês" },
  { value: "quarter", label: "Este trimestre" },
] as const

interface PipelineFiltersProps {
  filters: PipelineFilterState
  onChange: (f: PipelineFilterState) => void
  stages: PipelineStage[]
  members: Pick<Profile, "id" | "name">[]
  totalDeals: number
  filteredDeals: number
}

export function PipelineFilters({
  filters,
  onChange,
  stages,
  members,
  totalDeals,
  filteredDeals,
}: PipelineFiltersProps) {
  const [showExtra, setShowExtra] = useState(false)

  const set = (partial: Partial<PipelineFilterState>) =>
    onChange({ ...filters, ...partial })

  const hasActive =
    filters.search ||
    filters.ownerId !== "all" ||
    filters.stageId !== "all" ||
    filters.period !== "all" ||
    filters.isReturn

  function clearAll() {
    onChange(PIPELINE_FILTER_DEFAULT)
    setShowExtra(false)
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Linha 1: busca + botão de filtros extras + limpar */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="flex h-9 flex-1 items-center gap-2 rounded-lg border border-pf-border bg-pf-surface px-3 transition-colors focus-within:border-pf-accent/50">
          <Search className="size-4 shrink-0 text-pf-text-muted" />
          <input
            type="text"
            placeholder="Buscar por nome, lead, telefone…"
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
            className="flex-1 bg-transparent text-sm text-pf-text placeholder:text-pf-text-muted outline-none"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => set({ search: "" })}
              className="text-pf-text-muted hover:text-pf-text transition-colors"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Toggle filtros extras */}
        <button
          type="button"
          onClick={() => setShowExtra((v) => !v)}
          className={[
            "flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors",
            showExtra || hasActive
              ? "border-pf-accent/50 bg-pf-accent/10 text-pf-accent"
              : "border-pf-border bg-pf-surface text-pf-text-muted hover:text-pf-text",
          ].join(" ")}
        >
          <SlidersHorizontal className="size-3.5" />
          Filtros
          {hasActive && (
            <span className="flex size-4 items-center justify-center rounded-full text-[9px] font-bold leading-none" style={{ backgroundColor: "#CAFF33", color: "#0C0C0E" }}>
              {[
                filters.search ? 1 : 0,
                filters.ownerId !== "all" ? 1 : 0,
                filters.stageId !== "all" ? 1 : 0,
                filters.period !== "all" ? 1 : 0,
                filters.isReturn ? 1 : 0,
              ].reduce((a, b) => a + b, 0)}
            </span>
          )}
        </button>

        {/* Limpar tudo */}
        {hasActive && (
          <button
            type="button"
            onClick={clearAll}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-pf-border px-3 text-sm text-pf-text-muted hover:text-pf-text transition-colors"
          >
            <X className="size-3.5" />
            Limpar
          </button>
        )}
      </div>

      {/* Linha 2: filtros extras (expande) */}
      {showExtra && (
        <div className="flex flex-wrap items-center gap-2">
          {/* Período */}
          <div className="relative">
            <select
              value={filters.period}
              onChange={(e) => set({ period: e.target.value as PipelineFilterState["period"] })}
              className={[
                "h-9 appearance-none rounded-lg border bg-pf-surface pl-3 pr-8 text-sm outline-none transition-colors focus:border-pf-accent/50",
                filters.period !== "all" ? "border-pf-accent/50 text-pf-text" : "border-pf-border text-pf-text-muted",
              ].join(" ")}
            >
              {PERIOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-pf-text-muted" />
          </div>

          {/* Etapa */}
          {stages.length > 0 && (
            <div className="relative">
              <select
                value={filters.stageId}
                onChange={(e) => set({ stageId: e.target.value })}
                className={[
                  "h-9 appearance-none rounded-lg border bg-pf-surface pl-3 pr-8 text-sm outline-none transition-colors focus:border-pf-accent/50",
                  filters.stageId !== "all" ? "border-pf-accent/50 text-pf-text" : "border-pf-border text-pf-text-muted",
                ].join(" ")}
              >
                <option value="all">Todas as etapas</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-pf-text-muted" />
            </div>
          )}

          {/* Responsável */}
          {members.length > 0 && (
            <div className="relative">
              <select
                value={filters.ownerId}
                onChange={(e) => set({ ownerId: e.target.value })}
                className={[
                  "h-9 appearance-none rounded-lg border bg-pf-surface pl-3 pr-8 text-sm outline-none transition-colors focus:border-pf-accent/50",
                  filters.ownerId !== "all" ? "border-pf-accent/50 text-pf-text" : "border-pf-border text-pf-text-muted",
                ].join(" ")}
              >
                <option value="all">Todos os responsáveis</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-pf-text-muted" />
            </div>
          )}

          {/* Toggle Retorno */}
          <button
            type="button"
            onClick={() => set({ isReturn: !filters.isReturn })}
            className={[
              "flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors",
              filters.isReturn
                ? "border-[#FF4757]/50 bg-[#FF4757]/10 text-[#FF4757]"
                : "border-pf-border bg-pf-surface text-pf-text-muted hover:text-pf-text",
            ].join(" ")}
          >
            Apenas retornos
          </button>
        </div>
      )}

      {/* Contagem quando filtrado */}
      {hasActive && filteredDeals < totalDeals && (
        <p className="text-xs text-pf-text-muted">
          Mostrando <span className="font-medium text-pf-text">{filteredDeals}</span> de{" "}
          <span className="font-medium text-pf-text">{totalDeals}</span> negócios
        </p>
      )}
    </div>
  )
}

// Utilitário: aplica filtros sobre lista de deals (usado no PipelineClient)
export function applyPipelineFilters<T extends {
  title: string
  stage_id: string | null
  owner_id: string | null
  created_at: string
  is_return: boolean
  lead?: { name?: string; phone?: string | null; company?: string | null } | null
}>(deals: T[], filters: PipelineFilterState): T[] {
  const { search, ownerId, stageId, period, isReturn } = filters

  // Período: início do intervalo
  let periodStart: Date | null = null
  const now = new Date()
  if (period === "today") {
    periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  } else if (period === "week") {
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    periodStart = new Date(now.getFullYear(), now.getMonth(), diff)
  } else if (period === "month") {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  } else if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3)
    periodStart = new Date(now.getFullYear(), q * 3, 1)
  }

  return deals.filter((d) => {
    // Busca textual: título do deal, nome/telefone/empresa do lead
    if (search) {
      const q = search.toLowerCase()
      const qDigits = search.replace(/\D/g, "")
      const phoneDigits = (d.lead?.phone ?? "").replace(/\D/g, "")
      const matchText =
        d.title.toLowerCase().includes(q) ||
        (d.lead?.name ?? "").toLowerCase().includes(q) ||
        (d.lead?.company ?? "").toLowerCase().includes(q) ||
        (qDigits && phoneDigits.includes(qDigits))
      if (!matchText) return false
    }

    if (ownerId !== "all" && d.owner_id !== ownerId) return false
    if (stageId !== "all" && d.stage_id !== stageId) return false
    if (isReturn && !d.is_return) return false

    if (periodStart) {
      const created = new Date(d.created_at)
      if (created < periodStart) return false
    }

    return true
  })
}
