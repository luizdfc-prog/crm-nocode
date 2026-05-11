"use server"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getServiceClient } from "@/lib/supabase/service"

export interface RailwayStatus {
  reachable: boolean
  connection_state: string | null
  phone: string | null
  uptime_seconds: number | null
  messages_received: number | null
  messages_forwarded: number | null
  forward_errors: number | null
  last_message_at: string | null
  last_error: string | null
  last_error_at: string | null
  reconnect_count: number | null
  latency_ms: number | null
}

export interface AIHealthStatus {
  // Mensagens inbound sem resposta outbound nas últimas N horas
  unanswered_count: number
  // Última mensagem inbound recebida
  last_inbound_at: string | null
  // Última mensagem outbound da IA enviada
  last_outbound_at: string | null
  // Minutos desde a última resposta da IA (null = nunca respondeu)
  minutes_since_last_ai_response: number | null
  // Conversas com ai_active=true que têm mensagens sem resposta há mais de 30min
  stuck_conversations: number
}

export interface HealthData {
  railway: RailwayStatus
  ai: AIHealthStatus
  checked_at: string
}

export async function GET() {
  // Só admin pode acessar
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email?.endsWith("@engenharia.app")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const db = getServiceClient()
  const now = new Date()
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString()
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()

  // ── Railway ping ─────────────────────────────────────────────────────────────
  const railway: RailwayStatus = {
    reachable: false,
    connection_state: null,
    phone: null,
    uptime_seconds: null,
    messages_received: null,
    messages_forwarded: null,
    forward_errors: null,
    last_message_at: null,
    last_error: null,
    last_error_at: null,
    reconnect_count: null,
    latency_ms: null,
  }

  const baileysUrl = process.env.BAILEYS_SERVER_URL?.replace(/\/$/, "")
  const baileysSecret = process.env.BAILEYS_API_SECRET ?? ""

  if (baileysUrl) {
    const pingStart = Date.now()
    try {
      const res = await fetch(`${baileysUrl}/status`, {
        headers: { "x-api-secret": baileysSecret },
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok) {
        const data = await res.json() as Record<string, unknown>
        railway.reachable = true
        railway.latency_ms = Date.now() - pingStart
        railway.connection_state = (data.status as string) ?? null
        railway.phone = (data.phone as string) ?? null
        railway.uptime_seconds = (data.uptime_seconds as number) ?? null
        railway.messages_received = (data.messages_received as number) ?? null
        railway.messages_forwarded = (data.messages_forwarded as number) ?? null
        railway.forward_errors = (data.forward_errors as number) ?? null
        railway.last_message_at = (data.last_message_at as string) ?? null
        railway.last_error = (data.last_error as string) ?? null
        railway.last_error_at = (data.last_error_at as string) ?? null
        railway.reconnect_count = (data.reconnect_count as number) ?? null
      }
    } catch {
      railway.reachable = false
      railway.latency_ms = Date.now() - pingStart
    }
  }

  // ── IA health ────────────────────────────────────────────────────────────────
  const [lastInboundResult, lastOutboundResult, unansweredResult, stuckResult] = await Promise.all([
    db.from("messages")
      .select("created_at")
      .eq("direction", "inbound")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    db.from("messages")
      .select("created_at")
      .eq("direction", "outbound")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    // Mensagens inbound nas últimas 2h que não têm resposta outbound na mesma conversa
    db.from("messages")
      .select("conversation_id")
      .eq("direction", "inbound")
      .gte("created_at", twoHoursAgo),

    // Conversas com ai_active=true e última mensagem inbound há mais de 30min sem resposta
    db.from("conversations")
      .select("id")
      .eq("ai_active", true)
      .eq("needs_reply", true)
      .lte("last_message_at", thirtyMinAgo),
  ])

  const lastInboundAt = lastInboundResult.data?.created_at ?? null
  const lastOutboundAt = lastOutboundResult.data?.created_at ?? null

  const minutesSinceLastAiResponse = lastOutboundAt
    ? Math.floor((now.getTime() - new Date(lastOutboundAt).getTime()) / 60000)
    : null

  // Conta conversas únicas com mensagens inbound recentes
  const recentInboundConvIds = new Set(
    (unansweredResult.data ?? []).map((m) => m.conversation_id)
  )

  const ai: AIHealthStatus = {
    unanswered_count: recentInboundConvIds.size,
    last_inbound_at: lastInboundAt,
    last_outbound_at: lastOutboundAt,
    minutes_since_last_ai_response: minutesSinceLastAiResponse,
    stuck_conversations: stuckResult.data?.length ?? 0,
  }

  return NextResponse.json({ railway, ai, checked_at: now.toISOString() } satisfies HealthData)
}
