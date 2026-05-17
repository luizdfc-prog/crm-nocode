"use server"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any; auth: any }

import { createClient } from "@/lib/supabase/server"
import type { CatalogEventType, CatalogStats, CatalogCartStats } from "@/types"

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

// ── Funil de conversão do catálogo para o dashboard ──────────────────────

export interface CatalogFunnelStats {
  period_days: number
  visits: number
  product_views: number
  whatsapp_clicks: number
  visit_to_product_rate: number   // % visitas que visualizaram produto
  product_to_wa_rate: number      // % visualizações que clicaram WhatsApp
  visit_to_wa_rate: number        // % visitas que viraram WhatsApp (global)
  by_campaign: {
    campaign: string
    visits: number
    whatsapp_clicks: number
    rate: number
  }[]
}

export async function getCatalogFunnelStats(days = 30, dateFrom?: string, dateTo?: string): Promise<CatalogFunnelStats | null> {
  const workspace_id = await getWorkspaceId()
  if (!workspace_id) return null

  const supabase = (await createClient()) as unknown as AnyClient
  const since = dateFrom ?? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const until = dateTo ?? undefined

  let funnelQuery = supabase
    .from("catalog_events")
    .select("event_type, utm_campaign, created_at")
    .eq("workspace_id", workspace_id)
    .gte("created_at", since)
  if (until) funnelQuery = funnelQuery.lte("created_at", until)
  const { data: events } = await funnelQuery

  if (!events) return null

  const typed = events as { event_type: string; utm_campaign: string | null }[]

  const visits         = typed.filter((e) => e.event_type === "page_view").length
  const product_views  = typed.filter((e) => e.event_type === "product_view").length
  const whatsapp_clicks = typed.filter((e) => e.event_type === "whatsapp_click").length

  const pct = (num: number, den: number) => den === 0 ? 0 : Math.round((num / den) * 100)

  // Agrupa por campanha (utm_campaign)
  const campaignMap: Record<string, { visits: number; clicks: number }> = {}
  for (const e of typed) {
    const key = e.utm_campaign?.trim() || "(tráfego orgânico)"
    if (!campaignMap[key]) campaignMap[key] = { visits: 0, clicks: 0 }
    if (e.event_type === "page_view") campaignMap[key].visits++
    if (e.event_type === "whatsapp_click") campaignMap[key].clicks++
  }

  const by_campaign = Object.entries(campaignMap)
    .map(([campaign, { visits: v, clicks: c }]) => ({
      campaign,
      visits: v,
      whatsapp_clicks: c,
      rate: pct(c, v),
    }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 8)

  return {
    period_days: days,
    visits,
    product_views,
    whatsapp_clicks,
    visit_to_product_rate: pct(product_views, visits),
    product_to_wa_rate: pct(whatsapp_clicks, product_views),
    visit_to_wa_rate: pct(whatsapp_clicks, visits),
    by_campaign,
  }
}

export async function getCatalogCartStats(days = 30, dateFrom?: string, dateTo?: string): Promise<CatalogCartStats | null> {
  const workspace_id = await getWorkspaceId()
  if (!workspace_id) return null

  const supabase = (await createClient()) as unknown as AnyClient
  const since = dateFrom ?? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const until = dateTo ?? undefined

  let cartQuery = supabase
    .from("catalog_events")
    .select("event_type, product_name")
    .eq("workspace_id", workspace_id)
    .gte("created_at", since)
    .in("event_type", ["add_to_cart", "cart_whatsapp_click", "cart_recovery_shown", "cart_recovery_click"])
  if (until) cartQuery = cartQuery.lte("created_at", until)
  const { data: events } = await cartQuery

  if (!events) return null

  const typed = events as { event_type: string; product_name: string | null }[]
  const pct = (num: number, den: number) => den === 0 ? 0 : Math.round((num / den) * 100)

  const total_add_to_cart = typed.filter((e) => e.event_type === "add_to_cart").length
  const total_cart_whatsapp_clicks = typed.filter((e) => e.event_type === "cart_whatsapp_click").length
  const total_abandoned = Math.max(0, total_add_to_cart - total_cart_whatsapp_clicks)
  const total_recovery_shown = typed.filter((e) => e.event_type === "cart_recovery_shown").length
  const total_recovery_clicks = typed.filter((e) => e.event_type === "cart_recovery_click").length

  // Ranking de produtos mais adicionados ao carrinho
  const productCount: Record<string, number> = {}
  for (const e of typed) {
    if (e.event_type === "add_to_cart" && e.product_name) {
      productCount[e.product_name] = (productCount[e.product_name] ?? 0) + 1
    }
  }
  const top_products = Object.entries(productCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([product_name, count]) => ({ product_name, count }))

  return {
    total_add_to_cart,
    total_cart_whatsapp_clicks,
    total_abandoned,
    abandoned_rate: pct(total_abandoned, total_add_to_cart),
    conversion_rate: pct(total_cart_whatsapp_clicks, total_add_to_cart),
    top_products,
    total_recovery_shown,
    total_recovery_clicks,
    recovery_rate: pct(total_recovery_clicks, total_recovery_shown),
  }
}
