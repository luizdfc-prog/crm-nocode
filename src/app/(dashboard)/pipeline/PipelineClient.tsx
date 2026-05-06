"use client"

import { useState, useCallback, useTransition } from "react"
import { Plus, Bot, ChevronDown } from "lucide-react"
import { useRouter } from "next/navigation"
import { KanbanBoardDynamic } from "@/components/features/pipeline/KanbanBoardDynamic"
import { DealForm, type DealFormData } from "@/components/features/pipeline/DealForm"
import { TransferDealModal } from "@/components/features/pipeline/TransferDealModal"
import { createDeal, updateDeal, reorderDeals } from "@/actions/deals"
import { transferDeal } from "@/actions/pipeline"
import type { Deal, Pipeline, PipelineStage, Lead, Profile } from "@/types"

interface PipelineClientProps {
  pipelines: Pipeline[]
  allDeals: Deal[]
  leads: Pick<Lead, "id" | "name" | "company">[]
  members: Pick<Profile, "id" | "name">[]
  unreadLeadIds?: Set<string>
}

export function PipelineClient({ pipelines, allDeals, leads, members, unreadLeadIds }: PipelineClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [deals, setDeals] = useState<Deal[]>(allDeals)

  // Pipeline selecionado
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>(
    pipelines[0]?.id ?? ""
  )

  const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId) ?? pipelines[0]
  const isReadOnly = selectedPipeline?.type === "agent"
  const stages: PipelineStage[] = selectedPipeline?.stages ?? []

  // Deals filtrados pelo pipeline selecionado
  const pipelineDeals = deals.filter(
    (d) => d.pipeline_id === selectedPipelineId || (!d.pipeline_id && selectedPipelineId === pipelines[0]?.id)
  )

  // Form state
  const [formOpen, setFormOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Deal | undefined>(undefined)
  const [defaultStageId, setDefaultStageId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Transfer state
  const [transferDealItem, setTransferDealItem] = useState<Deal | null>(null)

  const handleNewDeal = useCallback((stageId: string) => {
    setEditingDeal(undefined)
    setDefaultStageId(stageId)
    setFormOpen(true)
  }, [])

  const handleEditDeal = useCallback((deal: Deal) => {
    setEditingDeal(deal)
    setDefaultStageId(deal.stage_id ?? null)
    setFormOpen(true)
  }, [])

  const handleTransferDeal = useCallback((deal: Deal) => {
    setTransferDealItem(deal)
  }, [])

  const handleDragEnd = useCallback(async (
    reorderedDeals: { id: string; position: number; stage_id: string }[]
  ) => {
    // Mapear stage_id para stage (enum legado) para manter compatibilidade
    const updates = reorderedDeals.map(({ id, position, stage_id }) => {
      const deal = deals.find((d) => d.id === id)
      return {
        id,
        position,
        stage: deal?.stage ?? "novo_lead" as const,
        stage_id,
      }
    })

    startTransition(async () => {
      const result = await reorderDeals(updates)
      if (!result.success) {
        console.error("[reorderDeals]", result.error)
      }
    })
  }, [deals])

  const handleFormSubmit = useCallback(async (data: DealFormData) => {
    setErrorMsg(null)

    // Encontrar o stage_id correspondente ao stage selecionado no form
    // DealForm ainda usa o enum legado — precisamos mapear para stage_id
    const stage = data.stage
    const resolvedStageId = defaultStageId ?? stages[0]?.id ?? null

    if (editingDeal) {
      const result = await updateDeal({
        id: editingDeal.id,
        title: data.title,
        value: data.value,
        stage,
        pipeline_id: selectedPipelineId,
        stage_id: resolvedStageId,
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
        stage,
        pipeline_id: selectedPipelineId,
        stage_id: resolvedStageId,
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
  }, [editingDeal, router, selectedPipelineId, defaultStageId, stages])

  const handleTransferConfirm = useCallback(async (
    toPipelineId: string,
    toStageId: string,
    reason?: string
  ) => {
    if (!transferDealItem) return

    const result = await transferDeal(
      transferDealItem.id,
      toPipelineId,
      toStageId,
      reason
    )

    if (!result.success) {
      throw new Error(result.error)
    }

    // Remover do pipeline atual e atualizar
    setDeals((prev) =>
      prev.map((d) =>
        d.id === transferDealItem.id
          ? { ...d, pipeline_id: toPipelineId, stage_id: toStageId }
          : d
      )
    )
    setTransferDealItem(null)
    startTransition(() => router.refresh())
  }, [transferDealItem, router])

  const pipelineBadgeLabels: Record<Pipeline["type"], string> = {
    sales: "Vendas",
    agent: "Agente IA",
    custom: "Personalizado",
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-pf-text">Pipeline</h2>
          <p className="mt-0.5 text-sm text-pf-text-muted">
            Visualize e gerencie seus negócios — {pipelineDeals.length} no total
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Pipeline selector */}
          {pipelines.length > 1 && (
            <div className="relative">
              <select
                value={selectedPipelineId}
                onChange={(e) => setSelectedPipelineId(e.target.value)}
                className="h-9 appearance-none rounded-lg border border-pf-border bg-pf-surface px-3 pr-8 text-sm text-pf-text outline-none transition-colors focus:border-pf-accent/50 cursor-pointer"
              >
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.type === "agent" ? "(IA)" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-pf-text-muted" />
            </div>
          )}

          {/* Badge tipo pipeline */}
          {selectedPipeline && selectedPipeline.type !== "sales" && (
            <span
              className={[
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                isReadOnly
                  ? "border-pf-cool/30 bg-pf-cool/10 text-pf-cool"
                  : "border-pf-border bg-pf-surface-2 text-pf-text-sec",
              ].join(" ")}
            >
              {isReadOnly && <Bot className="size-3" />}
              {pipelineBadgeLabels[selectedPipeline.type]}
            </span>
          )}

          {/* Novo negócio — só em pipelines editáveis */}
          {!isReadOnly && (
            <button
              onClick={() => handleNewDeal(stages[0]?.id ?? "")}
              disabled={isPending || stages.length === 0}
              className="flex items-center gap-2 rounded-lg bg-pf-accent px-3 py-2 text-sm font-semibold text-pf-bg transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <Plus className="size-4" />
              Novo Negócio
            </button>
          )}
        </div>
      </div>

      {isReadOnly && (
        <div className="flex items-center gap-2 rounded-lg border border-pf-cool/20 bg-pf-cool/5 px-4 py-2.5 text-sm text-pf-cool">
          <Bot className="size-4 shrink-0" />
          <span>Este pipeline é gerenciado pelo Agente IA e é somente leitura.</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg border border-pf-negative/30 bg-pf-negative/10 px-4 py-3 text-sm text-pf-negative">
          {errorMsg}
        </div>
      )}

      {stages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-pf-border py-16">
          <div className="text-center">
            <p className="text-sm font-medium text-pf-text-sec">Nenhuma etapa configurada</p>
            <p className="mt-1 text-xs text-pf-text-muted">
              Adicione etapas em Configurações → Pipelines
            </p>
          </div>
        </div>
      ) : (
        <KanbanBoardDynamic
          deals={pipelineDeals}
          stages={stages}
          readOnly={isReadOnly}
          unreadLeadIds={unreadLeadIds}
          onNewDeal={handleNewDeal}
          onEditDeal={handleEditDeal}
          onTransferDeal={handleTransferDeal}
          onDragEnd={handleDragEnd}
        />
      )}

      {/* Deal Form */}
      <DealForm
        key={editingDeal?.id ?? "new"}
        initialData={editingDeal}
        defaultStage={editingDeal?.stage ?? "novo_lead"}
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

      {/* Transfer modal */}
      {transferDealItem && (
        <TransferDealModal
          deal={transferDealItem}
          pipelines={pipelines}
          currentPipelineId={transferDealItem.pipeline_id}
          onConfirm={handleTransferConfirm}
          onClose={() => setTransferDealItem(null)}
        />
      )}
    </div>
  )
}
