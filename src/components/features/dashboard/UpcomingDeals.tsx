import { AlertCircle, Clock } from "lucide-react"
import type { Deal } from "@/types"

interface UpcomingDealsProps {
  deals: Deal[]
}

function urgencyClass(daysLeft: number): string {
  if (daysLeft < 0) return "text-pf-negative"
  if (daysLeft <= 2) return "text-pf-warm"
  if (daysLeft <= 7) return "text-yellow-400"
  return "text-pf-text-sec"
}

function daysLabel(daysLeft: number): string {
  if (daysLeft < 0) return `${Math.abs(daysLeft)}d atrasado`
  if (daysLeft === 0) return "Vence hoje"
  if (daysLeft === 1) return "Vence amanhã"
  return `${daysLeft}d restantes`
}

const STAGE_LABEL: Record<string, string> = {
  novo_lead: "Novo Lead",
  contato_realizado: "Contato Realizado",
  proposta_enviada: "Proposta Enviada",
  negociacao: "Negociação",
  fechado_ganho: "Fechado Ganho",
  fechado_perdido: "Fechado Perdido",
}

export function UpcomingDeals({ deals }: UpcomingDealsProps) {
  if (deals.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-pf-border">
        <p className="text-sm text-pf-text-muted">Nenhum negócio com prazo nos próximos 30 dias</p>
      </div>
    )
  }

  return (
    <>
      {/* Table — visible md+ */}
      <div className="hidden overflow-hidden rounded-lg border border-pf-border md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-pf-border bg-pf-surface-2">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-pf-text-muted">Negócio</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-pf-text-muted">Etapa</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-pf-text-muted">Responsável</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-pf-text-muted">Valor</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-pf-text-muted">Prazo</th>
            </tr>
          </thead>
          <tbody>
            {deals.map((deal, i) => {
              const daysLeft = deal.due_date
                ? Math.ceil(
                    (new Date(deal.due_date).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) /
                      86_400_000
                  )
                : null

              return (
                <tr
                  key={deal.id}
                  className={
                    i < deals.length - 1
                      ? "border-b border-pf-border transition-colors hover:bg-pf-surface-2/60"
                      : "transition-colors hover:bg-pf-surface-2/60"
                  }
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {daysLeft !== null && daysLeft <= 2 && (
                        <AlertCircle className="size-3.5 shrink-0 text-pf-warm" />
                      )}
                      <div>
                        <p className="font-medium text-pf-text">{deal.title}</p>
                        {deal.lead && (
                          <p className="text-xs text-pf-text-muted">{deal.lead.company ?? deal.lead.name}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md border border-pf-border px-2 py-0.5 text-xs text-pf-text-sec">
                      {STAGE_LABEL[deal.stage] ?? deal.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-pf-text-sec">{deal.owner?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-medium text-pf-text">
                    {deal.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {daysLeft !== null ? (
                      <span className={`flex items-center justify-end gap-1 text-xs font-medium ${urgencyClass(daysLeft)}`}>
                        <Clock className="size-3" />
                        {daysLabel(daysLeft)}
                      </span>
                    ) : (
                      <span className="text-xs text-pf-text-muted">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Card stack — visible below md */}
      <div className="flex flex-col divide-y divide-pf-border overflow-hidden rounded-lg border border-pf-border md:hidden">
        {deals.map((deal) => {
          const daysLeft = deal.due_date
            ? Math.ceil(
                (new Date(deal.due_date).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) /
                  86_400_000
              )
            : null

          return (
            <div key={deal.id} className="flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-pf-surface-2/60">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {daysLeft !== null && daysLeft <= 2 && (
                    <AlertCircle className="size-3.5 shrink-0 text-pf-warm" />
                  )}
                  <p className="truncate font-medium text-pf-text">{deal.title}</p>
                </div>
                {deal.lead && (
                  <p className="mt-0.5 text-xs text-pf-text-muted">{deal.lead.company ?? deal.lead.name}</p>
                )}
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="rounded-md border border-pf-border px-1.5 py-0.5 text-[10px] text-pf-text-sec">
                    {STAGE_LABEL[deal.stage] ?? deal.stage}
                  </span>
                  {deal.owner?.name && (
                    <span className="text-xs text-pf-text-muted">{deal.owner.name}</span>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-pf-text">
                  {deal.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                </p>
                {daysLeft !== null && (
                  <span className={`flex items-center justify-end gap-1 text-xs font-medium ${urgencyClass(daysLeft)}`}>
                    <Clock className="size-3" />
                    {daysLabel(daysLeft)}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
