"use client"

import { useState, useTransition } from "react"
import { Loader2, Check, AlertCircle } from "lucide-react"
import { saveRoutingConfig } from "@/actions/agent"
import type { RoutingConfig, Pipeline } from "@/types"

interface LeadRoutingSectionProps {
  initialConfig: RoutingConfig
  salesPipelines: Pipeline[]
}

const inputClass =
  "h-9 w-20 rounded-lg border border-pf-border bg-pf-surface-2 px-3 text-sm text-pf-text outline-none transition-colors focus:border-pf-accent/50 text-center"

export function LeadRoutingSection({ initialConfig, salesPipelines }: LeadRoutingSectionProps) {
  const [config, setConfig] = useState<RoutingConfig>(initialConfig)
  const [saving, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalWeight = config.pipelines.reduce((s, p) => s + p.weight, 0)
  const weightOk = config.pipelines.length === 0 || totalWeight === 100

  function togglePipeline(pipelineId: string) {
    setConfig((prev) => {
      const exists = prev.pipelines.find((p) => p.pipeline_id === pipelineId)
      if (exists) {
        const remaining = prev.pipelines.filter((p) => p.pipeline_id !== pipelineId)
        return { ...prev, pipelines: remaining }
      }
      // Ao adicionar, distribui igualmente
      const newPipelines = [...prev.pipelines, { pipeline_id: pipelineId, weight: 0 }]
      return { ...prev, pipelines: redistributeEqual(newPipelines) }
    })
    setSaved(false)
    setError(null)
  }

  function setWeight(pipelineId: string, weight: number) {
    setConfig((prev) => ({
      ...prev,
      pipelines: prev.pipelines.map((p) =>
        p.pipeline_id === pipelineId ? { ...p, weight } : p,
      ),
    }))
    setSaved(false)
    setError(null)
  }

  function redistributeEqual(pipelines: RoutingConfig["pipelines"]) {
    if (!pipelines.length) return pipelines
    const base = Math.floor(100 / pipelines.length)
    const remainder = 100 - base * pipelines.length
    return pipelines.map((p, i) => ({ ...p, weight: base + (i === 0 ? remainder : 0) }))
  }

  function handleEqualDistribution() {
    setConfig((prev) => ({ ...prev, pipelines: redistributeEqual(prev.pipelines) }))
    setSaved(false)
  }

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await saveRoutingConfig(config)
      if (!result.success) {
        setError(result.error)
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  const pipelineMap = Object.fromEntries(salesPipelines.map((p) => [p.id, p]))

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-pf-border p-4">
      {/* Header com toggle */}
      <label className="flex cursor-pointer items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-pf-text">Distribuição automática de leads</p>
          <p className="mt-0.5 text-xs text-pf-text-muted">
            Quando um lead é transferido pelo agente, ele é enviado automaticamente para o próximo pipeline na fila
          </p>
        </div>
        <div
          onClick={() => {
            setConfig((prev) => ({ ...prev, enabled: !prev.enabled }))
            setSaved(false)
          }}
          className={`relative h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors ${
            config.enabled ? "bg-pf-accent" : "bg-pf-border"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              config.enabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </div>
      </label>

      {config.enabled && (
        <div className="flex flex-col gap-4">
          {salesPipelines.length === 0 ? (
            <p className="rounded-lg border border-pf-border bg-pf-surface-2 px-4 py-3 text-sm text-pf-text-muted">
              Nenhum pipeline de vendas encontrado. Crie pipelines na aba Pipelines primeiro.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-pf-text-sec">
                    Selecione os pipelines que receberão leads
                  </span>
                  {config.pipelines.length > 1 && (
                    <button
                      type="button"
                      onClick={handleEqualDistribution}
                      className="text-xs text-pf-cool underline-offset-2 hover:underline"
                    >
                      Distribuir igualmente
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {salesPipelines.map((pipeline) => {
                    const entry = config.pipelines.find((p) => p.pipeline_id === pipeline.id)
                    const isSelected = !!entry

                    return (
                      <div
                        key={pipeline.id}
                        className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                          isSelected
                            ? "border-pf-accent/30 bg-pf-accent/5"
                            : "border-pf-border bg-pf-surface-2"
                        }`}
                      >
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() => togglePipeline(pipeline.id)}
                          className={`flex size-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors ${
                            isSelected
                              ? "border-pf-accent bg-pf-accent"
                              : "border-pf-border bg-transparent"
                          }`}
                        >
                          {isSelected && (
                            <svg className="size-3 text-pf-bg" fill="none" viewBox="0 0 12 12">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>

                        {/* Nome */}
                        <span className={`flex-1 text-sm ${isSelected ? "font-medium text-pf-text" : "text-pf-text-sec"}`}>
                          {pipeline.name}
                        </span>

                        {/* Campo de porcentagem */}
                        {isSelected && (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={entry.weight}
                              onChange={(e) => setWeight(pipeline.id, Number(e.target.value))}
                              className={inputClass}
                            />
                            <span className="text-sm text-pf-text-muted">%</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Indicador de soma */}
              {config.pipelines.length > 0 && (
                <div
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                    weightOk
                      ? "bg-pf-positive/10 text-pf-positive"
                      : "bg-pf-negative/10 text-pf-negative"
                  }`}
                >
                  {weightOk ? (
                    <Check className="size-4" />
                  ) : (
                    <AlertCircle className="size-4" />
                  )}
                  <span>
                    {weightOk
                      ? "Distribuição balanceada (100%)"
                      : `Soma atual: ${totalWeight}% — ajuste para chegar em 100%`}
                  </span>
                </div>
              )}

              {/* Resumo da fila */}
              {config.pipelines.length > 0 && weightOk && (
                <div className="rounded-lg border border-pf-border bg-pf-surface-2/50 p-3">
                  <p className="mb-2 text-xs font-medium text-pf-text-sec">Ordem de distribuição</p>
                  <div className="flex flex-col gap-1.5">
                    {config.pipelines.map((entry, idx) => {
                      const name = pipelineMap[entry.pipeline_id]?.name ?? entry.pipeline_id
                      const leadsPerTen = Math.round(entry.weight / 10)
                      return (
                        <div key={entry.pipeline_id} className="flex items-center gap-2 text-xs text-pf-text-muted">
                          <span className="flex size-5 items-center justify-center rounded-full bg-pf-surface font-mono text-pf-text-sec">
                            {idx + 1}
                          </span>
                          <span className="flex-1 text-pf-text">{name}</span>
                          <span>{entry.weight}%</span>
                          <span className="text-pf-text-muted">
                            (~{leadsPerTen} em cada 10 leads)
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Botão salvar */}
          <div>
            {error && <p className="mb-2 text-xs text-pf-negative">{error}</p>}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !weightOk}
              className="flex h-9 items-center gap-2 rounded-lg bg-pf-accent px-4 text-sm font-semibold text-pf-bg transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              {saved && <Check className="size-3.5" />}
              {saved ? "Salvo!" : "Salvar distribuição"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
