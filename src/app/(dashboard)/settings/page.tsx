import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SettingsTabs } from "@/components/features/settings/SettingsTabs"
import { getPipelines } from "@/actions/pipeline"

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; upgrade?: string }>
}) {
  const { tab, upgrade } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Buscar workspace ativo e papel do usuário
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single()

  if (!membership) redirect("/dashboard")

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", membership.workspace_id)
    .single()

  if (!workspace) redirect("/dashboard")

  const isAdmin = membership.role === "admin"

  // Buscar pipelines (só para admins — não-admins não veem esta aba)
  const pipelines = isAdmin ? await getPipelines() : []

  const activeTab =
    tab === "members" && isAdmin ? "members"
    : tab === "agent" && isAdmin ? "agent"
    : tab === "pipelines" && isAdmin ? "pipelines"
    : tab === "plan" ? "plan"
    : isAdmin ? "workspace"
    : "plan"

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-xl font-bold text-pf-text">
          Configurações
        </h2>
        <p className="mt-0.5 text-sm text-pf-text-muted">
          Gerencie o workspace, membros e assinatura
        </p>
      </div>

      <SettingsTabs
        workspace={workspace}
        currentUserId={user.id}
        currentUserRole={membership.role}
        initialTab={activeTab}
        upgradeSuccess={upgrade === "success"}
        initialPipelines={pipelines}
        tabs={[
          { key: "workspace", label: "Workspace", icon: "building" },
          { key: "members", label: "Membros", icon: "users" },
          { key: "plan", label: "Plano & Cobrança", icon: "credit-card" },
          { key: "agent", label: "Agente IA", icon: "bot" },
          { key: "pipelines", label: "Pipelines", icon: "git-branch" },
        ]}
      />
    </div>
  )
}
