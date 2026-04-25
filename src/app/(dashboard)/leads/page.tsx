import { Users, Search, Plus } from "lucide-react"

export default function LeadsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-pf-text">Leads</h2>
          <p className="mt-0.5 text-sm text-pf-text-muted">Gerencie seus leads e contatos</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-pf-accent px-3 py-2 text-sm font-semibold text-pf-bg transition-opacity hover:opacity-90">
          <Plus className="size-4" />
          Novo Lead
        </button>
      </div>

      {/* Barra de busca placeholder */}
      <div className="flex h-9 items-center gap-2 rounded-lg border border-pf-border bg-pf-surface px-3">
        <Search className="size-4 shrink-0 text-pf-text-muted" />
        <span className="text-sm text-pf-text-muted">Buscar leads...</span>
      </div>

      {/* Estado vazio */}
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-pf-border bg-pf-surface py-20">
        <div className="flex size-12 items-center justify-center rounded-xl border border-pf-border bg-pf-surface-2">
          <Users className="size-6 text-pf-text-muted" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-pf-text">Nenhum lead ainda</p>
          <p className="mt-1 text-xs text-pf-text-muted">
            Adicione seu primeiro lead para começar
          </p>
        </div>
        <button className="mt-1 flex items-center gap-2 rounded-lg bg-pf-accent px-3 py-2 text-sm font-semibold text-pf-bg transition-opacity hover:opacity-90">
          <Plus className="size-4" />
          Adicionar Lead
        </button>
      </div>
    </div>
  )
}
