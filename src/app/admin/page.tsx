import { getAdminDashboard } from "@/actions/admin"
import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email?.endsWith("@engenharia.app")) {
    redirect("/admin/login")
  }

  const data = await getAdminDashboard()

  return <AdminDashboardClient data={data} />
}
