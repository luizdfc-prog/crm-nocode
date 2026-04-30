import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  label: string
  value: string
  description?: string
  change?: string
  changeType?: "positive" | "negative" | "neutral"
  icon: LucideIcon
  accent?: boolean
}

export function MetricCard({
  label,
  value,
  description,
  change,
  changeType = "neutral",
  icon: Icon,
  accent = false,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border p-5 transition-colors",
        accent
          ? "border-pf-accent/30 bg-pf-accent/5"
          : "border-pf-border bg-pf-surface"
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm text-pf-text-sec">{label}</p>
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-lg border",
            accent
              ? "border-pf-accent/30 bg-pf-accent/10"
              : "border-pf-border bg-pf-surface-2"
          )}
        >
          <Icon className={cn("size-4", accent ? "text-pf-accent" : "text-pf-text-muted")} />
        </div>
      </div>

      <div>
        <p
          className={cn(
            "font-heading text-2xl font-bold",
            accent ? "text-pf-accent" : "text-pf-text"
          )}
        >
          {value}
        </p>
        {description && (
          <p className="mt-0.5 text-xs text-pf-text-muted">{description}</p>
        )}
      </div>

      {change && (
        <div className="flex items-center gap-1">
          {changeType === "positive" && <TrendingUp className="size-3 text-pf-positive" />}
          {changeType === "negative" && <TrendingDown className="size-3 text-pf-negative" />}
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
        </div>
      )}
    </div>
  )
}
