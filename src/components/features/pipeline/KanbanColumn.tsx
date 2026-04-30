"use client"

import { Plus } from "lucide-react"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { DealCard } from "./DealCard"
import { STAGE_COLORS } from "./DealCard"
import type { Deal, DealStage } from "@/types"

const STAGE_LABELS: Record<DealStage, string> = {
  novo_lead: "Novo Lead",
  contato_realizado: "Contato Realizado",
  proposta_enviada: "Proposta Enviada",
  negociacao: "Negociação",
  fechado_ganho: "Fechado Ganho",
  fechado_perdido: "Fechado Perdido",
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

interface KanbanColumnProps {
  stage: DealStage
  deals: Deal[]
  index: number
  isDragActive: boolean
  onNewDeal: (stage: DealStage) => void
  onEditDeal: (deal: Deal) => void
}

export function KanbanColumn({ stage, deals, index, isDragActive, onNewDeal, onEditDeal }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  const stageColor = STAGE_COLORS[stage]
  const total = deals.reduce((sum, d) => sum + d.value, 0)
  const dealIds = deals.map((d) => d.id)

  return (
    <div
      className="kanban-column flex w-72 shrink-0 flex-col gap-0"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Column header */}
      <div
        className="sticky top-0 z-10 rounded-t-xl border border-b-0 border-pf-border bg-pf-surface px-3.5 py-3"
        style={{
          borderTopColor: stageColor,
          borderTopWidth: "2px",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="truncate text-sm font-semibold text-pf-text">{STAGE_LABELS[stage]}</h3>
            <span
              className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
              style={{ background: `${stageColor}22`, color: stageColor }}
            >
              {deals.length}
            </span>
          </div>
          <span className="shrink-0 text-xs font-mono font-semibold text-pf-text-muted">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      {/* Drop zone */}
      <SortableContext items={dealIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={[
            "flex flex-1 flex-col gap-2 rounded-b-xl border border-t-0 border-pf-border p-2.5 min-h-[120px] transition-all duration-200",
            isOver && isDragActive
              ? "drop-zone-active bg-pf-surface-2"
              : "bg-pf-surface/50",
          ].join(" ")}
          style={
            isOver && isDragActive
              ? { borderColor: `${stageColor}55`, boxShadow: `inset 0 0 0 1px ${stageColor}33` }
              : {}
          }
        >
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} onEdit={onEditDeal} />
          ))}

          {/* Empty state */}
          {deals.length === 0 && !isDragActive && (
            <div className="flex flex-1 items-center justify-center py-6">
              <p className="text-xs text-pf-text-muted">Nenhum negócio aqui</p>
            </div>
          )}

          {/* Drop indicator */}
          {isOver && isDragActive && deals.length === 0 && (
            <div
              className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed py-6"
              style={{ borderColor: `${stageColor}44` }}
            >
              <p className="text-xs font-medium" style={{ color: stageColor }}>
                Soltar aqui
              </p>
            </div>
          )}
        </div>
      </SortableContext>

      {/* New deal button */}
      <button
        onClick={() => onNewDeal(stage)}
        className="mt-2 flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs text-pf-text-muted transition-colors hover:bg-pf-surface hover:text-pf-text-sec"
      >
        <Plus className="size-3.5" />
        Novo negócio
      </button>
    </div>
  )
}
