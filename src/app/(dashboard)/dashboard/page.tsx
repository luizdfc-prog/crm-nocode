import { Users, TrendingUp, DollarSign, Percent } from "lucide-react"
import { MetricCard } from "@/components/features/dashboard/MetricCard"
import { FunnelChart } from "@/components/features/dashboard/FunnelChart"
import { UpcomingDeals } from "@/components/features/dashboard/UpcomingDeals"
import { RecentActivity } from "@/components/features/dashboard/RecentActivity"
import { getDashboardMetrics } from "@/actions/deals"
import { getRecentActivities } from "@/actions/activities"

export default async function DashboardPage() {
  const [metrics, recentActivities] = await Promise.all([
    getDashboardMetrics(),
    getRecentActivities(6),
  ])

  if (!metrics) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-pf-text-muted">Não autenticado</p>
      </div>
    )
  }

  const {
    totalLeads,
    newLeadsThisWeek,
    openDealsCount,
    pipelineValue,
    wonValue,
    conversionRate,
    wonDealsCount,
    closedDealsCount,
    funnelData,
    upcomingDeals,
  } = metrics

  const urgentCount = upcomingDeals.filter((d) => {
    const due = new Date(d.due_date!).setHours(0, 0, 0, 0)
    const now = new Date().setHours(0, 0, 0, 0)
    return due <= now + 7 * 86_400_000
  }).length

  return (
    <div className="flex flex-col gap-6">

      {/* Cabeçalho */}
      <div>
        <h2 className="font-heading text-xl font-bold text-pf-text">Visão Geral</h2>
        <p className="mt-0.5 text-sm text-pf-text-muted">
          Dados do workspace atual · atualizados agora
        </p>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total de Leads"
          value={String(totalLeads)}
          icon={Users}
          description={`${newLeadsThisWeek} novo${newLeadsThisWeek !== 1 ? "s" : ""} nos últimos 7 dias`}
          change={newLeadsThisWeek > 0 ? `+${newLeadsThisWeek} esta semana` : "Nenhum novo esta semana"}
          changeType={newLeadsThisWeek > 0 ? "positive" : "neutral"}
        />
        <MetricCard
          label="Negócios Abertos"
          value={String(openDealsCount)}
          icon={TrendingUp}
          description="Em 4 etapas ativas do pipeline"
          change={`${openDealsCount} ativo${openDealsCount !== 1 ? "s" : ""} agora`}
          changeType="neutral"
        />
        <MetricCard
          label="Valor do Pipeline"
          value={pipelineValue.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
            maximumFractionDigits: 0,
          })}
          icon={DollarSign}
          description="Soma dos negócios em aberto"
          change={
            openDealsCount > 0
              ? `Média de ${(pipelineValue / openDealsCount).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  maximumFractionDigits: 0,
                })} por negócio`
              : "Nenhum negócio aberto"
          }
          changeType="positive"
          accent
        />
        <MetricCard
          label="Taxa de Conversão"
          value={`${conversionRate}%`}
          icon={Percent}
          description={`${wonDealsCount} ganhos de ${closedDealsCount} encerrados`}
          change={
            closedDealsCount === 0
              ? "Nenhum negócio encerrado ainda"
              : conversionRate >= 50
              ? `${conversionRate}% acima da meta de 50%`
              : `Meta: 50% · faltam ${50 - conversionRate}pp`
          }
          changeType={closedDealsCount === 0 ? "neutral" : conversionRate >= 50 ? "positive" : "negative"}
        />
      </div>

      {/* Funil de vendas + Atividades recentes */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">

        {/* Funil — ocupa 3/5 */}
        <div className="lg:col-span-3 rounded-xl border border-pf-border bg-pf-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-pf-text">Funil de Vendas</p>
              <p className="text-xs text-pf-text-muted">Negócios por etapa do pipeline</p>
            </div>
            <span className="rounded-md border border-pf-border px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-pf-text-muted">
              Ativos
            </span>
          </div>
          <FunnelChart data={funnelData} />

          {/* Totalizador */}
          <div className="mt-4 flex items-center justify-between border-t border-pf-border pt-3">
            <span className="text-xs text-pf-text-muted">Total encerrado (ganho)</span>
            <span className="text-sm font-semibold text-pf-positive">
              {wonValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {/* Atividades recentes — ocupa 2/5 */}
        <div className="lg:col-span-2 rounded-xl border border-pf-border bg-pf-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-pf-text">Atividades Recentes</p>
              <p className="text-xs text-pf-text-muted">Últimas interações com leads</p>
            </div>
          </div>
          <RecentActivity activities={recentActivities} />
        </div>

      </div>

      {/* Negócios com prazo próximo */}
      <div className="rounded-xl border border-pf-border bg-pf-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-pf-text">Negócios com Prazo Próximo</p>
            <p className="text-xs text-pf-text-muted">
              {upcomingDeals.length > 0
                ? `${upcomingDeals.length} negócio${upcomingDeals.length > 1 ? "s" : ""} vencem nos próximos 30 dias`
                : "Nenhum prazo nos próximos 30 dias"}
            </p>
          </div>
          {urgentCount > 0 && (
            <span className="rounded-full bg-pf-warm/10 px-2.5 py-0.5 text-xs font-medium text-pf-warm">
              {urgentCount} urgente{urgentCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <UpcomingDeals deals={upcomingDeals} />
      </div>

    </div>
  )
}
