"use client"

import { CalendarDays, User, ArrowRightLeft } from "lucide-react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Deal } from "@/types"

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function getDueDateStatus(dueDate: string | null): "overdue" | "today" | "soon" | "future" | null {
  if (!dueDate) return null
  const now = new Date()
  const due = new Date(dueDate)
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return "overdue"
  if (diffDays === 0) return "today"
  if (diffDays <= 3) return "soon"
  return "future"
}

interface DealCardDynamicProps {
  deal: Deal
  stageColor: string
  readOnly?: boolean
  onEdit?: (deal: Deal) => void
  onTransfer?: (deal: Deal) => void
}

export function DealCardDynamic({
  deal,
  stageColor,
  readOnly = false,
  onEdit,
  onTransfer,
}: DealCardDynamicProps) {
  const dueDateStatus = getDueDateStatus(deal.due_date)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } =
    useSortable({ id: deal.id, disabled: readOnly })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const dueBadgeStyles: Record<NonNullable<typeof dueDateStatus>, string> = {
    overdue: "bg-[#FF4757]/15 text-[#FF4757] border-[#FF4757]/30",
    today: "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30",
    soon: "bg-[#FF6B35]/15 text-[#FF6B35] border-[#FF6B35]/30",
    future: "bg-pf-surface-2 text-pf-text-muted border-pf-border",
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...(!readOnly ? listeners : {})}
      className={[
        "group relative flex flex-col gap-3 rounded-xl border bg-pf-surface p-3.5 select-none",
        "transition-all duration-200",
        readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing",
        isSortableDragging
          ? "opacity-40 border-pf-border"
          : "border-pf-border hover:bg-pf-surface-2",
      ].join(" ")}
      style={{
        ...style,
        "--stage-color": stageColor,
      } as React.CSSProperties}
      onClick={(e) => {
        if (onEdit && !isSortableDragging) {
          e.stopPropagation()
          onEdit(deal)
        }
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.borderColor = `${stageColor}55`
        el.style.boxShadow = `0 0 0 1px ${stageColor}22, 0 4px 20px ${stageColor}18`
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.borderColor = ""
        el.style.boxShadow = ""
      }}
    >
      {/* Accent bar top */}
      <div
        className="absolute top-0 left-4 right-4 h-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: `linear-gradient(90deg, transparent, ${stageColor}, transparent)` }}
      />

      {/* Title + value */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-pf-text leading-snug line-clamp-2 group-hover:text-white transition-colors">
          {deal.title}
        </p>
        <span className="shrink-0 text-sm font-bold font-mono tabular-nums" style={{ color: stageColor }}>
          {formatCurrency(deal.value)}
        </span>
      </div>

      {/* Lead vinculado */}
      {deal.lead && (
        <div className="flex items-center gap-2">
          <div
            className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
            style={{ background: `${stageColor}1a`, color: stageColor }}
          >
            {getInitials(deal.lead.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs text-pf-text-sec">{deal.lead.name}</p>
            {deal.lead.company && (
              <p className="truncate text-[10px] text-pf-text-muted">{deal.lead.company}</p>
            )}
          </div>
        </div>
      )}

      {/* Footer: responsável + prazo + transferir */}
      <div className="flex items-center justify-between gap-2 border-t border-pf-border pt-2.5">
        {deal.owner ? (
          <div className="flex items-center gap-1.5">
            <div className="flex size-5 items-center justify-center rounded-full bg-pf-surface-2 border border-pf-border text-[9px] font-bold text-pf-text-sec">
              {getInitials(deal.owner.name)}
            </div>
            <span className="text-[10px] text-pf-text-muted truncate max-w-[80px]">
              {deal.owner.name.split(" ")[0]}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-pf-text-muted">
            <User className="size-3" />
            <span className="text-[10px]">Sem dono</span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          {deal.due_date && dueDateStatus && (
            <div
              className={[
                "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                dueBadgeStyles[dueDateStatus],
              ].join(" ")}
            >
              <CalendarDays className="size-2.5" />
              {new Date(deal.due_date).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
              })}
            </div>
          )}

          {/* Botão transferir — visível no hover */}
          {onTransfer && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onTransfer(deal)
              }}
              className="flex size-5 items-center justify-center rounded text-pf-text-muted opacity-0 group-hover:opacity-100 transition-all hover:bg-pf-surface-2 hover:text-pf-text-sec"
              title="Transferir para outro pipeline"
              aria-label="Transferir negócio"
            >
              <ArrowRightLeft className="size-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Versão estática para DragOverlay
export function DealCardOverlayDynamic({
  deal,
  stageColor,
}: {
  deal: Deal
  stageColor: string
}) {
  function formatCurrencyLocal(value: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  function getInitialsLocal(name: string) {
    return name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border p-3.5 shadow-2xl rotate-2 scale-105"
      style={{
        borderColor: `${stageColor}66`,
        background: "#141416",
        boxShadow: `0 8px 40px ${stageColor}30`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-white leading-snug line-clamp-2">{deal.title}</p>
        <span className="shrink-0 text-sm font-bold font-mono" style={{ color: stageColor }}>
          {formatCurrencyLocal(deal.value)}
        </span>
      </div>
      {deal.lead && (
        <div className="flex items-center gap-2">
          <div
            className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
            style={{ background: `${stageColor}1a`, color: stageColor }}
          >
            {getInitialsLocal(deal.lead.name)}
          </div>
          <p className="truncate text-xs text-pf-text-sec">{deal.lead.name}</p>
        </div>
      )}
    </div>
  )
}
