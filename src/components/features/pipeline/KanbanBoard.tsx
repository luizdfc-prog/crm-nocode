"use client"

import { useState, useCallback } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import { KanbanColumn } from "./KanbanColumn"
import { DealCardOverlay } from "./DealCard"
import type { Deal, DealStage } from "@/types"

const STAGES: DealStage[] = [
  "new_lead",
  "contact_made",
  "proposal_sent",
  "negotiation",
  "closed_won",
  "closed_lost",
]

type DealsByStage = Record<DealStage, Deal[]>

function groupByStage(deals: Deal[]): DealsByStage {
  const grouped = Object.fromEntries(STAGES.map((s) => [s, [] as Deal[]])) as unknown as DealsByStage
  for (const deal of deals) {
    if (grouped[deal.stage]) {
      grouped[deal.stage].push(deal)
    }
  }
  // manter ordenação por position
  for (const stage of STAGES) {
    grouped[stage].sort((a, b) => a.position - b.position)
  }
  return grouped
}

function findStageOfDeal(dealsByStage: DealsByStage, dealId: string): DealStage | null {
  for (const [stage, deals] of Object.entries(dealsByStage) as [DealStage, Deal[]][]) {
    if (deals.some((d) => d.id === dealId)) return stage
  }
  return null
}

interface KanbanBoardProps {
  initialDeals: Deal[]
  onNewDeal: (stage: DealStage) => void
  onEditDeal: (deal: Deal) => void
}

export function KanbanBoard({ initialDeals, onNewDeal, onEditDeal }: KanbanBoardProps) {
  const [dealsByStage, setDealsByStage] = useState<DealsByStage>(() => groupByStage(initialDeals))
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = event.active.id as string
    for (const deals of Object.values(dealsByStage)) {
      const deal = deals.find((d) => d.id === id)
      if (deal) {
        setActiveDeal(deal)
        break
      }
    }
  }, [dealsByStage])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeStage = findStageOfDeal(dealsByStage, activeId)
    if (!activeStage) return

    // over pode ser um stage (coluna vazia) ou um deal
    const overStage = (STAGES.includes(overId as DealStage)
      ? overId
      : findStageOfDeal(dealsByStage, overId)) as DealStage | null

    if (!overStage || activeStage === overStage) return

    // Mover entre colunas durante o drag (preview)
    setDealsByStage((prev) => {
      const sourceDeals = [...prev[activeStage]]
      const destDeals = [...prev[overStage]]
      const activeIndex = sourceDeals.findIndex((d) => d.id === activeId)
      const [moved] = sourceDeals.splice(activeIndex, 1)

      const movedDeal: Deal = { ...moved, stage: overStage }

      const overIndex = destDeals.findIndex((d) => d.id === overId)
      if (overIndex >= 0) {
        destDeals.splice(overIndex, 0, movedDeal)
      } else {
        destDeals.push(movedDeal)
      }

      return {
        ...prev,
        [activeStage]: sourceDeals,
        [overStage]: destDeals,
      }
    })
  }, [dealsByStage])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveDeal(null)
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeStage = findStageOfDeal(dealsByStage, activeId)
    if (!activeStage) return

    const overStage = (STAGES.includes(overId as DealStage)
      ? overId
      : findStageOfDeal(dealsByStage, overId)) as DealStage | null

    if (!overStage) return

    if (activeStage === overStage) {
      // Reordenar na mesma coluna
      setDealsByStage((prev) => {
        const colDeals = [...prev[activeStage]]
        const oldIndex = colDeals.findIndex((d) => d.id === activeId)
        const newIndex = colDeals.findIndex((d) => d.id === overId)
        if (oldIndex === newIndex) return prev
        return { ...prev, [activeStage]: arrayMove(colDeals, oldIndex, newIndex) }
      })
    }
    // Se colunas diferentes, o handleDragOver já moveu o deal
  }, [dealsByStage])

  const isDragActive = activeDeal !== null

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage, index) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            deals={dealsByStage[stage]}
            index={index}
            isDragActive={isDragActive}
            onNewDeal={onNewDeal}
            onEditDeal={onEditDeal}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
        {activeDeal && <DealCardOverlay deal={activeDeal} />}
      </DragOverlay>
    </DndContext>
  )
}

// Exportar função auxiliar para uso em page.tsx
export { groupByStage }
