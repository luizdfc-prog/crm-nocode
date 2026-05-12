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
  // Capacidade — presente quando conseguimos medir automaticamente
  usage?: {
    label: string       // ex: "Usuários Auth"
    current: number
    limit: number
    unit: string        // ex: "usuários", "R$", "GB"
    warnAt: number      // percentual (0-100) que dispara alerta amarelo
  }
}

export interface InfraData {
  services: ServiceStatus[]
  whatsappConnections: { workspaceId: string; workspaceName: string; connected: boolean; phone: string }[]
  webhookErrors: number
  totalMessages30d: number
}

export interface OrphanUser {
  id: string
  email: string
  created_at: string
  email_confirmed: boolean
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
  orphanUsers: OrphanUser[]
}

export interface AnthropicUsage {
  manual_balance_usd: number | null  // saldo inserido manualmente pelo admin
  manual_balance_updated_at: string | null
  used_usd: number                   // gasto total desde a última recarga (all-time desde o update)
  used_usd_period: number            // gasto no período filtrado
  input_tokens: number
  output_tokens: number
  total_tokens: number
  requests: number
  // Tokens disponíveis estimados com base no saldo manual
  // Gemini 2.0 Flash: input $0.075/M, output $0.30/M — usamos média ponderada
  tokens_limit_estimate: number | null
  tokens_used_since_recharge: number
}

// Preço médio ponderado por token do Gemini 2.0 Flash (estimativa: 80% input, 20% output)
const HAIKU_AVG_COST_PER_TOKEN = (0.075 * 0.8 + 0.30 * 0.2) / 1_000_000 // ~$0.000000120

export async function saveManualBalance(balance_usd: number): Promise<{ error?: string }> {
  await assertAdmin()
  const supabase = getServiceClient()

  // Pega o primeiro workspace disponível para usar como âncora do registro
  const { data: ws } = await supabase.from("workspaces").select("id").limit(1).single()
  if (!ws) return { error: "Nenhum workspace encontrado" }

  const { error } = await supabase.from("usage_logs").insert({
    workspace_id: ws.id,
    event_type: "manual_balance_usd",
    cost_usd: balance_usd,
    input_tokens: 0,
    output_tokens: 0,
  })

  return error ? { error: error.message } : {}
}

export async function getAnthropicUsage(from: string, to: string): Promise<AnthropicUsage> {
  await assertAdmin()
  const supabase = getServiceClient()

  // Busca o último saldo inserido manualmente
  const { data: balanceRow } = await supabase
    .from("usage_logs")
    .select("cost_usd, created_at")
    .eq("event_type", "manual_balance_usd")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const manual_balance_usd = balanceRow ? Number(balanceRow.cost_usd) : null
  const manual_balance_updated_at = balanceRow?.created_at ?? null

  // Tokens consumidos DESDE a última recarga (para calcular quanto do saldo foi usado)
  const rechargeDate = manual_balance_updated_at ?? "2000-01-01T00:00:00Z"
  const { data: sinceRecharge } = await supabase
    .from("usage_logs")
    .select("input_tokens, output_tokens, cost_usd")
    .eq("event_type", "ai_tokens")
    .gte("created_at", rechargeDate)

  let tokens_used_since_recharge = 0
  let used_usd = 0
  for (const r of sinceRecharge ?? []) {
    tokens_used_since_recharge += (r.input_tokens ?? 0) + (r.output_tokens ?? 0)
    used_usd += Number(r.cost_usd ?? 0)
  }

  // Agrega uso do período filtrado
  const { data: rows } = await supabase
    .from("usage_logs")
    .select("input_tokens, output_tokens, cost_usd")
    .eq("event_type", "ai_tokens")
    .gte("created_at", from)
    .lte("created_at", to)

  let used_usd_period = 0, input_tokens = 0, output_tokens = 0, requests = 0
  for (const r of rows ?? []) {
    used_usd_period += Number(r.cost_usd ?? 0)
    input_tokens += r.input_tokens ?? 0
    output_tokens += r.output_tokens ?? 0
    requests++
  }

  const tokens_limit_estimate = manual_balance_usd != null
    ? Math.floor(manual_balance_usd / HAIKU_AVG_COST_PER_TOKEN)
    : null

  return {
    manual_balance_usd,
    manual_balance_updated_at,
    used_usd,
    used_usd_period,
    input_tokens,
    output_tokens,
    total_tokens: input_tokens + output_tokens,
    requests,
    tokens_limit_estimate,
    tokens_used_since_recharge,
  }
}

export async function getAdminDashboard(from?: string, to?: string): Promise<AdminDashboardData> {
  await assertAdmin()
  const supabase = getServiceClient()

  const now = new Date()
  const monthStart = from ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthEnd = to ?? now.toISOString()

  // Busca todos os workspaces
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id, name, plan, created_at")
    .order("created_at", { ascending: false })

  const emptyInfra: InfraData = {
    services: [], whatsappConnections: [], webhookErrors: 0, totalMessages30d: 0,
  }
  if (!workspaces || workspaces.length === 0) {
    return { workspaces: [], totals: { workspaces: 0, leads: 0, messages: 0, mrr_usd: 0, total_cost_usd: 0 }, growth: [], infra: emptyInfra, orphanUsers: [] }
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
      .gte("created_at", monthStart)
      .lte("created_at", monthEnd),
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

  // Infraestrutura — status real do WhatsApp via Railway /status
  const baileysUrl = process.env.BAILEYS_SERVER_URL?.replace(/\/$/, "")
  const baileysSecret = process.env.BAILEYS_API_SECRET ?? ""

  let railwayPhone: string | null = null
  let railwayConnected = false

  if (baileysUrl) {
    try {
      const res = await fetch(`${baileysUrl}/status`, {
        headers: { "x-api-secret": baileysSecret },
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      })
      if (res.ok) {
        const data = await res.json() as Record<string, unknown>
        railwayConnected = (data.status as string) === "connected"
        railwayPhone = (data.phone as string) ?? null
      }
    } catch { /* Railway inacessível */ }
  }

  const whatsappConnections = workspaces.map((w) => ({
    workspaceId: w.id,
    workspaceName: w.name,
    connected: railwayConnected,
    phone: railwayPhone ?? "—",
  }))

  // Mensagens últimos 30 dias
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { count: messages30d } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .in("workspace_id", wsIds)
    .gte("created_at", thirtyDaysAgo)

  const connectedCount = railwayConnected ? 1 : 0

  // Total de usuários auth (para limite Supabase Free: 50.000)
  const { count: authUsersCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })

  // Custo IA acumulado no mês (USD → BRL a 5.7)
  const aiCostBrl = totalCostUsd * 5.7
  const AI_LIMIT_BRL = process.env.AI_COST_ALERT_BRL
    ? Number(process.env.AI_COST_ALERT_BRL)
    : 200

  // Total de leads (para limite Supabase Free como proxy de linhas)
  const totalLeads = leadsResult.data?.length ?? 0
  const totalMessages = messagesResult.data?.length ?? 0
  const totalRows = totalLeads + totalMessages + summaries.length
  // Supabase Free: 500MB banco — estimativa: ~2KB por linha média → 250.000 linhas ≈ 500MB
  const SUPABASE_ROW_LIMIT = 250000

  // Railway Hobby: $5/mês de crédito — estimamos pelo nº de mensagens processadas
  // Cada mensagem usa ~50ms CPU + memória; muito difícil medir sem API. Mostramos mensagens como proxy.
  const RAILWAY_MSG_LIMIT = 10000 // volume a partir do qual vale monitorar

  const infra: InfraData = {
    services: [
      {
        name: "Vercel",
        description: "Frontend + API Routes · Hobby",
        status: "ok",
        detail: "engenharia.app — Next.js 16 · Ver bandwidth e builds no painel",
        url: "https://vercel.com/engenhariaia26-1932s-projects/crm-nocode",
      },
      {
        name: "Railway",
        description: "Servidor Baileys (WhatsApp QR) · Hobby $5/mês",
        status: railwayConnected ? "ok" : "warn",
        detail: railwayConnected
          ? `WhatsApp conectado · ${railwayPhone ?? "número não disponível"}`
          : baileysUrl ? "Servidor online · nenhum número WhatsApp pareado via QR" : "BAILEYS_SERVER_URL não configurado",
        url: "https://railway.app",
        usage: {
          label: "Mensagens processadas (30d)",
          current: messages30d ?? 0,
          limit: RAILWAY_MSG_LIMIT,
          unit: "msgs",
          warnAt: 70,
        },
      },
      {
        name: "Supabase",
        description: "Banco de dados + Auth + Storage · Free",
        status: (authUsersCount ?? 0) > 45000 ? "warn" : "ok",
        detail: `${authUsersCount ?? 0} usuários · ${totalRows.toLocaleString()} linhas estimadas`,
        url: "https://supabase.com/dashboard/project/sjaibytzqpxbvkvxwhoh",
        usage: {
          label: "Usuários Auth",
          current: authUsersCount ?? 0,
          limit: 50000,
          unit: "usuários",
          warnAt: 80,
        },
      },
      {
        name: "Stripe",
        description: "Pagamentos e assinaturas · sem limite fixo",
        status: "ok",
        detail: `MRR $${mrrUsd} USD · ${summaries.filter((w) => w.plan !== "free").length} assinatura(s) ativa(s)`,
        url: "https://dashboard.stripe.com",
      },
      {
        name: "Resend",
        description: "Envio de e-mails · Free (3.000/mês)",
        status: "ok",
        detail: "Convites de colaboradores — ver volume no painel Resend",
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
        name: "Google Gemini",
        description: "Agente de qualificação de leads · Gemini 2.0 Flash",
        status: process.env.GOOGLE_API_KEY ? (aiCostBrl >= AI_LIMIT_BRL * 0.8 ? "warn" : "ok") : "warn",
        detail: process.env.GOOGLE_API_KEY
          ? `Custo IA este mês: R$${aiCostBrl.toFixed(2)}`
          : "GOOGLE_API_KEY não configurada",
        url: "https://aistudio.google.com",
        usage: process.env.GOOGLE_API_KEY ? {
          label: "Custo IA total (mês)",
          current: Math.round(aiCostBrl * 100) / 100,
          limit: AI_LIMIT_BRL,
          unit: "R$",
          warnAt: 80,
        } : undefined,
      },
    ],
    whatsappConnections,
    webhookErrors: 0,
    totalMessages30d: messages30d ?? 0,
  }

  // Usuários órfãos — existem no Auth mas não têm workspace vinculado
  let orphanUsers: OrphanUser[] = []
  try {
    const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    const { data: members } = await supabase.from("workspace_members").select("profile_id")
    const profileIds = new Set((members ?? []).map((m: { profile_id: string }) => m.profile_id))
    orphanUsers = (authUsers?.users ?? [])
      .filter(u => !profileIds.has(u.id))
      .map(u => ({
        id: u.id,
        email: u.email ?? "—",
        created_at: u.created_at,
        email_confirmed: !!u.email_confirmed_at,
      }))
  } catch {
    // Não bloqueia o dashboard se falhar
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
    orphanUsers,
  }
}

export async function deleteOrphanUser(userId: string): Promise<{ error?: string }> {
  await assertAdmin()
  const supabase = getServiceClient()
  const { error } = await supabase.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }
  return {}
}

export async function deleteAllOrphanUsers(userIds: string[]): Promise<{ deleted: number; errors: number }> {
  await assertAdmin()
  const supabase = getServiceClient()
  let deleted = 0
  let errors = 0
  for (const id of userIds) {
    const { error } = await supabase.auth.admin.deleteUser(id)
    if (error) errors++
    else deleted++
  }
  return { deleted, errors }
}
