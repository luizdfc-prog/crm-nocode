"use client"

import { ChevronDown } from "lucide-react"
import { STATUS_CONFIG } from "./LeadStatusBadge"
import type { LeadStatus, Profile } from "@/types"
import { cn } from "@/lib/utils"

export type LeadPeriodFilter = "all" | "today" | "week" | "month" | "quarter"

const PERIOD_OPTIONS: { value: LeadPeriodFilter; label: string }[] = [
  { value: "all",     label: "Qualquer período" },
  { value: "today",   label: "Hoje" },
  { value: "week",    label: "Esta semana" },
  { value: "month",   label: "Este mês" },
  { value: "quarter", label: "Este trimestre" },
]

interface LeadFiltersProps {
  statusFilter: LeadStatus | "all"
  ownerFilter: string | "all"
  periodFilter: LeadPeriodFilter
  onStatusChange: (value: LeadStatus | "all") => void
  onOwnerChange: (value: string | "all") => void
  onPeriodChange: (value: LeadPeriodFilter) => void
  owners: Profile[]
}

function FilterSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  placeholder: string
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={cn(
          "h-9 appearance-none rounded-lg border border-pf-border bg-pf-surface pl-3 pr-8 text-sm outline-none transition-colors",
          "focus:border-pf-accent/50",
          value === "all" ? "text-pf-text-muted" : "text-pf-text"
        )}
      >
        <option value="all">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-pf-text-muted" />
    </div>
  )
}

export function LeadFilters({
  statusFilter,
  ownerFilter,
  periodFilter,
  onStatusChange,
  onOwnerChange,
  onPeriodChange,
  owners,
}: LeadFiltersProps) {
  const statusOptions = (Object.keys(STATUS_CONFIG) as LeadStatus[]).map((s) => ({
    value: s,
    label: STATUS_CONFIG[s].label,
  }))

  const ownerOptions = owners.map((o) => ({
    value: o.id,
    label: o.name,
  }))

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSelect
        value={periodFilter}
        onChange={onPeriodChange}
        options={PERIOD_OPTIONS}
        placeholder="Qualquer período"
      />
      <FilterSelect
        value={statusFilter}
        onChange={onStatusChange}
        options={statusOptions}
        placeholder="Todos os status"
      />
      <FilterSelect
        value={ownerFilter}
        onChange={onOwnerChange}
        options={ownerOptions}
        placeholder="Todos os responsáveis"
      />
    </div>
  )
}

/** Calcula o início do intervalo de período para filtrar por created_at */
export function getPeriodStart(period: LeadPeriodFilter): Date | null {
  const now = new Date()
  if (period === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }
  if (period === "week") {
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(now.getFullYear(), now.getMonth(), diff)
  }
  if (period === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }
  if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3)
    return new Date(now.getFullYear(), q * 3, 1)
  }
  return null
}
