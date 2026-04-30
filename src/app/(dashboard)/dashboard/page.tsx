import { Users, TrendingUp, DollarSign, Percent } from "lucide-react"
import { MetricCard } from "@/components/features/dashboard/MetricCard"
import { FunnelChart } from "@/components/features/dashboard/FunnelChart"
import { UpcomingDeals } from "@/components/features/dashboard/UpcomingDeals"
import { RecentActivity } from "@/components/features/dashboard/RecentActivity"
import { MOCK_LEADS, MOCK_DEALS, MOCK_ACTIVITIES } from "@/utils/mock-data"

// ─── métricas ────────────────────────────────────────────────────────────────

const ACTIVE_STAGES = ["new_lead", "contact_made", "proposal_sent", "negotiation"] as const
const CLOSED_STAGES = ["closed_won", "closed_lost"] as const

const totalLeads = MOCK_LEADS.length

const openDeals = MOCK_DEALS.filter((d) =>
  (ACTIVE_STAGES as readonly string[]).includes(d.stage)
)
const openDealsCount = openDeals.length
const pipelineValue = openDeals.reduce((sum, d) => sum + d.value, 0)

const closedDeals = MOCK_DEALS.filter((d) =>
  (CLOSED_STAGES as readonly string[]).includes(d.stage)
)
const wonDeals = MOCK_DEALS.filter((d) => d.stage === "closed_won")
const conversionRate =
  closedDeals.length > 0
    ? Math.round((wonDeals.length / closedDeals.length) * 100)
    : 0

// ─── funil ───────────────────────────────────────────────────────────────────

const FUNNEL_STAGES: { key: string; label: string }[] = [
  { key: "new_lead", label: "Novo Lead" },
  { key: "contact_made", label: "Contato Realizado" },
  { key: "proposal_sent", label: "Proposta Enviada" },
  { key: "negotiation", label: "Negociação" },
  { key: "closed_won", label: "Fechado Ganho" },
]

const funnelData = FUNNEL_STAGES.map(({ key, label }) => {
  const stageDeals = MOCK_DEALS.filter((d) => d.stage === key)
  return {
    stage: label,
    count: stageDeals.length,
    value: stageDeals.reduce((sum, d) => sum + d.value, 0),
  }
})

// ─── negócios com prazo próximo (próximos 30 dias, ordenados pelo mais urgente)

const now = new Date().setHours(0, 0, 0, 0)
const in30Days = now + 30 * 86_400_000

const upcomingDeals = MOCK_DEALS.filter((d) => {
  if (!d.due_date) return false
  if (!(ACTIVE_STAGES as readonly string[]).includes(d.stage)) return false
  const due = new Date(d.due_date).setHours(0, 0, 0, 0)
  return due <= in30Days
}).sort((a, b) => {
  const da = new Date(a.due_date!).getTime()
  const db = new Date(b.due_date!).getTime()
  return da - db
})

// ─── atividades recentes (6 mais recentes) ────────────────────────────────────

const recentActivities = [...MOCK_ACTIVITIES]
  .sort((a, b) => new Date(b.activity_date).getTime() - new Date(a.activity_date).getTime())
  .slice(0, 6)

// ─── componente ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
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
          description={`${MOCK_LEADS.filter((l) => l.status === "new").length} novos este mês`}
          change="+3 nos últimos 7 dias"
          changeType="positive"
        />
        <MetricCard
          label="Negócios Abertos"
          value={String(openDealsCount)}
          icon={TrendingUp}
          description={`Em ${ACTIVE_STAGES.length} etapas do pipeline`}
          change={`${openDealsCount} ativos agora`}
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
          change={`Média de ${(pipelineValue / openDealsCount).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
            maximumFractionDigits: 0,
          })} por negócio`}
          changeType="positive"
          accent
        />
        <MetricCard
          label="Taxa de Conversão"
          value={`${conversionRate}%`}
          icon={Percent}
          description={`${wonDeals.length} ganhos de ${closedDeals.length} encerrados`}
          change={
            conversionRate >= 50
              ? `${conversionRate}% acima da média`
              : `Meta: 50% · faltam ${50 - conversionRate}pp`
          }
          changeType={conversionRate >= 50 ? "positive" : "negative"}
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
              {wonDeals
                .reduce((s, d) => s + d.value, 0)
                .toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
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
          {upcomingDeals.filter((d) => {
            const due = new Date(d.due_date!).setHours(0, 0, 0, 0)
            return due <= now + 7 * 86_400_000
          }).length > 0 && (
            <span className="rounded-full bg-pf-warm/10 px-2.5 py-0.5 text-xs font-medium text-pf-warm">
              {upcomingDeals.filter((d) => {
                const due = new Date(d.due_date!).setHours(0, 0, 0, 0)
                return due <= now + 7 * 86_400_000
              }).length} urgentes
            </span>
          )}
        </div>
        <UpcomingDeals deals={upcomingDeals} />
      </div>

    </div>
  )
}
