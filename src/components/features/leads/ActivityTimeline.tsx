import { Phone, Mail, Users, FileText } from "lucide-react"
import type { Activity, ActivityType } from "@/types"

const TYPE_CONFIG: Record<ActivityType, { label: string; icon: React.ReactNode; color: string }> = {
  call: {
    label: "Ligação",
    icon: <Phone className="size-3.5" />,
    color: "text-pf-positive bg-pf-positive/10 border-pf-positive/20",
  },
  email: {
    label: "E-mail",
    icon: <Mail className="size-3.5" />,
    color: "text-pf-cool bg-pf-cool/10 border-pf-cool/20",
  },
  meeting: {
    label: "Reunião",
    icon: <Users className="size-3.5" />,
    color: "text-pf-accent bg-pf-accent/10 border-pf-accent/20",
  },
  note: {
    label: "Nota",
    icon: <FileText className="size-3.5" />,
    color: "text-pf-text-sec bg-pf-surface-2 border-pf-border",
  },
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

interface ActivityItemProps {
  activity: Activity
  isLast: boolean
}

function ActivityItem({ activity, isLast }: ActivityItemProps) {
  const config = TYPE_CONFIG[activity.type]
  return (
    <div className="flex gap-4">
      {/* Linha da timeline */}
      <div className="flex flex-col items-center">
        <div
          className={`flex size-7 shrink-0 items-center justify-center rounded-full border ${config.color}`}
        >
          {config.icon}
        </div>
        {!isLast && <div className="mt-1 w-px flex-1 bg-pf-border" />}
      </div>

      {/* Conteúdo */}
      <div className={`flex flex-col gap-1 pb-6 ${isLast ? "" : ""}`}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-pf-text">{config.label}</span>
          {activity.author && (
            <>
              <span className="text-xs text-pf-text-muted">·</span>
              <div className="flex items-center gap-1.5">
                <div className="flex size-4 items-center justify-center rounded-full bg-pf-surface-2 text-[9px] font-semibold text-pf-text-sec border border-pf-border">
                  {getInitials(activity.author.name)}
                </div>
                <span className="text-xs text-pf-text-muted">{activity.author.name}</span>
              </div>
            </>
          )}
        </div>
        <p className="text-sm text-pf-text-sec leading-relaxed">{activity.description}</p>
        <p className="text-xs text-pf-text-muted">
          {new Date(activity.activity_date).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  )
}

interface ActivityTimelineProps {
  activities: Activity[]
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <FileText className="size-8 text-pf-text-muted" />
        <p className="text-sm text-pf-text-sec">Nenhuma atividade registrada</p>
        <p className="text-xs text-pf-text-muted">Registre a primeira interação com este lead</p>
      </div>
    )
  }

  const sorted = [...activities].sort(
    (a, b) => new Date(b.activity_date).getTime() - new Date(a.activity_date).getTime()
  )

  return (
    <div className="flex flex-col">
      {sorted.map((activity, i) => (
        <ActivityItem key={activity.id} activity={activity} isLast={i === sorted.length - 1} />
      ))}
    </div>
  )
}
