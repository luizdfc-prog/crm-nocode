"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragCancelEvent,
} from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import { KanbanColumn } from "./KanbanColumn"
import { DealCardOverlay } from "./DealCard"
import type { Deal, DealStage } from "@/types"

const STAGES: DealStage[] = [
  "novo_lead",
  "contato_realizado",
  "proposta_enviada",
  "negociacao",
  "fechado_ganho",
  "fechado_perdido",
]

type DealsByStage = Record<DealStage, Deal[]>

function groupByStage(deals: Deal[]): DealsByStage {
  const grouped = Object.fromEntries(STAGES.map((s) => [s, [] as Deal[]])) as unknown as DealsByStage
  for (const deal of deals) {
    if (grouped[deal.stage]) {
      grouped[deal.stage].push(deal)
    }
  }
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
  deals: Deal[]
  onNewDeal: (stage: DealStage) => void
  onEditDeal: (deal: Deal) => void
  onDragEnd?: (updates: { id: string; position: number; stage: DealStage }[]) => void
}

export function KanbanBoard({ deals, onNewDeal, onEditDeal, onDragEnd }: KanbanBoardProps) {
  const [dealsByStage, setDealsByStage] = useState<DealsByStage>(() => groupByStage(deals))
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null)
  const isDraggingRef = useRef(false)

  useEffect(() => {
    if (!isDraggingRef.current) {
      setDealsByStage(groupByStage(deals))
    }
  }, [deals])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    isDraggingRef.current = true
    const id = event.active.id as string
    for (const stageDeals of Object.values(dealsByStage)) {
      const deal = stageDeals.find((d) => d.id === id)
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

    const overStage = (STAGES.includes(overId as DealStage)
      ? overId
      : findStageOfDeal(dealsByStage, overId)) as DealStage | null

    if (!overStage || activeStage === overStage) return

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

  const handleDragCancel = useCallback((_event: DragCancelEvent) => {
    isDraggingRef.current = false
    setActiveDeal(null)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    isDraggingRef.current = false
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

    let finalState: DealsByStage

    if (activeStage === overStage) {
      finalState = (() => {
        const colDeals = [...dealsByStage[activeStage]]
        const oldIndex = colDeals.findIndex((d) => d.id === activeId)
        const newIndex = colDeals.findIndex((d) => d.id === overId)
        if (oldIndex === newIndex) return dealsByStage
        const reordered = arrayMove(colDeals, oldIndex, newIndex)
        return { ...dealsByStage, [activeStage]: reordered }
      })()
      setDealsByStage(finalState)
    } else {
      // Mudança de coluna já foi aplicada no handleDragOver
      finalState = dealsByStage
    }

    // Persiste posições: emite apenas as colunas afetadas
    if (onDragEnd) {
      const updates: { id: string; position: number; stage: DealStage }[] = []
      const stagesToUpdate = activeStage === overStage ? [activeStage] : [activeStage, overStage]

      for (const stage of stagesToUpdate) {
        finalState[stage].forEach((deal, index) => {
          updates.push({ id: deal.id, position: index, stage })
        })
      }

      onDragEnd(updates)
    }
  }, [dealsByStage, onDragEnd])

  const isDragActive = activeDeal !== null

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
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
