"use client"

import Link from "next/link"
import { Building2, Mail, Phone } from "lucide-react"
import { LeadStatusBadge } from "./LeadStatusBadge"
import type { Lead } from "@/types"

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

interface LeadCardProps {
  lead: Lead
}

export function LeadCard({ lead }: LeadCardProps) {
  return (
    <Link
      href={`/leads/${lead.id}`}
      className="group flex flex-col gap-3 rounded-xl border border-pf-border bg-pf-surface p-4 transition-colors hover:border-pf-border/80 hover:bg-pf-surface-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-pf-accent/10 text-xs font-bold text-pf-accent">
            {getInitials(lead.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-pf-text group-hover:text-white">
              {lead.name}
            </p>
            {lead.role && lead.company && (
              <p className="truncate text-xs text-pf-text-muted">
                {lead.role} · {lead.company}
              </p>
            )}
            {lead.company && !lead.role && (
              <p className="truncate text-xs text-pf-text-muted">{lead.company}</p>
            )}
          </div>
        </div>
        <LeadStatusBadge status={lead.status} />
      </div>

      <div className="flex flex-col gap-1.5">
        {lead.company && (
          <div className="flex items-center gap-2 text-xs text-pf-text-sec">
            <Building2 className="size-3 shrink-0 text-pf-text-muted" />
            <span className="truncate">{lead.company}</span>
          </div>
        )}
        {lead.email && (
          <div className="flex items-center gap-2 text-xs text-pf-text-sec">
            <Mail className="size-3 shrink-0 text-pf-text-muted" />
            <span className="truncate">{lead.email}</span>
          </div>
        )}
        {lead.phone && (
          <div className="flex items-center gap-2 text-xs text-pf-text-sec">
            <Phone className="size-3 shrink-0 text-pf-text-muted" />
            <span>{lead.phone}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-pf-border pt-3">
        {lead.owner ? (
          <div className="flex items-center gap-2">
            <div className="flex size-5 items-center justify-center rounded-full bg-pf-surface-2 text-[10px] font-semibold text-pf-text-sec border border-pf-border">
              {getInitials(lead.owner.name)}
            </div>
            <span className="text-xs text-pf-text-muted">{lead.owner.name}</span>
          </div>
        ) : (
          <span className="text-xs text-pf-text-muted">Sem responsável</span>
        )}
        <span className="text-xs text-pf-text-muted">
          {new Date(lead.created_at).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
          })}
        </span>
      </div>
    </Link>
  )
}
