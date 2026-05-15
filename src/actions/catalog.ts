"use server"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any; auth: any; storage: any }

import { createClient } from "@/lib/supabase/server"
import type { CatalogConfig, CatalogCategory, CatalogProduct, CatalogPublicData, CatalogQuiz } from "@/types"

// ── Helpers ──────────────────────────────────────────────────

async function getWorkspaceAndRole() {
  const supabase = (await createClient()) as unknown as AnyClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single()

  return membership ? { supabase: supabase as AnyClient, ...membership } : null
}

// ── Config ───────────────────────────────────────────────────

export async function getCatalogConfig(): Promise<CatalogConfig | null> {
  const ctx = await getWorkspaceAndRole()
  if (!ctx) return null

  const { data } = await ctx.supabase
    .from("catalog_config")
    .select("*")
    .eq("workspace_id", ctx.workspace_id)
    .single()

  return data ?? null
}

export async function upsertCatalogConfig(
  input: Partial<Omit<CatalogConfig, "id" | "workspace_id" | "created_at" | "updated_at">>
): Promise<{ success: boolean; error?: string; config?: CatalogConfig }> {
  const ctx = await getWorkspaceAndRole()
  if (!ctx) return { success: false, error: "Não autenticado" }
  if (ctx.role !== "admin") return { success: false, error: "Apenas admins podem editar o catálogo" }

  // Valida slug se presente
  if (input.slug) {
    const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-")
    input.slug = slug
  }

  const { data, error } = await ctx.supabase
    .from("catalog_config")
    .upsert(
      { workspace_id: ctx.workspace_id, ...input, updated_at: new Date().toISOString() },
      { onConflict: "workspace_id" }
    )
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // Garante que os campos UTM do catálogo existam no workspace
  await ensureCatalogUtmFields(ctx.supabase as unknown as AnyClient, ctx.workspace_id)

  return { success: true, config: data }
}

const CATALOG_AUTO_FIELDS = [
  { field_key: "utm_source",   label: "UTM Source",   position: 90 },
  { field_key: "utm_medium",   label: "UTM Medium",   position: 91 },
  { field_key: "utm_campaign", label: "UTM Campaign", position: 92 },
]

async function ensureCatalogUtmFields(supabase: AnyClient, workspaceId: string) {
  for (const f of CATALOG_AUTO_FIELDS) {
    const { data: existing } = await supabase
      .from("lead_field_definitions")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("field_key", f.field_key)
      .maybeSingle()

    if (!existing) {
      await supabase.from("lead_field_definitions").insert({
        workspace_id: workspaceId,
        field_key: f.field_key,
        label: f.label,
        name: f.label,
        field_type: "text",
        options: [],
        position: f.position,
      })
    }
  }
}

// ── Catálogo público (sem auth) ──────────────────────────────

export async function getCatalogBySlug(slug: string): Promise<CatalogPublicData | null> {
  const supabase = (await createClient()) as unknown as AnyClient

  const { data: config } = await supabase
    .from("catalog_config")
    .select("*")
    .eq("slug", slug)
    .eq("enabled", true)
    .single()

  if (!config) return null

  const [{ data: categories }, { data: products }, { data: quiz }] = await Promise.all([
    supabase
      .from("catalog_categories")
      .select("*")
      .eq("workspace_id", config.workspace_id)
      .order("position"),
    supabase
      .from("catalog_products")
      .select("*, category:catalog_categories(*)")
      .eq("workspace_id", config.workspace_id)
      .eq("active", true)
      .order("position"),
    supabase
      .from("catalog_quiz")
      .select("*")
      .eq("workspace_id", config.workspace_id)
      .eq("enabled", true)
      .maybeSingle(),
  ])

  return {
    config,
    categories: categories ?? [],
    products: products ?? [],
    quiz: (quiz as CatalogQuiz | null) ?? null,
  }
}

// ── Categorias ───────────────────────────────────────────────

export async function getCatalogCategories(): Promise<CatalogCategory[]> {
  const ctx = await getWorkspaceAndRole()
  if (!ctx) return []

  const { data } = await ctx.supabase
    .from("catalog_categories")
    .select("*")
    .eq("workspace_id", ctx.workspace_id)
    .order("position")

  return data ?? []
}

export async function createCatalogCategory(
  input: Pick<CatalogCategory, "name" | "emoji">
): Promise<{ success: boolean; category?: CatalogCategory; error?: string }> {
  const ctx = await getWorkspaceAndRole()
  if (!ctx) return { success: false, error: "Não autenticado" }
  if (ctx.role !== "admin") return { success: false, error: "Apenas admins" }

  const { data: last } = await ctx.supabase
    .from("catalog_categories")
    .select("position")
    .eq("workspace_id", ctx.workspace_id)
    .order("position", { ascending: false })
    .limit(1)
    .single()

  const position = (last?.position ?? -1) + 1

  const { data, error } = await ctx.supabase
    .from("catalog_categories")
    .insert({ workspace_id: ctx.workspace_id, ...input, position })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, category: data }
}

export async function updateCatalogCategory(
  id: string,
  input: Partial<Pick<CatalogCategory, "name" | "emoji" | "position">>
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getWorkspaceAndRole()
  if (!ctx) return { success: false, error: "Não autenticado" }
  if (ctx.role !== "admin") return { success: false, error: "Apenas admins" }

  const { error } = await ctx.supabase
    .from("catalog_categories")
    .update(input)
    .eq("id", id)
    .eq("workspace_id", ctx.workspace_id)

  return { success: !error, error: error?.message }
}

export async function deleteCatalogCategory(id: string): Promise<{ success: boolean; error?: string }> {
  const ctx = await getWorkspaceAndRole()
  if (!ctx) return { success: false, error: "Não autenticado" }
  if (ctx.role !== "admin") return { success: false, error: "Apenas admins" }

  const { error } = await ctx.supabase
    .from("catalog_categories")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspace_id)

  return { success: !error, error: error?.message }
}

// ── Produtos ─────────────────────────────────────────────────

export async function getCatalogProducts(): Promise<CatalogProduct[]> {
  const ctx = await getWorkspaceAndRole()
  if (!ctx) return []

  const { data } = await ctx.supabase
    .from("catalog_products")
    .select("*, category:catalog_categories(*)")
    .eq("workspace_id", ctx.workspace_id)
    .order("position")

  return data ?? []
}

export async function createCatalogProduct(
  input: Pick<CatalogProduct, "name" | "description" | "price" | "image_url" | "badge" | "active" | "category_id">
): Promise<{ success: boolean; product?: CatalogProduct; error?: string }> {
  const ctx = await getWorkspaceAndRole()
  if (!ctx) return { success: false, error: "Não autenticado" }
  if (ctx.role !== "admin") return { success: false, error: "Apenas admins" }

  const { data: last } = await ctx.supabase
    .from("catalog_products")
    .select("position")
    .eq("workspace_id", ctx.workspace_id)
    .order("position", { ascending: false })
    .limit(1)
    .single()

  const position = (last?.position ?? -1) + 1

  const { data, error } = await ctx.supabase
    .from("catalog_products")
    .insert({ workspace_id: ctx.workspace_id, ...input, position })
    .select("*, category:catalog_categories(*)")
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, product: data }
}

export async function updateCatalogProduct(
  id: string,
  input: Partial<Pick<CatalogProduct, "name" | "description" | "price" | "image_url" | "badge" | "active" | "category_id" | "position">>
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getWorkspaceAndRole()
  if (!ctx) return { success: false, error: "Não autenticado" }
  if (ctx.role !== "admin") return { success: false, error: "Apenas admins" }

  const { error } = await ctx.supabase
    .from("catalog_products")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", ctx.workspace_id)

  return { success: !error, error: error?.message }
}

export async function deleteCatalogProduct(id: string): Promise<{ success: boolean; error?: string }> {
  const ctx = await getWorkspaceAndRole()
  if (!ctx) return { success: false, error: "Não autenticado" }
  if (ctx.role !== "admin") return { success: false, error: "Apenas admins" }

  const { error } = await ctx.supabase
    .from("catalog_products")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspace_id)

  return { success: !error, error: error?.message }
}
