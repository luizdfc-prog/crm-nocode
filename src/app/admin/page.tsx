import { getAdminDashboard } from "@/actions/admin"
import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email?.endsWith("@engenharia.app")) {
    redirect("/admin/login")
  }

  const { from, to } = await searchParams

  const data = await getAdminDashboard(from, to)

  return <AdminDashboardClient data={data} initialFrom={from} initialTo={to} />
}
