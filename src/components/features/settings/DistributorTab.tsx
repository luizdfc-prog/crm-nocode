"use client"

import { useEffect, useState, useCallback } from "react"
import { Loader2, ToggleLeft, ToggleRight, Info, CheckCircle2, XCircle } from "lucide-react"
import { getDistributorConfig, saveDistributorConfig, getWhatsAppAccounts } from "@/actions/distributor"
import type { DistributorConfig, DistributorPipeline, Pipeline, WhatsAppAccount } from "@/types"

interface DistributorTabProps {
  pipelines: Pipeline[]
}

interface PipelineRow {
  pipeline_id: string
  name: string
  weight: number
  phone?: string
  active_in_routing: boolean
}

export function DistributorTab({ pipelines }: DistributorTabProps) {
  const [config, setConfig] = useState<DistributorConfig>({ enabled: false, pipelines: [] })
  const [rows, setRows] = useState<PipelineRow[]>([])
  const [accounts, setAccounts] = useState<(WhatsAppAccount & { pipeline?: Pipeline })[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }, [])

  useEffect(() => {
    async function load() {
      const [cfg, accs] = await Promise.all([
        getDistributorConfig(),
        getWhatsAppAccounts(),
      ])
      setConfig(cfg)
      setAccounts(accs)

      // Montar linhas: pipelines que têm WhatsApp vinculado
      const rows: PipelineRow[] = pipelines
        .filter((p) => accs.some((a) => a.pipeline_id === p.id))
        .map((p) => {
          const existing = cfg.pipelines.find((cp) => cp.pipeline_id === p.id)
          const account = accs.find((a) => a.pipeline_id === p.id)
          return {
            pipeline_id: p.id,
            name: p.name,
            weight: existing?.weight ?? 0,
            phone: account?.phone_number,
            active_in_routing: account?.active_in_routing ?? false,
          }
        })

      // Se não há configuração salva ainda, distribuir pesos iguais
      if (cfg.pipelines.length === 0 && rows.length > 0) {
        const equal = Math.floor(100 / rows.length)
        const remainder = 100 - equal * rows.length
        rows.forEach((r, i) => {
          r.weight = equal + (i === 0 ? remainder : 0)
        })
      }

      setRows(rows)
      setLoading(false)
    }
    load()
  }, [pipelines])

  const totalWeight = rows.reduce((s, r) => s + r.weight, 0)
  const activeRows = rows.filter((r) => r.active_in_routing)
  const activeTotal = activeRows.reduce((s, r) => s + r.weight, 0)

  function handleWeightChange(pipelineId: string, value: number) {
    setRows((prev) =>
      prev.map((r) => (r.pipeline_id === pipelineId ? { ...r, weight: value } : r))
    )
  }

  async function handleSave() {
    const activePipelines: DistributorPipeline[] = rows
      .filter((r) => r.active_in_routing && r.weight > 0)
      .map((r) => ({ pipeline_id: r.pipeline_id, weight: r.weight }))

    const newConfig: DistributorConfig = {
      enabled: config.enabled,
      pipelines: activePipelines,
    }

    setSaving(true)
    const result = await saveDistributorConfig(newConfig)
    setSaving(false)

    if (result.success) {
      setConfig(newConfig)
      showToast("success", "Distribuidor salvo com sucesso!")
    } else {
      showToast("error", result.error)
    }
  }

  function handleToggleEnabled() {
    setConfig((prev) => ({ ...prev, enabled: !prev.enabled }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-5 animate-spin text-pf-text-muted" />
      </div>
    )
  }

  const hasPipelines = rows.length > 0
  const weightOk = activeTotal === 100 || activeRows.length === 0

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-pf-text">Distribuidor de Leads</h3>
        <p className="text-xs text-pf-text-sec mt-1">
          Distribui leads do catálogo entre vendedores em rodízio ponderado, sem precisar do Agente IA.
        </p>
      </div>

      {/* Toggle ativar */}
      <div className="flex items-center justify-between rounded-xl border border-pf-border bg-pf-surface-2 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-pf-text">Ativar distribuidor</p>
          <p className="text-[11px] text-pf-text-muted">
            Quando ativo, o botão do catálogo redireciona para o próximo WhatsApp no rodízio
          </p>
        </div>
        <button onClick={handleToggleEnabled} className="transition-opacity">
          {config.enabled
            ? <ToggleRight className="size-8" style={{ color: "var(--accent)" }} />
            : <ToggleLeft className="size-8 text-pf-text-muted" />
          }
        </button>
      </div>

      {/* Sem pipelines vinculados */}
      {!hasPipelines && (
        <div className="flex items-start gap-3 rounded-xl border border-pf-border bg-pf-surface-2 p-4">
          <Info className="size-4 shrink-0 mt-0.5 text-pf-text-muted" />
          <p className="text-xs text-pf-text-sec">
            Nenhum pipeline tem WhatsApp vinculado ainda. Vá até a aba{" "}
            <span className="text-pf-accent">WhatsApp</span> e vincule cada número a um pipeline.
          </p>
        </div>
      )}

      {/* Tabela de distribuição */}
      {hasPipelines && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-pf-text-sec">Distribuição de peso (%)</p>
            <span
              className={`text-xs font-mono font-semibold ${
                weightOk ? "text-[var(--positive)]" : "text-[var(--negative)]"
              }`}
            >
              {activeTotal}% / 100%
            </span>
          </div>

          <div className="rounded-xl border border-pf-border bg-pf-surface-2 overflow-hidden">
            {rows.map((row, idx) => (
              <div
                key={row.pipeline_id}
                className={`flex items-center gap-3 px-4 py-3 ${idx > 0 ? "border-t border-pf-border" : ""} ${
                  !row.active_in_routing ? "opacity-40" : ""
                }`}
              >
                {/* Vendedor */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-pf-text truncate">{row.name}</p>
                  {row.phone && (
                    <p className="text-[10px] text-pf-text-muted font-mono">+{row.phone}</p>
                  )}
                  {!row.active_in_routing && (
                    <span className="text-[9px] uppercase tracking-wide text-[var(--negative)]">
                      inativo no WhatsApp
                    </span>
                  )}
                </div>

                {/* Slider de peso */}
                <div className="flex items-center gap-2 w-40">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={row.weight}
                    onChange={(e) => handleWeightChange(row.pipeline_id, Number(e.target.value))}
                    disabled={!row.active_in_routing}
                    className="w-full accent-[var(--accent)] disabled:opacity-30"
                  />
                  <span className="text-xs font-mono w-8 text-right text-pf-text">
                    {row.weight}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Aviso de peso incorreto */}
          {!weightOk && activeRows.length > 0 && (
            <p className="text-[11px] text-[var(--negative)] mt-1">
              A soma dos pesos dos vendedores ativos deve ser 100%. Ajuste os valores.
            </p>
          )}
          <p className="text-[10px] text-pf-text-muted mt-1">
            Para ativar/desativar um número no rodízio, use a aba <span className="text-pf-accent">WhatsApp</span>.
          </p>
        </div>
      )}

      {/* Como funciona */}
      <div className="rounded-xl border border-pf-border bg-pf-surface-2 p-4 flex flex-col gap-2">
        <p className="text-xs font-semibold text-pf-text-sec">Como funciona</p>
        <ul className="flex flex-col gap-1.5">
          {[
            "O lead clica no botão do catálogo",
            "O sistema escolhe o próximo vendedor baseado no peso configurado",
            "O lead é redirecionado para o WhatsApp daquele vendedor",
            "O próximo lead vai para o vendedor seguinte no rodízio",
          ].map((text, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-0.5 size-4 shrink-0 rounded-full bg-pf-accent/10 flex items-center justify-center text-[9px] font-bold text-pf-accent">
                {i + 1}
              </span>
              <span className="text-xs text-pf-text-sec">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Botão salvar */}
      <button
        onClick={handleSave}
        disabled={saving || (!weightOk && activeRows.length > 0)}
        className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-pf-accent text-sm font-semibold text-pf-bg transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {saving ? <><Loader2 className="size-3.5 animate-spin" /> Salvando...</> : "Salvar configuração"}
      </button>

      {/* Toast */}
      {toast && (
        <div
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 ${
            toast.type === "success"
              ? "border-[var(--positive)]/30 bg-[var(--positive)]/10"
              : "border-[var(--negative)]/30 bg-[var(--negative)]/10"
          }`}
        >
          {toast.type === "success"
            ? <CheckCircle2 className="size-4 shrink-0" style={{ color: "var(--positive)" }} />
            : <XCircle className="size-4 shrink-0" style={{ color: "var(--negative)" }} />
          }
          <p className={`text-xs ${toast.type === "success" ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
            {toast.message}
          </p>
        </div>
      )}
    </div>
  )
}
