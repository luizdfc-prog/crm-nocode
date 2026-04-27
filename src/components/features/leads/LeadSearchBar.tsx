"use client"

import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface LeadSearchBarProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function LeadSearchBar({ value, onChange, className }: LeadSearchBarProps) {
  return (
    <div
      className={cn(
        "flex h-9 items-center gap-2 rounded-lg border border-pf-border bg-pf-surface px-3 transition-colors focus-within:border-pf-accent/50",
        className
      )}
    >
      <Search className="size-4 shrink-0 text-pf-text-muted" />
      <input
        type="text"
        placeholder="Buscar leads..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent text-sm text-pf-text placeholder:text-pf-text-muted outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="text-pf-text-muted transition-colors hover:text-pf-text"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}
