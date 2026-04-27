import { cn } from "@/lib/utils"
import type { LeadStatus } from "@/types"

const STATUS_CONFIG: Record<LeadStatus, { label: string; className: string }> = {
  new: {
    label: "Novo",
    className: "bg-pf-cool/15 text-pf-cool border-pf-cool/30",
  },
  contact: {
    label: "Contato",
    className: "bg-pf-accent/15 text-pf-accent border-pf-accent/30",
  },
  proposal: {
    label: "Proposta",
    className: "bg-pf-warm/15 text-pf-warm border-pf-warm/30",
  },
  negotiation: {
    label: "Negociação",
    className: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  },
  won: {
    label: "Ganho",
    className: "bg-pf-positive/15 text-pf-positive border-pf-positive/30",
  },
  lost: {
    label: "Perdido",
    className: "bg-pf-negative/15 text-pf-negative border-pf-negative/30",
  },
}

interface LeadStatusBadgeProps {
  status: LeadStatus
  className?: string
}

export function LeadStatusBadge({ status, className }: LeadStatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}

export { STATUS_CONFIG }
