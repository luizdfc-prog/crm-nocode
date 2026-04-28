"use client"

import { useState, useCallback } from "react"
import { Plus } from "lucide-react"
import { KanbanBoard } from "@/components/features/pipeline/KanbanBoard"
import { DealForm, type DealFormData } from "@/components/features/pipeline/DealForm"
import { MOCK_DEALS, MOCK_LEADS, MOCK_PROFILES } from "@/utils/mock-data"
import type { Deal, DealStage } from "@/types"

let nextId = MOCK_DEALS.length + 1

export default function PipelinePage() {
  const [deals, setDeals] = useState<Deal[]>(MOCK_DEALS)
  const [formOpen, setFormOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Deal | undefined>(undefined)
  const [defaultStage, setDefaultStage] = useState<DealStage>("new_lead")

  const handleNewDeal = useCallback((stage: DealStage) => {
    setEditingDeal(undefined)
    setDefaultStage(stage)
    setFormOpen(true)
  }, [])

  const handleEditDeal = useCallback((deal: Deal) => {
    setEditingDeal(deal)
    setDefaultStage(deal.stage)
    setFormOpen(true)
  }, [])

  const handleFormSubmit = useCallback((data: DealFormData) => {
    const lead = data.lead_id ? MOCK_LEADS.find((l) => l.id === data.lead_id) ?? null : null
    const owner = data.owner_id ? MOCK_PROFILES.find((p) => p.id === data.owner_id) ?? null : null

    if (editingDeal) {
      setDeals((prev) =>
        prev.map((d) =>
          d.id === editingDeal.id
            ? {
                ...d,
                ...data,
                due_date: data.due_date ? `${data.due_date}T00:00:00Z` : null,
                lead: lead ?? undefined,
                owner: owner ?? undefined,
              }
            : d
        )
      )
    } else {
      const newDeal: Deal = {
        id: `deal-${nextId++}`,
        workspace_id: "ws-1",
        title: data.title,
        value: data.value,
        stage: data.stage,
        lead_id: data.lead_id,
        owner_id: data.owner_id,
        due_date: data.due_date ? `${data.due_date}T00:00:00Z` : null,
        position: 9999,
        created_at: new Date().toISOString(),
        lead: lead ?? undefined,
        owner: owner ?? undefined,
      }
      setDeals((prev) => [...prev, newDeal])
    }
    setFormOpen(false)
    setEditingDeal(undefined)
  }, [editingDeal])

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-pf-text">Pipeline</h2>
          <p className="mt-0.5 text-sm text-pf-text-muted">
            Visualize e gerencie seus negócios — {deals.length} no total
          </p>
        </div>
        <button
          onClick={() => handleNewDeal("new_lead")}
          className="flex items-center gap-2 rounded-lg bg-pf-accent px-3 py-2 text-sm font-semibold text-pf-bg transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" />
          Novo Negócio
        </button>
      </div>

      {/* Kanban Board */}
      <KanbanBoard
        deals={deals}
        onNewDeal={handleNewDeal}
        onEditDeal={handleEditDeal}
      />

      {/* Deal Form Sheet */}
      <DealForm
        key={editingDeal?.id ?? "new"}
        initialData={editingDeal}
        defaultStage={defaultStage}
        onSubmit={handleFormSubmit}
        onClose={() => {
          setFormOpen(false)
          setEditingDeal(undefined)
        }}
        isOpen={formOpen}
      />
    </div>
  )
}
