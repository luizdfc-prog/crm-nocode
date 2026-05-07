"use server"

import { createClient } from "@/lib/supabase/server"
import { getServiceClient } from "@/lib/supabase/service"

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email?.endsWith("@engenharia.app")) {
    throw new Error("Acesso negado")
  }
  return user
}

export interface WorkspaceSummary {
  id: string
  name: string
  plan: string
  created_at: string
  members_count: number
  leads_count: number
  deals_count: number
  messages_count: number
  conversations_count: number
  // Consumo do mês atual
  ai_input_tokens: number
  ai_output_tokens: number
  ai_cost_usd: number
  whisper_seconds: number
  whisper_cost_usd: number
  whatsapp_messages: number
  total_cost_usd: number
}

export interface ServiceStatus {
  name: string
  description: string
  status: "ok" | "warn" | "unknown"
  detail: string
  url: string
}

export interface InfraData {
  services: ServiceStatus[]
  whatsappConnections: { workspaceId: string; workspaceName: string; connected: boolean; phone: string }[]
  webhookErrors: number
  totalMessages30d: number
}

export interface AdminDashboardData {
  workspaces: WorkspaceSummary[]
  totals: {
    workspaces: number
    leads: number
    messages: number
    mrr_usd: number
    total_cost_usd: number
  }
  growth: { month: string; count: number }[]
  infra: InfraData
}

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  await assertAdmin()
  const supabase = getServiceClient()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // Busca todos os workspaces
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id, name, plan, created_at")
    .order("created_at", { ascending: false })

  const emptyInfra: InfraData = {
    services: [], whatsappConnections: [], webhookErrors: 0, totalMessages30d: 0,
  }
  if (!workspaces || workspaces.length === 0) {
    return { workspaces: [], totals: { workspaces: 0, leads: 0, messages: 0, mrr_usd: 0, total_cost_usd: 0 }, growth: [], infra: emptyInfra }
  }

  const wsIds = workspaces.map((w) => w.id)

  // Busca contagens em paralelo
  const [
    membersResult,
    leadsResult,
    dealsResult,
    messagesResult,
    conversationsResult,
    usageResult,
  ] = await Promise.all([
    supabase.from("workspace_members").select("workspace_id").in("workspace_id", wsIds),
    supabase.from("leads").select("workspace_id").in("workspace_id", wsIds),
    supabase.from("deals").select("workspace_id").in("workspace_id", wsIds),
    supabase.from("messages").select("workspace_id, direction").in("workspace_id", wsIds),
    supabase.from("conversations").select("workspace_id").in("workspace_id", wsIds),
    supabase.from("usage_logs")
      .select("workspace_id, event_type, input_tokens, output_tokens, audio_seconds, cost_usd, message_direction")
      .in("workspace_id", wsIds)
      .gte("created_at", monthStart),
  ])

  // Agrega por workspace
  const countBy = (rows: { workspace_id: string }[] | null) => {
    const map: Record<string, number> = {}
    for (const r of rows ?? []) map[r.workspace_id] = (map[r.workspace_id] ?? 0) + 1
    return map
  }

  const memberCounts = countBy(membersResult.data as { workspace_id: string }[] | null)
  const leadCounts = countBy(leadsResult.data as { workspace_id: string }[] | null)
  const dealCounts = countBy(dealsResult.data as { workspace_id: string }[] | null)
  const messageCounts = countBy(messagesResult.data as { workspace_id: string }[] | null)
  const convCounts = countBy(conversationsResult.data as { workspace_id: string }[] | null)

  // Agrega uso do mês por workspace
  const usageByWs: Record<string, {
    ai_input_tokens: number; ai_output_tokens: number; ai_cost_usd: number
    whisper_seconds: number; whisper_cost_usd: number; whatsapp_messages: number
  }> = {}

  for (const row of usageResult.data ?? []) {
    if (!usageByWs[row.workspace_id]) {
      usageByWs[row.workspace_id] = { ai_input_tokens: 0, ai_output_tokens: 0, ai_cost_usd: 0, whisper_seconds: 0, whisper_cost_usd: 0, whatsapp_messages: 0 }
    }
    const u = usageByWs[row.workspace_id]
    if (row.event_type === "ai_tokens") {
      u.ai_input_tokens += row.input_tokens ?? 0
      u.ai_output_tokens += row.output_tokens ?? 0
      u.ai_cost_usd += Number(row.cost_usd ?? 0)
    } else if (row.event_type === "whisper_minutes") {
      u.whisper_seconds += row.audio_seconds ?? 0
      u.whisper_cost_usd += Number(row.cost_usd ?? 0)
    } else if (row.event_type === "whatsapp_message") {
      u.whatsapp_messages += 1
    }
  }

  // MRR por plano (valores em USD aproximados)
  const PLAN_MRR_USD: Record<string, number> = { free: 0, starter: 9, pro: 27, scale: 55 }

  const summaries: WorkspaceSummary[] = workspaces.map((w) => {
    const u = usageByWs[w.id] ?? { ai_input_tokens: 0, ai_output_tokens: 0, ai_cost_usd: 0, whisper_seconds: 0, whisper_cost_usd: 0, whatsapp_messages: 0 }
    return {
      id: w.id,
      name: w.name,
      plan: w.plan,
      created_at: w.created_at,
      members_count: memberCounts[w.id] ?? 0,
      leads_count: leadCounts[w.id] ?? 0,
      deals_count: dealCounts[w.id] ?? 0,
      messages_count: messageCounts[w.id] ?? 0,
      conversations_count: convCounts[w.id] ?? 0,
      ...u,
      total_cost_usd: u.ai_cost_usd + u.whisper_cost_usd,
    }
  })

  // Crescimento mensal de workspaces (últimos 6 meses)
  const growthMap: Record<string, number> = {}
  for (const w of workspaces) {
    const m = w.created_at.slice(0, 7) // YYYY-MM
    growthMap[m] = (growthMap[m] ?? 0) + 1
  }
  const growth = Object.entries(growthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, count]) => ({ month, count: count as number }))

  const totalCostUsd = summaries.reduce((s, w) => s + w.total_cost_usd, 0)
  const mrrUsd = summaries.reduce((s, w) => s + (PLAN_MRR_USD[w.plan] ?? 0), 0)

  // Infraestrutura — conexões WhatsApp ativas
  const { data: conversations } = await supabase
    .from("conversations")
    .select("workspace_id, phone_number_id, phone_number")
    .not("phone_number_id", "is", null)

  const wsConnMap: Record<string, { phone: string; connected: boolean }> = {}
  for (const c of conversations ?? []) {
    if (!wsConnMap[c.workspace_id]) {
      wsConnMap[c.workspace_id] = { phone: c.phone_number, connected: true }
    }
  }

  const whatsappConnections = workspaces.map((w) => ({
    workspaceId: w.id,
    workspaceName: w.name,
    connected: !!wsConnMap[w.id],
    phone: wsConnMap[w.id]?.phone ?? "—",
  }))

  // Mensagens últimos 30 dias
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { count: messages30d } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .in("workspace_id", wsIds)
    .gte("created_at", thirtyDaysAgo)

  const connectedCount = whatsappConnections.filter((w) => w.connected).length

  const infra: InfraData = {
    services: [
      {
        name: "Vercel",
        description: "Frontend + API Routes",
        status: "ok",
        detail: "engenharia.app — Next.js 16",
        url: "https://vercel.com/engenhariaia26-1932s-projects/crm-nocode",
      },
      {
        name: "Railway",
        description: "Servidor Baileys (WhatsApp QR)",
        status: connectedCount > 0 ? "ok" : "warn",
        detail: connectedCount > 0 ? `${connectedCount} workspace(s) conectado(s)` : "Nenhum workspace conectado",
        url: "https://railway.app",
      },
      {
        name: "Supabase",
        description: "Banco de dados + Auth + Storage",
        status: "ok",
        detail: `${summaries.length} workspaces · ${leadsResult.data?.length ?? 0} leads`,
        url: "https://supabase.com/dashboard/project/sjaibytzqpxbvkvxwhoh",
      },
      {
        name: "Stripe",
        description: "Pagamentos e assinaturas",
        status: "ok",
        detail: `MRR $${mrrUsd} USD · ${summaries.filter((w) => w.plan !== "free").length} assinatura(s)`,
        url: "https://dashboard.stripe.com",
      },
      {
        name: "Resend",
        description: "Envio de e-mails (convites)",
        status: "ok",
        detail: "Transacional — convites de colaboradores",
        url: "https://resend.com",
      },
      {
        name: "OpenAI Whisper",
        description: "Transcrição de áudios WhatsApp",
        status: process.env.OPENAI_API_KEY ? "ok" : "warn",
        detail: process.env.OPENAI_API_KEY ? "API key configurada" : "OPENAI_API_KEY não configurada",
        url: "https://platform.openai.com",
      },
      {
        name: "Anthropic Claude",
        description: "Agente de qualificação de leads",
        status: process.env.ANTHROPIC_API_KEY ? "ok" : "warn",
        detail: process.env.ANTHROPIC_API_KEY ? "Claude Haiku 4.5 ativo" : "ANTHROPIC_API_KEY não configurada",
        url: "https://console.anthropic.com",
      },
    ],
    whatsappConnections,
    webhookErrors: 0,
    totalMessages30d: messages30d ?? 0,
  }

  return {
    workspaces: summaries,
    totals: {
      workspaces: summaries.length,
      leads: leadsResult.data?.length ?? 0,
      messages: messagesResult.data?.length ?? 0,
      mrr_usd: mrrUsd,
      total_cost_usd: totalCostUsd,
    },
    growth,
    infra,
  }
}
