import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  label: string
  value: string
  description?: string
  change?: string
  changeType?: "positive" | "negative" | "neutral"
  icon: LucideIcon
}

export function MetricCard({
  label,
  value,
  description,
  change,
  changeType = "neutral",
  icon: Icon,
}: MetricCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-pf-border bg-pf-surface p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm text-pf-text-sec">{label}</p>
        <div className="flex size-8 items-center justify-center rounded-lg border border-pf-border bg-pf-surface-2">
          <Icon className="size-4 text-pf-text-muted" />
        </div>
      </div>

      <div>
        <p className="font-heading text-2xl font-bold text-pf-text">{value}</p>
        {description && (
          <p className="mt-0.5 text-xs text-pf-text-muted">{description}</p>
        )}
      </div>

      {change && (
        <p
          className={cn(
            "text-xs font-medium",
            changeType === "positive" && "text-pf-positive",
            changeType === "negative" && "text-pf-negative",
            changeType === "neutral" && "text-pf-text-muted"
          )}
        >
          {change}
        </p>
      )}
    </div>
  )
}
