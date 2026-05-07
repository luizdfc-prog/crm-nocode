"use client"

import { useState } from "react"
import { TrendingDown, X } from "lucide-react"

const DEFAULT_REASONS = [
  "Orçamento insuficiente",
  "Comprado do concorrente",
  "Não respondeu as mensagens",
  "Não se encaixa à necessidade",
  "Lead desqualificado",
  "Longa distância",
  "Garantia",
  "Outro",
]

interface LostReasonModalProps {
  dealTitle: string
  onConfirm: (reason: string) => void
  onCancel: () => void
}

export function LostReasonModal({ dealTitle, onConfirm, onCancel }: LostReasonModalProps) {
  const [selected, setSelected] = useState("")
  const [custom, setCustom] = useState("")

  const finalReason = selected === "Outro" ? custom.trim() : selected

  function handleConfirm() {
    if (!finalReason) return
    onConfirm(finalReason)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm mx-4 rounded-2xl border border-pf-border bg-pf-surface p-6 shadow-2xl flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: "rgba(255,71,87,0.12)", border: "1px solid rgba(255,71,87,0.25)" }}
            >
              <TrendingDown className="w-5 h-5" style={{ color: "#FF4757" }} />
            </div>
            <div>
              <p className="font-semibold text-pf-text text-sm">Motivo da perda</p>
              <p className="text-xs text-pf-text-muted mt-0.5 max-w-[180px] truncate">{dealTitle}</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-pf-text-muted hover:text-pf-text p-1 rounded-lg hover:bg-pf-surface-2 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-pf-text-sec">
          Por que este negócio foi perdido? Esta informação ajuda a melhorar o processo de vendas.
        </p>

        <div className="flex flex-col gap-1.5">
          {DEFAULT_REASONS.map((reason) => (
            <button
              key={reason}
              onClick={() => setSelected(reason)}
              className="text-left px-3 py-2 rounded-lg text-sm transition-colors border"
              style={{
                borderColor: selected === reason ? "rgba(255,71,87,0.5)" : "var(--pf-border, #2A2A2E)",
                backgroundColor: selected === reason ? "rgba(255,71,87,0.08)" : "var(--pf-surface-2, #1A1A1E)",
                color: selected === reason ? "#FF4757" : "var(--pf-text-sec, #8A8A8F)",
              }}
            >
              {reason}
            </button>
          ))}
        </div>

        {selected === "Outro" && (
          <input
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Descreva o motivo..."
            autoFocus
            className="w-full rounded-lg border border-pf-border bg-pf-surface-2 px-3 py-2 text-sm text-pf-text outline-none focus:border-pf-accent/50 transition-colors placeholder:text-pf-text-muted"
          />
        )}

        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-pf-border text-sm text-pf-text-muted hover:text-pf-text hover:bg-pf-surface-2 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!finalReason}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: "#FF4757" }}
          >
            Confirmar perda
          </button>
        </div>
      </div>
    </div>
  )
}
