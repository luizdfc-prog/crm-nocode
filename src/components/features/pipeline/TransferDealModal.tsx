"use client"

import { useState } from "react"
import { X, Loader2, ArrowRightLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Deal, Pipeline } from "@/types"

interface TransferDealModalProps {
  deal: Deal
  pipelines: Pipeline[]
  currentPipelineId: string | null
  onConfirm: (toPipelineId: string, toStageId: string, reason?: string) => Promise<void>
  onClose: () => void
}

export function TransferDealModal({
  deal,
  pipelines,
  currentPipelineId,
  onConfirm,
  onClose,
}: TransferDealModalProps) {
  const otherPipelines = pipelines.filter((p) => p.id !== currentPipelineId)
  const [selectedPipelineId, setSelectedPipelineId] = useState(otherPipelines[0]?.id ?? "")
  const [selectedStageId, setSelectedStageId] = useState(
    otherPipelines[0]?.stages?.[0]?.id ?? ""
  )
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId)
  const availableStages = selectedPipeline?.stages ?? []

  function handlePipelineChange(pipelineId: string) {
    setSelectedPipelineId(pipelineId)
    const pipeline = pipelines.find((p) => p.id === pipelineId)
    setSelectedStageId(pipeline?.stages?.[0]?.id ?? "")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPipelineId || !selectedStageId) return
    setError(null)
    setLoading(true)
    try {
      await onConfirm(selectedPipelineId, selectedStageId, reason || undefined)
    } catch {
      setError("Erro ao transferir negócio. Tente novamente.")
      setLoading(false)
    }
  }

  const inputClass =
    "h-9 w-full rounded-lg border border-pf-border bg-pf-surface-2 px-3 text-sm text-pf-text placeholder:text-pf-text-muted outline-none transition-colors focus:border-pf-accent/50 appearance-none"

  if (otherPipelines.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-pf-bg/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 w-full max-w-sm rounded-2xl border border-pf-border bg-pf-surface p-6">
          <p className="text-sm text-pf-text-sec text-center">
            Não há outros pipelines disponíveis para transferência.
          </p>
          <button
            onClick={onClose}
            className="mt-4 w-full rounded-lg border border-pf-border px-4 py-2 text-sm text-pf-text-sec transition-colors hover:bg-pf-surface-2"
          >
            Fechar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-pf-bg/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-pf-border bg-pf-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-pf-border px-6 py-4">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="size-4 text-pf-accent" />
            <h2 className="font-heading text-base font-bold text-pf-text">Transferir Negócio</h2>
          </div>
          <button
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-pf-text-muted transition-colors hover:bg-pf-surface-2 hover:text-pf-text"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          {/* Deal info */}
          <div className="rounded-lg border border-pf-border bg-pf-surface-2 px-3.5 py-3">
            <p className="text-xs text-pf-text-muted">Negócio</p>
            <p className="mt-0.5 text-sm font-semibold text-pf-text">{deal.title}</p>
          </div>

          {/* Pipeline destino */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-pf-text-sec">Pipeline destino</label>
            <select
              value={selectedPipelineId}
              onChange={(e) => handlePipelineChange(e.target.value)}
              className={cn(inputClass, "cursor-pointer pr-8")}
            >
              {otherPipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stage destino */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-pf-text-sec">Etapa destino</label>
            {availableStages.length > 0 ? (
              <select
                value={selectedStageId}
                onChange={(e) => setSelectedStageId(e.target.value)}
                className={cn(inputClass, "cursor-pointer pr-8")}
              >
                {availableStages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-pf-text-muted">
                Nenhuma etapa disponível neste pipeline.
              </p>
            )}
          </div>

          {/* Motivo (opcional) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-pf-text-sec">
              Motivo <span className="text-pf-text-muted">(opcional)</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Lead qualificado para pipeline enterprise"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={inputClass}
            />
          </div>

          {error && (
            <p className="text-xs text-pf-negative">{error}</p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-pf-border px-4 text-sm text-pf-text-sec transition-colors hover:bg-pf-surface-2 hover:text-pf-text"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !selectedPipelineId || !selectedStageId}
              className="flex h-9 items-center gap-2 rounded-lg bg-pf-accent px-4 text-sm font-semibold text-pf-bg transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              Transferir
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
