import { Phone, Mail, Users, StickyNote } from "lucide-react"
import type { Activity } from "@/types"

interface RecentActivityProps {
  activities: Activity[]
}

const ACTIVITY_ICON = {
  call: Phone,
  email: Mail,
  meeting: Users,
  note: StickyNote,
} as const

const ACTIVITY_LABEL = {
  call: "Ligação",
  email: "E-mail",
  meeting: "Reunião",
  note: "Nota",
} as const

const ACTIVITY_COLOR = {
  call: "bg-pf-cool/10 text-pf-cool",
  email: "bg-pf-accent/10 text-pf-accent",
  meeting: "bg-pf-positive/10 text-pf-positive",
  note: "bg-pf-surface-2 text-pf-text-muted",
} as const

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `há ${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return "ontem"
  if (days < 30) return `há ${days} dias`
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

export function RecentActivity({ activities }: RecentActivityProps) {
  if (activities.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-pf-border">
        <p className="text-sm text-pf-text-muted">Nenhuma atividade registrada</p>
      </div>
    )
  }

  return (
    <ul className="space-y-1">
      {activities.map((act, i) => {
        const Icon = ACTIVITY_ICON[act.type]
        const colorClass = ACTIVITY_COLOR[act.type]
        const label = ACTIVITY_LABEL[act.type]

        return (
          <li
            key={act.id}
            className={`flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-pf-surface-2/60 ${
              i < activities.length - 1 ? "border-b border-pf-border/50" : ""
            }`}
          >
            <div className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md ${colorClass}`}>
              <Icon className="size-3.5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm text-pf-text">{act.description}</p>
                <span className="shrink-0 text-xs text-pf-text-muted">
                  {relativeTime(act.activity_date)}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="text-xs text-pf-text-muted">{label}</span>
                {act.author && (
                  <>
                    <span className="text-pf-border">·</span>
                    <span className="text-xs text-pf-text-muted">{act.author.name}</span>
                  </>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
