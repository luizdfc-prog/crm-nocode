"use server"

import { createClient } from "@/lib/supabase/server"
import type { MemberPermissions, PermissionLevel } from "@/types"

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("profile_id", user.id)
    .limit(1)
    .single()

  if (!data) return null
  return { supabase, userId: user.id, workspaceId: data.workspace_id, role: data.role as "admin" | "member" }
}

const DEFAULT_PERMISSIONS: Omit<MemberPermissions, "id" | "workspace_id" | "profile_id"> = {
  leads_create: true,
  leads_view: "all",
  leads_edit: "all",
  leads_delete: false,
  convs_view: "all",
  convs_delete: false,
  deals_create: true,
  deals_view: "all",
  deals_edit: "all",
  deals_delete: false,
}

// Retorna null se admin (sem restrições). Retorna permissões se member.
export async function getMyPermissions(): Promise<MemberPermissions | null> {
  const ctx = await getContext()
  if (!ctx) return null
  if (ctx.role === "admin") return null

  const { data } = await ctx.supabase
    .from("member_permissions")
    .select("*")
    .eq("workspace_id", ctx.workspaceId)
    .eq("profile_id", ctx.userId)
    .maybeSingle()

  if (!data) return { id: "", workspace_id: ctx.workspaceId, profile_id: ctx.userId, ...DEFAULT_PERMISSIONS }
  return data as unknown as MemberPermissions
}

// Para o admin carregar permissões de outro membro
export async function getMemberPermissions(profileId: string): Promise<MemberPermissions | null> {
  const ctx = await getContext()
  if (!ctx) return null

  const { data } = await ctx.supabase
    .from("member_permissions")
    .select("*")
    .eq("workspace_id", ctx.workspaceId)
    .eq("profile_id", profileId)
    .maybeSingle()

  if (!data) return { id: "", workspace_id: ctx.workspaceId, profile_id: profileId, ...DEFAULT_PERMISSIONS }
  return data as unknown as MemberPermissions
}

// Salva permissões de um membro (apenas admin)
export async function updateMemberPermissions(
  profileId: string,
  perms: Partial<Omit<MemberPermissions, "id" | "workspace_id" | "profile_id">>
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getContext()
  if (!ctx) return { success: false, error: "Não autenticado" }
  if (ctx.role !== "admin") return { success: false, error: "Apenas admins podem alterar permissões" }

  const { error } = await ctx.supabase
    .from("member_permissions")
    .upsert({
      workspace_id: ctx.workspaceId,
      profile_id: profileId,
      ...perms,
    }, { onConflict: "workspace_id,profile_id" })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

