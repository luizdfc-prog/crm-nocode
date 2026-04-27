"use client"

import { ChevronDown } from "lucide-react"
import { STATUS_CONFIG } from "./LeadStatusBadge"
import type { LeadStatus, Profile } from "@/types"
import { cn } from "@/lib/utils"

interface LeadFiltersProps {
  statusFilter: LeadStatus | "all"
  ownerFilter: string | "all"
  onStatusChange: (value: LeadStatus | "all") => void
  onOwnerChange: (value: string | "all") => void
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
  onStatusChange,
  onOwnerChange,
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
    <div className="flex items-center gap-2">
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
