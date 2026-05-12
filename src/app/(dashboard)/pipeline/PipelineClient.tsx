"use client"

import { useState, useCallback, useTransition } from "react"
import { Plus, Bot, ChevronDown, AlertCircle, ExternalLink } from "lucide-react"
import { useRouter } from "next/navigation"
import { KanbanBoardDynamic } from "@/components/features/pipeline/KanbanBoardDynamic"
import { DealDetailPanel, type DealFormData } from "@/components/features/pipeline/DealDetailPanel"
import { TransferDealModal } from "@/components/features/pipeline/TransferDealModal"
import { createDeal, updateDeal, reorderDeals } from "@/actions/deals"
import { transferDeal } from "@/actions/pipeline"
import { getRequiredFieldsForStage } from "@/actions/customFields"
import type { Deal, Pipeline, PipelineStage, Lead, Profile, LeadFieldDefinition } from "@/types"

interface MissingFieldsBlocker {
  dealId: string
  leadId: string
  leadName: string
  stageName: string
  missingFields: LeadFieldDefinition[]
  pendingReorder: { id: string; position: number; stage_id: string }[]
}

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

  // Required fields blocker
  const [missingBlocker, setMissingBlocker] = useState<MissingFieldsBlocker | null>(null)

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

  const applyReorder = useCallback((
    reorderedDeals: { id: string; position: number; stage_id: string }[]
  ) => {
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

  const handleDragEnd = useCallback(async (
    reorderedDeals: { id: string; position: number; stage_id: string }[]
  ) => {
    // Verifica se algum deal mudou de etapa e se há campos obrigatórios
    for (const item of reorderedDeals) {
      const deal = deals.find((d) => d.id === item.id)
      if (!deal || deal.stage_id === item.stage_id) continue
      if (!deal.lead_id) continue

      const missing = await getRequiredFieldsForStage(
        selectedPipelineId,
        item.stage_id,
        deal.lead_id,
      )

      if (missing.length > 0) {
        const stageName = stages.find((s) => s.id === item.stage_id)?.name ?? "etapa"
        setMissingBlocker({
          dealId: deal.id,
          leadId: deal.lead_id,
          leadName: deal.lead?.name ?? deal.title,
          stageName,
          missingFields: missing.map((m) => m.field),
          pendingReorder: reorderedDeals,
        })
        return
      }
    }

    applyReorder(reorderedDeals)
  }, [deals, selectedPipelineId, stages, applyReorder])

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

      {/* Deal Detail Panel */}
      <DealDetailPanel
        key={editingDeal?.id ?? "new"}
        deal={editingDeal}
        isOpen={formOpen}
        stages={stages}
        leads={leads}
        members={members}
        defaultStageId={defaultStageId}
        onSubmit={handleFormSubmit}
        onClose={() => {
          setFormOpen(false)
          setEditingDeal(undefined)
          setErrorMsg(null)
        }}
        errorMsg={errorMsg}
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

      {/* Required fields blocker modal */}
      {missingBlocker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-pf-border bg-pf-surface p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-pf-warm/10">
                <AlertCircle className="size-5 text-pf-warm" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading text-base font-bold text-pf-text">
                  Campos obrigatórios pendentes
                </h3>
                <p className="mt-1 text-sm text-pf-text-sec">
                  Para mover <strong className="text-pf-text">{missingBlocker.leadName}</strong> para a etapa{" "}
                  <strong className="text-pf-text">{missingBlocker.stageName}</strong>, preencha os campos abaixo:
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {missingBlocker.missingFields.map((field) => (
                <div
                  key={field.id}
                  className="flex items-center gap-2 rounded-lg border border-pf-border bg-pf-surface-2 px-3 py-2"
                >
                  <span className="flex size-1.5 shrink-0 rounded-full bg-pf-warm" />
                  <span className="text-sm text-pf-text">{field.name}</span>
                  <span className="ml-auto text-xs text-pf-text-muted">{field.field_type === "text" ? "Texto" : field.field_type === "number" ? "Número" : field.field_type === "date" ? "Data" : field.field_type === "select" ? "Seleção" : "Múltipla seleção"}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center gap-3">
              <a
                href={`/leads/${missingBlocker.leadId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-pf-accent px-4 py-2.5 text-sm font-semibold text-pf-bg transition-opacity hover:opacity-90"
              >
                <ExternalLink className="size-4" />
                Abrir lead e preencher
              </a>
              <button
                onClick={() => setMissingBlocker(null)}
                className="flex-1 rounded-xl border border-pf-border px-4 py-2.5 text-sm text-pf-text-sec hover:bg-pf-surface-2 hover:text-pf-text"
              >
                Cancelar
              </button>
            </div>

            <p className="mt-3 text-center text-xs text-pf-text-muted">
              O negócio não foi movido. Preencha os campos e tente novamente.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
