import { getDashboardMetrics, getSalesReport } from "@/actions/deals"
import { getRecentActivities } from "@/actions/activities"
import { getFieldStats } from "@/actions/customFields"
import { getPipelines } from "@/actions/pipeline"
import { getCatalogFunnelStats } from "@/actions/catalogTracking"
import { DashboardClient } from "@/components/features/dashboard/DashboardClient"

export default async function DashboardPage() {
  const [metrics, recentActivities, fieldStats, pipelines, salesReport, catalogFunnel] = await Promise.all([
    getDashboardMetrics(),
    getRecentActivities(6),
    getFieldStats({ dealContext: "active" }),
    getPipelines(),
    getSalesReport(),
    getCatalogFunnelStats(30),
  ])

  if (!metrics || !salesReport) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-pf-text-muted">Não autenticado</p>
      </div>
    )
  }

  return (
    <DashboardClient
      initialMetrics={metrics}
      initialFieldStats={fieldStats}
      initialActivities={recentActivities}
      pipelines={pipelines}
      initialSalesReport={salesReport}
      initialCatalogFunnel={catalogFunnel}
    />
  )
}
