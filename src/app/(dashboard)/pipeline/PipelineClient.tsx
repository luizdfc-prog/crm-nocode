"use client"

import { useState, useCallback, useTransition } from "react"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { KanbanBoard } from "@/components/features/pipeline/KanbanBoard"
import { DealForm, type DealFormData } from "@/components/features/pipeline/DealForm"
import { createDeal, updateDeal, reorderDeals } from "@/actions/deals"
import type { Deal, DealStage, Lead, Profile } from "@/types"

interface PipelineClientProps {
  initialDeals: Deal[]
  leads: Pick<Lead, "id" | "name" | "company">[]
  members: Pick<Profile, "id" | "name">[]
}

export function PipelineClient({ initialDeals, leads, members }: PipelineClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [deals, setDeals] = useState<Deal[]>(initialDeals)
  const [formOpen, setFormOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Deal | undefined>(undefined)
  const [defaultStage, setDefaultStage] = useState<DealStage>("novo_lead")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

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

  const handleDragEnd = useCallback(async (
    reorderedDeals: { id: string; position: number; stage: DealStage }[]
  ) => {
    // Atualiza local imediatamente (já feito pelo KanbanBoard)
    // Persiste no banco em background
    startTransition(async () => {
      const result = await reorderDeals(reorderedDeals)
      if (!result.success) {
        console.error("[reorderDeals]", result.error)
      }
    })
  }, [])

  const handleFormSubmit = useCallback(async (data: DealFormData) => {
    setErrorMsg(null)

    if (editingDeal) {
      const result = await updateDeal({
        id: editingDeal.id,
        title: data.title,
        value: data.value,
        stage: data.stage,
        lead_id: data.lead_id,
        owner_id: data.owner_id,
        due_date: data.due_date,
      })

      if (!result.success) {
        setErrorMsg(result.error)
        return
      }

      setDeals((prev) => prev.map((d) => d.id === editingDeal.id ? result.data : d))
    } else {
      const result = await createDeal({
        title: data.title,
        value: data.value,
        stage: data.stage,
        lead_id: data.lead_id,
        owner_id: data.owner_id,
        due_date: data.due_date,
      })

      if (!result.success) {
        setErrorMsg(result.error)
        return
      }

      setDeals((prev) => [...prev, result.data])
    }

    setFormOpen(false)
    setEditingDeal(undefined)
    startTransition(() => router.refresh())
  }, [editingDeal, router])

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
          onClick={() => handleNewDeal("novo_lead")}
          disabled={isPending}
          className="flex items-center gap-2 rounded-lg bg-pf-accent px-3 py-2 text-sm font-semibold text-pf-bg transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <Plus className="size-4" />
          Novo Negócio
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-pf-negative/30 bg-pf-negative/10 px-4 py-3 text-sm text-pf-negative">
          {errorMsg}
        </div>
      )}

      {/* Kanban Board */}
      <KanbanBoard
        deals={deals}
        onNewDeal={handleNewDeal}
        onEditDeal={handleEditDeal}
        onDragEnd={handleDragEnd}
      />

      {/* Deal Form Sheet */}
      <DealForm
        key={editingDeal?.id ?? "new"}
        initialData={editingDeal}
        defaultStage={defaultStage}
        leads={leads}
        members={members}
        onSubmit={handleFormSubmit}
        onClose={() => {
          setFormOpen(false)
          setEditingDeal(undefined)
          setErrorMsg(null)
        }}
        isOpen={formOpen}
      />
    </div>
  )
}
