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
  hasUnread?: boolean
  onEdit?: (deal: Deal) => void
  onTransfer?: (deal: Deal) => void
}

export function DealCardDynamic({
  deal,
  stageColor,
  readOnly = false,
  hasUnread = false,
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

  const dueBadgeStyles: Record<NonNullable<typeof dueDateStatus>, React.CSSProperties> = {
    overdue: { backgroundColor: "rgba(255,71,87,0.12)", color: "#CC1122", border: "1px solid rgba(255,71,87,0.3)" },
    today: { backgroundColor: "rgba(245,158,11,0.12)", color: "#B45309", border: "1px solid rgba(245,158,11,0.3)" },
    soon: { backgroundColor: "rgba(255,107,53,0.12)", color: "#C2410C", border: "1px solid rgba(255,107,53,0.3)" },
    future: { backgroundColor: "#D8D8D8", color: "#555559", border: "1px solid #BBBBBB" },
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...(!readOnly ? listeners : {})}
      className={[
        "group relative flex flex-col gap-3 rounded-xl border p-3.5 select-none",
        "transition-all duration-200",
        readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing",
        isSortableDragging ? "opacity-40" : "",
      ].join(" ")}
      style={{
        ...style,
        "--stage-color": stageColor,
        backgroundColor: hasUnread ? "rgba(255,71,87,0.06)" : "#E8E8E8",
        borderColor: hasUnread ? "rgba(255,71,87,0.35)" : "#C8C8C8",
      } as React.CSSProperties}
      onClick={(e) => {
        if (onEdit && !isSortableDragging) {
          e.stopPropagation()
          onEdit(deal)
        }
      }}
      onMouseEnter={(e) => {
        if (hasUnread) return
        const el = e.currentTarget
        el.style.borderColor = `${stageColor}88`
        el.style.boxShadow = `0 0 0 1px ${stageColor}33, 0 4px 16px ${stageColor}22`
        el.style.backgroundColor = "#DCDCDC"
      }}
      onMouseLeave={(e) => {
        if (hasUnread) return
        const el = e.currentTarget
        el.style.borderColor = "#C8C8C8"
        el.style.boxShadow = ""
        el.style.backgroundColor = "#E8E8E8"
      }}
    >
      {/* Badge de mensagem não lida */}
      {hasUnread && (
        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#FF4757] border-2 border-pf-bg flex items-center justify-center">
          <span className="text-[8px] font-bold text-white leading-none">!</span>
        </div>
      )}

      {/* Accent bar top */}
      <div
        className="absolute top-0 left-4 right-4 h-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: hasUnread ? "linear-gradient(90deg, transparent, #FF4757, transparent)" : `linear-gradient(90deg, transparent, ${stageColor}, transparent)` }}
      />

      {/* Title + value */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-snug line-clamp-2 transition-colors" style={{ color: hasUnread ? "#E8E8E8" : "#0C0C0E" }}>
          {deal.title}
        </p>
        <span className="shrink-0 text-sm font-bold font-mono tabular-nums" style={{ color: hasUnread ? "#FF8A94" : "#5A7A00" }}>
          {formatCurrency(deal.value)}
        </span>
      </div>

      {/* Lead vinculado */}
      {deal.lead && (
        <div className="flex items-center gap-2">
          <div
            className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
            style={{ background: hasUnread ? "rgba(255,71,87,0.25)" : "rgba(202,255,51,0.2)", color: hasUnread ? "#FF8A94" : "#5A7A00" }}
          >
            {getInitials(deal.lead.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs" style={{ color: hasUnread ? "#E8E8E8" : "#1A1A1E" }}>{deal.lead.name}</p>
            {deal.lead.company && (
              <p className="truncate text-[10px]" style={{ color: hasUnread ? "#A0A0A0" : "#555559" }}>{deal.lead.company}</p>
            )}
          </div>
        </div>
      )}

      {/* Footer: responsável + prazo + transferir */}
      <div className="flex items-center justify-between gap-2 border-t pt-2.5" style={{ borderColor: hasUnread ? "rgba(255,71,87,0.25)" : "#C0C0C0" }}>
        {deal.owner ? (
          <div className="flex items-center gap-1.5">
            <div className="flex size-5 items-center justify-center rounded-full border text-[9px] font-bold" style={{ backgroundColor: hasUnread ? "rgba(255,71,87,0.2)" : "#D0D0D0", borderColor: hasUnread ? "rgba(255,71,87,0.4)" : "#AAAAAA", color: hasUnread ? "#FF8A94" : "#333333" }}>
              {getInitials(deal.owner.name)}
            </div>
            <span className="text-[10px] truncate max-w-[80px]" style={{ color: hasUnread ? "#A0A0A0" : "#555559" }}>
              {deal.owner.name.split(" ")[0]}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5" style={{ color: hasUnread ? "#A0A0A0" : "#888888" }}>
            <User className="size-3" />
            <span className="text-[10px]">Sem dono</span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          {deal.due_date && dueDateStatus && (
            <div
              className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
              style={dueBadgeStyles[dueDateStatus]}
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
              className="flex size-5 items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-all"
              style={{ color: "#555559" }}
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
