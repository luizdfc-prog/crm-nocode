import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/supabase/workspace-cookie"

export { ACTIVE_WORKSPACE_COOKIE } from "@/lib/supabase/workspace-cookie"

/**
 * Retorna o workspace_id ativo do usuário autenticado.
 * Prioridade: cookie z4p_active_workspace → primeiro workspace do usuário.
 * Valida que o usuário realmente pertence ao workspace do cookie.
 */
export async function getActiveWorkspaceId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const cookieStore = await cookies()
  const cookieWorkspaceId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value

  if (cookieWorkspaceId) {
    const { data } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("profile_id", user.id)
      .eq("workspace_id", cookieWorkspaceId)
      .maybeSingle()

    if (data) return data.workspace_id
  }

  // Fallback: primeiro workspace do usuário
  const { data } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single()

  return data?.workspace_id ?? null
}
