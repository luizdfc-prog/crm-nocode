"use client"

import Link from "next/link"
import { Phone, Mail, Users, StickyNote, Building2, Clock } from "lucide-react"
import type { ScheduledActivity } from "@/actions/activities"

const TYPE_CONFIG = {
  ligacao: { icon: Phone, label: "Ligação", color: "#2ED573", bg: "rgba(46,213,115,0.1)" },
  email: { icon: Mail, label: "E-mail", color: "#5B7FFF", bg: "rgba(91,127,255,0.1)" },
  reuniao: { icon: Users, label: "Reunião", color: "#CAFF33", bg: "rgba(202,255,51,0.1)" },
  nota: { icon: StickyNote, label: "Nota", color: "#8A8A8F", bg: "rgba(138,138,143,0.1)" },
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

interface Props {
  activity: ScheduledActivity
  showDate?: boolean
}

export function ScheduledActivityCard({ activity, showDate = false }: Props) {
  const cfg = TYPE_CONFIG[activity.type]
  const Icon = cfg.icon
  const lead = activity.lead

  return (
    <Link
      href={`/leads/${activity.lead_id}`}
      className="group flex flex-col gap-3 rounded-xl border border-pf-border bg-pf-surface p-4 transition-colors hover:border-pf-accent/30 hover:bg-pf-surface-2"
    >
      {/* Tipo + hora */}
      <div className="flex items-center justify-between gap-2">
        <div
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ color: cfg.color, background: cfg.bg }}
        >
          <Icon className="size-3" />
          {cfg.label}
        </div>
        <div className="flex items-center gap-1 text-xs text-pf-text-muted">
          <Clock className="size-3" />
          {showDate
            ? new Date(activity.activity_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) + " · " + formatTime(activity.activity_date)
            : formatTime(activity.activity_date)
          }
        </div>
      </div>

      {/* Descrição */}
      <p className="line-clamp-2 text-sm text-pf-text">{activity.description}</p>

      {/* Lead info */}
      {lead && (
        <div className="flex items-center gap-2 border-t border-pf-border pt-3">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-pf-accent/10 text-[10px] font-bold text-pf-accent">
            {getInitials(lead.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-pf-text group-hover:text-white">
              {lead.name}
            </p>
            {lead.company && (
              <div className="flex items-center gap-1 text-[10px] text-pf-text-muted">
                <Building2 className="size-2.5 shrink-0" />
                <span className="truncate">{lead.company}</span>
              </div>
            )}
          </div>
          {lead.owner && (
            <div
              className="flex size-5 shrink-0 items-center justify-center rounded-full border border-pf-border bg-pf-surface-2 text-[9px] font-semibold text-pf-text-sec"
              title={lead.owner.name}
            >
              {getInitials(lead.owner.name)}
            </div>
          )}
        </div>
      )}
    </Link>
  )
}
