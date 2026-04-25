import { Plus } from "lucide-react"

const STAGES = [
  { id: "new_lead", label: "Novo Lead", color: "text-pf-cool" },
  { id: "contact_made", label: "Contato Realizado", color: "text-pf-text-sec" },
  { id: "proposal_sent", label: "Proposta Enviada", color: "text-pf-warm" },
  { id: "negotiation", label: "Negociação", color: "text-pf-accent" },
  { id: "closed_won", label: "Fechado Ganho", color: "text-pf-positive" },
  { id: "closed_lost", label: "Fechado Perdido", color: "text-pf-negative" },
]

export default function PipelinePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-pf-text">Pipeline</h2>
          <p className="mt-0.5 text-sm text-pf-text-muted">Visualize e gerencie seus negócios</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-pf-accent px-3 py-2 text-sm font-semibold text-pf-bg transition-opacity hover:opacity-90">
          <Plus className="size-4" />
          Novo Negócio
        </button>
      </div>

      {/* Colunas do kanban — placeholder */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <div
            key={stage.id}
            className="flex w-[260px] shrink-0 flex-col gap-2 rounded-xl border border-pf-border bg-pf-surface p-3"
          >
            <div className="flex items-center justify-between px-1">
              <p className={`text-xs font-semibold ${stage.color}`}>{stage.label}</p>
              <span className="rounded-md border border-pf-border bg-pf-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-pf-text-muted">
                0
              </span>
            </div>
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-pf-border">
              <p className="text-xs text-pf-text-muted">Vazio</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
