import { Users, TrendingUp, DollarSign, Percent } from "lucide-react"
import { MetricCard } from "@/components/features/dashboard/MetricCard"

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-xl font-bold text-pf-text">Visão Geral</h2>
        <p className="mt-0.5 text-sm text-pf-text-muted">Dados do workspace atual</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total de Leads"
          value="0"
          icon={Users}
          description="Nenhum lead cadastrado"
          change="Adicione seu primeiro lead"
          changeType="neutral"
        />
        <MetricCard
          label="Negócios Abertos"
          value="0"
          icon={TrendingUp}
          description="Pipeline vazio"
          change="Crie negócios no pipeline"
          changeType="neutral"
        />
        <MetricCard
          label="Valor do Pipeline"
          value="R$ 0"
          icon={DollarSign}
          description="Sem negócios ativos"
          change="—"
          changeType="neutral"
        />
        <MetricCard
          label="Taxa de Conversão"
          value="—"
          icon={Percent}
          description="Dados insuficientes"
          change="—"
          changeType="neutral"
        />
      </div>

      {/* Placeholder do gráfico de funil */}
      <div className="rounded-xl border border-pf-border bg-pf-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-pf-text">Funil de Vendas</p>
          <span className="rounded-md border border-pf-border px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-pf-text-muted">
            Em breve
          </span>
        </div>
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-pf-border">
          <p className="text-sm text-pf-text-muted">
            Gráfico disponível após cadastrar leads
          </p>
        </div>
      </div>

      {/* Placeholder de negócios próximos */}
      <div className="rounded-xl border border-pf-border bg-pf-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-pf-text">Negócios com prazo próximo</p>
        </div>
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-pf-border">
          <p className="text-sm text-pf-text-muted">Nenhum negócio cadastrado ainda</p>
        </div>
      </div>
    </div>
  )
}
