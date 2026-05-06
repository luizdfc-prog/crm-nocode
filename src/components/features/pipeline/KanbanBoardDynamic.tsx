"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragCancelEvent,
} from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import { KanbanColumnDynamic } from "./KanbanColumnDynamic"
import { DealCardOverlayDynamic } from "./DealCardDynamic"
import type { Deal, PipelineStage } from "@/types"

type DealsByStageId = Record<string, Deal[]>

function groupByStageId(deals: Deal[], stages: PipelineStage[]): DealsByStageId {
  const grouped: DealsByStageId = Object.fromEntries(stages.map((s) => [s.id, [] as Deal[]]))

  for (const deal of deals) {
    const key = deal.stage_id ?? "__legacy__"
    if (grouped[key] !== undefined) {
      grouped[key].push(deal)
    } else {
      // Deal sem stage_id válido — vai para a primeira coluna
      const firstKey = stages[0]?.id
      if (firstKey) {
        grouped[firstKey] = [...(grouped[firstKey] ?? []), deal]
      }
    }
  }

  for (const stageId of Object.keys(grouped)) {
    grouped[stageId].sort((a, b) => a.position - b.position)
  }

  return grouped
}

function findStageIdOfDeal(dealsByStageId: DealsByStageId, dealId: string): string | null {
  for (const [stageId, deals] of Object.entries(dealsByStageId)) {
    if (deals.some((d) => d.id === dealId)) return stageId
  }
  return null
}

interface KanbanBoardDynamicProps {
  deals: Deal[]
  stages: PipelineStage[]
  readOnly?: boolean
  unreadLeadIds?: Set<string>
  onNewDeal: (stageId: string) => void
  onEditDeal: (deal: Deal) => void
  onTransferDeal: (deal: Deal) => void
  onDragEnd?: (updates: { id: string; position: number; stage_id: string }[]) => void
}

export function KanbanBoardDynamic({
  deals,
  stages,
  readOnly = false,
  unreadLeadIds,
  onNewDeal,
  onEditDeal,
  onTransferDeal,
  onDragEnd,
}: KanbanBoardDynamicProps) {
  const stageIds = stages.map((s) => s.id)

  const [dealsByStageId, setDealsByStageId] = useState<DealsByStageId>(() =>
    groupByStageId(deals, stages)
  )
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null)
  const isDraggingRef = useRef(false)
  const dealsByStageIdRef = useRef(dealsByStageId)

  useEffect(() => {
    if (!isDraggingRef.current) {
      const next = groupByStageId(deals, stages)
      setDealsByStageId(next)
      dealsByStageIdRef.current = next
    }
  }, [deals, stages])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (readOnly) return
    isDraggingRef.current = true
    const id = event.active.id as string
    for (const stageDeals of Object.values(dealsByStageIdRef.current)) {
      const deal = stageDeals.find((d) => d.id === id)
      if (deal) {
        setActiveDeal(deal)
        break
      }
    }
  }, [readOnly])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    if (readOnly) return
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeStageId = findStageIdOfDeal(dealsByStageIdRef.current, activeId)
    if (!activeStageId) return

    const overStageId = stageIds.includes(overId)
      ? overId
      : findStageIdOfDeal(dealsByStageIdRef.current, overId)

    if (!overStageId || activeStageId === overStageId) return

    setDealsByStageId((prev) => {
      const sourceDeals = [...prev[activeStageId]]
      const destDeals = [...(prev[overStageId] ?? [])]
      const activeIndex = sourceDeals.findIndex((d) => d.id === activeId)
      const [moved] = sourceDeals.splice(activeIndex, 1)

      const movedDeal: Deal = { ...moved, stage_id: overStageId }

      const overIndex = destDeals.findIndex((d) => d.id === overId)
      if (overIndex >= 0) {
        destDeals.splice(overIndex, 0, movedDeal)
      } else {
        destDeals.push(movedDeal)
      }

      const next = {
        ...prev,
        [activeStageId]: sourceDeals,
        [overStageId]: destDeals,
      }
      dealsByStageIdRef.current = next
      return next
    })
  }, [readOnly, stageIds])

  const handleDragCancel = useCallback((_event: DragCancelEvent) => {
    isDraggingRef.current = false
    setActiveDeal(null)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    isDraggingRef.current = false
    const { active, over } = event
    setActiveDeal(null)
    if (readOnly || !over) return

    const activeId = active.id as string
    const overId = over.id as string

    const current = dealsByStageIdRef.current

    const activeStageId = findStageIdOfDeal(current, activeId)
    if (!activeStageId) return

    const overStageId = stageIds.includes(overId)
      ? overId
      : findStageIdOfDeal(current, overId)

    if (!overStageId) return

    let finalState: DealsByStageId = current

    if (activeStageId === overStageId) {
      const colDeals = [...current[activeStageId]]
      const oldIndex = colDeals.findIndex((d) => d.id === activeId)
      const newIndex = colDeals.findIndex((d) => d.id === overId)

      if (oldIndex !== newIndex && oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(colDeals, oldIndex, newIndex)
        finalState = { ...current, [activeStageId]: reordered }
        setDealsByStageId(finalState)
        dealsByStageIdRef.current = finalState
      }
    }

    if (onDragEnd) {
      const updates: { id: string; position: number; stage_id: string }[] = []
      const stagesToUpdate =
        activeStageId === overStageId ? [activeStageId] : [activeStageId, overStageId]

      for (const sid of stagesToUpdate) {
        finalState[sid].forEach((deal, index) => {
          updates.push({ id: deal.id, position: index, stage_id: sid })
        })
      }

      if (updates.length > 0) onDragEnd(updates)
    }
  }, [readOnly, stageIds, onDragEnd])

  const isDragActive = activeDeal !== null

  // Stage do deal ativo para o overlay
  const activeStageColor =
    activeDeal?.stage_id
      ? (stages.find((s) => s.id === activeDeal.stage_id)?.color ?? "#5B7FFF")
      : "#5B7FFF"

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <p className="mb-2 text-right text-[11px] text-pf-text-muted sm:hidden">
        ← deslize para ver mais colunas →
      </p>

      <div className="flex gap-4 overflow-x-auto pb-4 [scrollbar-color:var(--pf-border)_transparent] [scrollbar-width:thin]">
        {stages.map((stage, index) => (
          <KanbanColumnDynamic
            key={stage.id}
            stage={stage}
            deals={dealsByStageId[stage.id] ?? []}
            index={index}
            isDragActive={isDragActive}
            readOnly={readOnly}
            unreadLeadIds={unreadLeadIds}
            onNewDeal={onNewDeal}
            onEditDeal={onEditDeal}
            onTransferDeal={onTransferDeal}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
        {activeDeal && <DealCardOverlayDynamic deal={activeDeal} stageColor={activeStageColor} />}
      </DragOverlay>
    </DndContext>
  )
}
