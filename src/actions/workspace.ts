"use server"

import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import type { Database } from "@/types/database"

type ActionResult = { success: true } | { success: false; error: string }

// Cria workspace e insere o criador como admin via service role.
// O trigger on_workspace_created foi removido (migration 011) pois
// auth.uid() retorna null em contexto de trigger via cliente browser.
export async function createWorkspace(name: string): Promise<ActionResult> {
  if (!name || name.trim().length < 2) {
    return { success: false, error: "Nome deve ter ao menos 2 caracteres" }
  }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Não autenticado" }

  const service = createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: workspace, error: wsError } = await service
    .from("workspaces")
    .insert({ name: name.trim(), plan: "free" })
    .select("id")
    .single()

  if (wsError || !workspace) {
    return { success: false, error: "Erro ao criar workspace. Tente novamente." }
  }

  const { error: memberError } = await service
    .from("workspace_members")
    .insert({ workspace_id: workspace.id, profile_id: user.id, role: "admin" })

  if (memberError) {
    // Workspace criado mas membro não inserido — limpar para não deixar órfão
    await service.from("workspaces").delete().eq("id", workspace.id)
    return { success: false, error: "Erro ao configurar workspace. Tente novamente." }
  }

  revalidatePath("/dashboard")
  return { success: true }
}
