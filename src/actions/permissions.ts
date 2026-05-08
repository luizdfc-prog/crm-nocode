"use server"

import { createClient } from "@/lib/supabase/server"
import type { MemberPermissions, MemberPermissionsWithPipelines, PipelinePermission } from "@/types"

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
  leads_export: false,
  convs_view: "all",
  convs_delete: false,
  deals_create: true,
  deals_view: "all",
  deals_edit: "all",
  deals_delete: false,
}

// Retorna null se admin (sem restrições). Retorna permissões se member.
export async function getMyPermissions(): Promise<MemberPermissionsWithPipelines | null> {
  const ctx = await getContext()
  if (!ctx) return null
  if (ctx.role === "admin") return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = ctx.supabase as any

  const [permsResult, pipelinePermsResult] = await Promise.all([
    ctx.supabase
      .from("member_permissions")
      .select("*")
      .eq("workspace_id", ctx.workspaceId)
      .eq("profile_id", ctx.userId)
      .maybeSingle(),
    db
      .from("pipeline_permissions")
      .select("*")
      .eq("workspace_id", ctx.workspaceId)
      .eq("profile_id", ctx.userId),
  ])

  const perms: MemberPermissions = permsResult.data
    ? (permsResult.data as unknown as MemberPermissions)
    : { id: "", workspace_id: ctx.workspaceId, profile_id: ctx.userId, ...DEFAULT_PERMISSIONS }

  return {
    ...perms,
    pipeline_permissions: (pipelinePermsResult.data ?? []) as unknown as PipelinePermission[],
  }
}

// Para o admin carregar permissões de outro membro
export async function getMemberPermissions(profileId: string): Promise<MemberPermissionsWithPipelines | null> {
  const ctx = await getContext()
  if (!ctx) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = ctx.supabase as any

  const [permsResult, pipelinePermsResult] = await Promise.all([
    ctx.supabase
      .from("member_permissions")
      .select("*")
      .eq("workspace_id", ctx.workspaceId)
      .eq("profile_id", profileId)
      .maybeSingle(),
    db
      .from("pipeline_permissions")
      .select("*")
      .eq("workspace_id", ctx.workspaceId)
      .eq("profile_id", profileId),
  ])

  const perms: MemberPermissions = permsResult.data
    ? (permsResult.data as unknown as MemberPermissions)
    : { id: "", workspace_id: ctx.workspaceId, profile_id: profileId, ...DEFAULT_PERMISSIONS }

  return {
    ...perms,
    pipeline_permissions: (pipelinePermsResult.data ?? []) as unknown as PipelinePermission[],
  }
}

// Salva permissões gerais de um membro (apenas admin)
export async function updateMemberPermissions(
  profileId: string,
  perms: Partial<Omit<MemberPermissions, "id" | "workspace_id" | "profile_id">>
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getContext()
  if (!ctx) return { success: false, error: "Não autenticado" }
  if (ctx.role !== "admin") return { success: false, error: "Apenas admins podem alterar permissões" }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (ctx.supabase as any)
    .from("member_permissions")
    .upsert({
      workspace_id: ctx.workspaceId,
      profile_id: profileId,
      ...perms,
    }, { onConflict: "workspace_id,profile_id" })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// Salva permissões de pipeline para um membro (apenas admin)
export async function updatePipelinePermissions(
  profileId: string,
  pipelines: { pipeline_id: string; can_view: boolean; can_edit: boolean }[]
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getContext()
  if (!ctx) return { success: false, error: "Não autenticado" }
  if (ctx.role !== "admin") return { success: false, error: "Apenas admins podem alterar permissões" }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = ctx.supabase as any

  await db
    .from("pipeline_permissions")
    .delete()
    .eq("workspace_id", ctx.workspaceId)
    .eq("profile_id", profileId)

  if (pipelines.length === 0) return { success: true }

  const { error } = await db
    .from("pipeline_permissions")
    .insert(pipelines.map(p => ({
      workspace_id: ctx.workspaceId,
      profile_id: profileId,
      pipeline_id: p.pipeline_id,
      can_view: p.can_view,
      can_edit: p.can_edit,
    })))

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function canDeleteLead(): Promise<boolean> {
  const ctx = await getContext()
  if (!ctx) return false
  if (ctx.role === "admin") return true

  const { data } = await ctx.supabase
    .from("member_permissions")
    .select("leads_delete")
    .eq("workspace_id", ctx.workspaceId)
    .eq("profile_id", ctx.userId)
    .maybeSingle()

  return (data as unknown as { leads_delete?: boolean } | null)?.leads_delete ?? DEFAULT_PERMISSIONS.leads_delete
}

export async function canExportLeads(): Promise<boolean> {
  const ctx = await getContext()
  if (!ctx) return false
  if (ctx.role === "admin") return true

  const { data } = await ctx.supabase
    .from("member_permissions")
    .select("leads_export")
    .eq("workspace_id", ctx.workspaceId)
    .eq("profile_id", ctx.userId)
    .maybeSingle()

  return (data as unknown as { leads_export?: boolean } | null)?.leads_export ?? DEFAULT_PERMISSIONS.leads_export
}
