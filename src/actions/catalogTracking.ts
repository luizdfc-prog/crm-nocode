"use server"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any; auth: any }

import { createClient } from "@/lib/supabase/server"
import type { CatalogEventType, CatalogStats } from "@/types"

// ── Registro de eventos (chamado pela página pública, sem auth) ───────────

export async function recordCatalogEvent(input: {
  workspace_id: string
  event_type: CatalogEventType
  product_id?: string | null
  product_name?: string | null
  referrer?: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
}): Promise<void> {
  try {
    const supabase = (await createClient()) as unknown as AnyClient
    await supabase.from("catalog_events").insert(input)
  } catch {
    // silencioso — nunca bloquear o catálogo por falha de tracking
  }
}

// ── Estatísticas para o CRM ──────────────────────────────────────────────

async function getWorkspaceId(): Promise<string | null> {
  const supabase = (await createClient()) as unknown as AnyClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single()
  return data?.workspace_id ?? null
}

export async function getCatalogStats(days = 30): Promise<CatalogStats | null> {
  const workspace_id = await getWorkspaceId()
  if (!workspace_id) return null

  const supabase = (await createClient()) as unknown as AnyClient
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data: events } = await supabase
    .from("catalog_events")
    .select("event_type, product_id, product_name, created_at")
    .eq("workspace_id", workspace_id)
    .gte("created_at", since)
    .order("created_at", { ascending: true })

  if (!events) return null

  const total_page_views = events.filter((e: { event_type: string }) => e.event_type === "page_view").length
  const total_product_views = events.filter((e: { event_type: string }) => e.event_type === "product_view").length
  const total_whatsapp_clicks = events.filter((e: { event_type: string }) => e.event_type === "whatsapp_click").length

  // Top produtos
  const productMap: Record<string, { views: number; clicks: number }> = {}
  for (const e of events as { event_type: string; product_name: string | null }[]) {
    if (!e.product_name) continue
    if (!productMap[e.product_name]) productMap[e.product_name] = { views: 0, clicks: 0 }
    if (e.event_type === "product_view") productMap[e.product_name].views++
    if (e.event_type === "whatsapp_click") productMap[e.product_name].clicks++
  }
  const top_products = Object.entries(productMap)
    .map(([product_name, { views, clicks }]) => ({ product_name, views, clicks }))
    .sort((a, b) => b.views + b.clicks - (a.views + a.clicks))
    .slice(0, 10)

  // Visitas por dia
  const dayMap: Record<string, { views: number; clicks: number }> = {}
  for (const e of events as { event_type: string; created_at: string }[]) {
    const date = e.created_at.slice(0, 10)
    if (!dayMap[date]) dayMap[date] = { views: 0, clicks: 0 }
    if (e.event_type === "page_view" || e.event_type === "product_view") dayMap[date].views++
    if (e.event_type === "whatsapp_click") dayMap[date].clicks++
  }
  const views_by_day = Object.entries(dayMap)
    .map(([date, { views, clicks }]) => ({ date, views, clicks }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return { total_page_views, total_product_views, total_whatsapp_clicks, top_products, views_by_day }
}
