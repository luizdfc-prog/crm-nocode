"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  RefreshCw, Wifi, WifiOff, AlertTriangle, CheckCircle,
  Clock, Activity, MessageSquare, RotateCcw, Zap, Bell, BellOff,
} from "lucide-react"
import type { HealthData } from "@/app/api/admin/health/route"
import type { AlertPayload } from "@/app/api/admin/health/alert/route"

const REFRESH_INTERVAL_MS = 60_000 // 1 min

function ago(isoDate: string | null): string {
  if (!isoDate) return "nunca"
  const diff = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000)
  if (diff < 60) return `${diff}s atrás`
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`
  return `${Math.floor(diff / 3600)}h atrás`
}

function fmtUptime(seconds: number | null): string {
  if (seconds === null) return "—"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}min`
  return `${m}min`
}

function Chip({ label, ok, warn }: { label: string; ok?: boolean; warn?: boolean }) {
  const color = ok ? "#2ED573" : warn ? "#FF6B35" : "#FF4757"
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}33` }}>
      {label}
    </span>
  )
}

function MetricRow({ label, value, sub, alert }: { label: string; value: string; sub?: string; alert?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: "#1A1A1E" }}>
      <div>
        <p className="text-xs" style={{ color: "#8A8A8F" }}>{label}</p>
        {sub && <p className="text-[10px] mt-0.5" style={{ color: "#555559" }}>{sub}</p>}
      </div>
      <p className="text-sm font-mono" style={{ color: alert ? "#FF6B35" : "#E8E8E8" }}>{value}</p>
    </div>
  )
}

export function MonitorPanel() {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [alertsEnabled, setAlertsEnabled] = useState(true)
  const [sendingAlert, setSendingAlert] = useState(false)
  const [alertSent, setAlertSent] = useState<string | null>(null)
  const prevDataRef = useRef<HealthData | null>(null)

  const sendAlert = useCallback(async (type: AlertPayload["type"], detail: string) => {
    if (!alertsEnabled || sendingAlert) return
    setSendingAlert(true)
    try {
      await fetch("/api/admin/health/alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, detail }),
      })
      setAlertSent(type)
      setTimeout(() => setAlertSent(null), 5000)
    } catch { /* ignora */ }
    setSendingAlert(false)
  }, [alertsEnabled, sendingAlert])

  const fetchHealth = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/health")
      if (!res.ok) return
      const json = await res.json() as HealthData
      setData(json)
      setLastRefresh(new Date())

      // Detecta problemas e dispara alertas automaticamente
      const prev = prevDataRef.current
      // Railway caiu
      if (!json.railway.reachable && (prev?.railway.reachable !== false)) {
        await sendAlert("railway_down",
          `Railway inacessível em ${new Date(json.checked_at).toLocaleString("pt-BR")}\nURL: ${process.env.NEXT_PUBLIC_APP_URL ?? "—"}`)
      }
      // Erros de encaminhamento aumentando
      const fwdErrors = json.railway.forward_errors ?? 0
      const prevFwdErrors = prev?.railway.forward_errors ?? 0
      if (fwdErrors > prevFwdErrors + 3) {
        await sendAlert("forward_errors",
          `${fwdErrors} erros de encaminhamento (${fwdErrors - prevFwdErrors} novos)\nÚltimo erro: ${json.railway.last_error ?? "—"}`)
      }
      // IA silenciosa: conversas travadas > 0
      if (json.ai.stuck_conversations > 0 && (prev?.ai.stuck_conversations === 0 || prev === null)) {
        await sendAlert("ai_silent",
          `${json.ai.stuck_conversations} conversa(s) com ai_active=true aguardando resposta há mais de 30min\nÚltima resposta da IA: ${ago(json.ai.last_outbound_at)}`)
      }

      prevDataRef.current = json
    } catch { /* ignora */ }
    setLoading(false)
  }, [sendAlert])

  useEffect(() => {
    fetchHealth()
    const interval = setInterval(fetchHealth, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchHealth])

  const railwayOk = data?.railway.reachable && data.railway.connection_state === "connected"
  const railwayWarn = data?.railway.reachable && data.railway.connection_state !== "connected"
  const railwayDown = data && !data.railway.reachable

  const aiOk = (data?.ai.stuck_conversations ?? 0) === 0
  const aiWarn = (data?.ai.stuck_conversations ?? 0) > 0

  const fwdErrors = data?.railway.forward_errors ?? 0
  const reconnects = data?.railway.reconnect_count ?? 0

  return (
    <div className="flex flex-col gap-4">
      {/* Header do painel */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold" style={{ color: "#E8E8E8" }}>Monitor em tempo real</p>
          <p className="text-xs mt-0.5" style={{ color: "#555559" }}>
            {lastRefresh
              ? `Atualizado ${ago(lastRefresh.toISOString())} · auto a cada 1min`
              : "Carregando..."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {alertSent && (
            <span className="text-[10px] rounded-full px-2 py-0.5 font-medium"
              style={{ backgroundColor: "rgba(46,213,115,0.15)", color: "#2ED573", border: "1px solid rgba(46,213,115,0.3)" }}>
              E-mail enviado
            </span>
          )}
          <button
            onClick={() => setAlertsEnabled((v) => !v)}
            title={alertsEnabled ? "Desativar alertas por e-mail" : "Ativar alertas por e-mail"}
            className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors"
            style={{ borderColor: alertsEnabled ? "rgba(202,255,51,0.3)" : "#2A2A2E", color: alertsEnabled ? "#CAFF33" : "#555559" }}
          >
            {alertsEnabled ? <Bell className="size-3" /> : <BellOff className="size-3" />}
            {alertsEnabled ? "Alertas ativos" : "Alertas off"}
          </button>
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors hover:border-[#CAFF33]/30"
            style={{ borderColor: "#2A2A2E", color: "#8A8A8F" }}
          >
            <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Cards de status */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

        {/* Railway */}
        <div className="rounded-xl border p-4 flex flex-col gap-3" style={{
          borderColor: railwayDown ? "rgba(255,71,87,0.3)" : railwayWarn ? "rgba(255,107,53,0.3)" : "rgba(46,213,115,0.2)",
          backgroundColor: railwayDown ? "rgba(255,71,87,0.04)" : railwayWarn ? "rgba(255,107,53,0.04)" : "rgba(46,213,115,0.03)",
        }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {railwayDown ? <WifiOff className="size-4" style={{ color: "#FF4757" }} />
                : railwayWarn ? <AlertTriangle className="size-4" style={{ color: "#FF6B35" }} />
                  : <Wifi className="size-4" style={{ color: "#2ED573" }} />}
              <p className="text-sm font-semibold" style={{ color: "#E8E8E8" }}>Railway — Baileys</p>
            </div>
            {loading ? (
              <span className="text-[10px]" style={{ color: "#555559" }}>verificando…</span>
            ) : (
              <Chip
                label={railwayDown ? "Offline" : data?.railway.connection_state ?? "—"}
                ok={railwayOk ?? false}
                warn={railwayWarn ?? false}
              />
            )}
          </div>

          {data && (
            <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "#0C0C0E" }}>
              <MetricRow label="Latência" value={data.railway.latency_ms !== null ? `${data.railway.latency_ms}ms` : "—"} alert={(data.railway.latency_ms ?? 0) > 2000} />
              <MetricRow label="Uptime" value={fmtUptime(data.railway.uptime_seconds)} />
              <MetricRow label="Msgs recebidas" value={String(data.railway.messages_received ?? "—")} sub="desde o último deploy" />
              <MetricRow label="Msgs encaminhadas" value={String(data.railway.messages_forwarded ?? "—")} />
              <MetricRow label="Erros de envio" value={String(fwdErrors)} alert={fwdErrors > 0} />
              <MetricRow label="Reconexões" value={String(reconnects)} alert={reconnects > 5} sub={reconnects > 5 ? "sessão instável" : undefined} />
              <MetricRow label="Última mensagem" value={ago(data.railway.last_message_at)} />
            </div>
          )}

          {data?.railway.last_error && (
            <div className="rounded-lg px-3 py-2 text-[10px] font-mono break-all" style={{ backgroundColor: "rgba(255,71,87,0.08)", color: "#FF4757", border: "1px solid rgba(255,71,87,0.2)" }}>
              <p style={{ color: "#FF6B35", marginBottom: 2 }}>Último erro · {ago(data.railway.last_error_at)}</p>
              {data.railway.last_error}
            </div>
          )}

          <div className="flex gap-2">
            <a href="https://railway.app" target="_blank" rel="noopener noreferrer"
              className="flex-1 text-center rounded-lg border py-1.5 text-[10px] transition-colors hover:border-[#CAFF33]/30"
              style={{ borderColor: "#2A2A2E", color: "#555559" }}>
              Ver Railway →
            </a>
            {railwayDown && (
              <button
                onClick={() => sendAlert("railway_down", `Railway inacessível. Latência: ${data?.railway.latency_ms}ms`)}
                disabled={sendingAlert}
                className="flex-1 rounded-lg border py-1.5 text-[10px] transition-colors"
                style={{ borderColor: "rgba(255,71,87,0.3)", color: "#FF4757" }}>
                {sendingAlert ? "Enviando…" : "Alertar por e-mail"}
              </button>
            )}
          </div>
        </div>

        {/* Agente IA */}
        <div className="rounded-xl border p-4 flex flex-col gap-3" style={{
          borderColor: aiWarn ? "rgba(255,107,53,0.3)" : "rgba(46,213,115,0.2)",
          backgroundColor: aiWarn ? "rgba(255,107,53,0.04)" : "rgba(46,213,115,0.03)",
        }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {aiWarn
                ? <AlertTriangle className="size-4" style={{ color: "#FF6B35" }} />
                : <CheckCircle className="size-4" style={{ color: "#2ED573" }} />}
              <p className="text-sm font-semibold" style={{ color: "#E8E8E8" }}>Agente IA</p>
            </div>
            {loading ? (
              <span className="text-[10px]" style={{ color: "#555559" }}>verificando…</span>
            ) : (
              <Chip label={aiWarn ? "Atenção" : "Operacional"} ok={aiOk} warn={false} />
            )}
          </div>

          {data && (
            <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "#0C0C0E" }}>
              <MetricRow
                label="Conversas travadas"
                value={String(data.ai.stuck_conversations)}
                sub="ai_active=true + sem resposta há 30min+"
                alert={data.ai.stuck_conversations > 0}
              />
              <MetricRow
                label="Último recebido"
                value={ago(data.ai.last_inbound_at)}
              />
              <MetricRow
                label="Última resposta IA"
                value={ago(data.ai.last_outbound_at)}
                alert={(data.ai.minutes_since_last_ai_response ?? 0) > 30}
              />
              <MetricRow
                label="Minutos sem resposta"
                value={data.ai.minutes_since_last_ai_response !== null
                  ? `${data.ai.minutes_since_last_ai_response}min`
                  : "—"}
                alert={(data.ai.minutes_since_last_ai_response ?? 0) > 30}
              />
            </div>
          )}

          {aiWarn && data && (
            <div className="rounded-lg px-3 py-2 text-[10px]" style={{ backgroundColor: "rgba(255,107,53,0.08)", color: "#FF6B35", border: "1px solid rgba(255,107,53,0.2)" }}>
              {data.ai.stuck_conversations} conversa(s) com IA ativa aguardando resposta há mais de 30 minutos.
              Verifique os logs da Vercel e o status do Railway.
            </div>
          )}

          <div className="flex gap-2">
            <a href="https://vercel.com/engenhariaia26-1932s-projects/crm-nocode" target="_blank" rel="noopener noreferrer"
              className="flex-1 text-center rounded-lg border py-1.5 text-[10px] transition-colors hover:border-[#CAFF33]/30"
              style={{ borderColor: "#2A2A2E", color: "#555559" }}>
              Logs Vercel →
            </a>
            {aiWarn && (
              <button
                onClick={() => sendAlert("ai_silent",
                  `${data?.ai.stuck_conversations ?? 0} conversa(s) travada(s)\nÚltima resposta: ${ago(data?.ai.last_outbound_at ?? null)}`)}
                disabled={sendingAlert}
                className="flex-1 rounded-lg border py-1.5 text-[10px] transition-colors"
                style={{ borderColor: "rgba(255,107,53,0.3)", color: "#FF6B35" }}>
                {sendingAlert ? "Enviando…" : "Alertar por e-mail"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Linha do tempo de eventos recentes */}
      {data && (data.railway.last_error || data.ai.stuck_conversations > 0 || reconnects > 2) && (
        <div className="rounded-xl border p-4" style={{ borderColor: "#2A2A2E", backgroundColor: "#141416" }}>
          <p className="text-xs font-semibold mb-3" style={{ color: "#E8E8E8" }}>Eventos de atenção</p>
          <div className="flex flex-col gap-2">
            {data.railway.last_error && (
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="size-3.5 mt-0.5 shrink-0" style={{ color: "#FF4757" }} />
                <div>
                  <p className="text-xs" style={{ color: "#E8E8E8" }}>Erro no Baileys</p>
                  <p className="text-[10px] font-mono mt-0.5" style={{ color: "#FF4757" }}>{data.railway.last_error}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#555559" }}>{ago(data.railway.last_error_at)}</p>
                </div>
              </div>
            )}
            {reconnects > 2 && (
              <div className="flex items-start gap-2.5">
                <RotateCcw className="size-3.5 mt-0.5 shrink-0" style={{ color: "#FF6B35" }} />
                <div>
                  <p className="text-xs" style={{ color: "#E8E8E8" }}>{reconnects} reconexões desde o deploy</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#555559" }}>Pode indicar instabilidade da sessão WhatsApp ou MessageCounterError frequente</p>
                </div>
              </div>
            )}
            {data.ai.stuck_conversations > 0 && (
              <div className="flex items-start gap-2.5">
                <MessageSquare className="size-3.5 mt-0.5 shrink-0" style={{ color: "#FF6B35" }} />
                <div>
                  <p className="text-xs" style={{ color: "#E8E8E8" }}>{data.ai.stuck_conversations} conversa(s) sem resposta da IA</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#555559" }}>Última resposta da IA: {ago(data.ai.last_outbound_at)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legenda de checks */}
      <div className="flex flex-wrap items-center gap-4 pt-1">
        {[
          { icon: Zap, label: "Ping Railway a cada 1min", color: "#555559" },
          { icon: Activity, label: "IA silenciosa detectada automaticamente", color: "#555559" },
          { icon: Clock, label: "Alertas por e-mail quando Railway cai ou IA trava", color: "#555559" },
        ].map(({ icon: Icon, label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <Icon className="size-3" style={{ color }} />
            <p className="text-[10px]" style={{ color }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
