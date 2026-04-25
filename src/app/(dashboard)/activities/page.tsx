import { Activity, Plus } from "lucide-react"

export default function ActivitiesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-pf-text">Atividades</h2>
          <p className="mt-0.5 text-sm text-pf-text-muted">
            Histórico de interações com leads
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-pf-accent px-3 py-2 text-sm font-semibold text-pf-bg transition-opacity hover:opacity-90">
          <Plus className="size-4" />
          Nova Atividade
        </button>
      </div>

      {/* Estado vazio */}
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-pf-border bg-pf-surface py-20">
        <div className="flex size-12 items-center justify-center rounded-xl border border-pf-border bg-pf-surface-2">
          <Activity className="size-6 text-pf-text-muted" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-pf-text">Nenhuma atividade registrada</p>
          <p className="mt-1 text-xs text-pf-text-muted">
            Registre ligações, e-mails, reuniões e notas
          </p>
        </div>
      </div>
    </div>
  )
}
