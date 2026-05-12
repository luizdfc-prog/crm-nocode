"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Users, MessageSquare, DollarSign, TrendingUp,
  ChevronDown, ChevronUp, LogOut, ExternalLink,
  CheckCircle, AlertTriangle, HelpCircle, Wifi, WifiOff,
  BarChart2, Server, BookOpen, Trash2, Calendar, Zap, Hash, ArrowDownUp,
} from "lucide-react"
import { KnowledgeBaseTab } from "./KnowledgeBaseTab"
import { MonitorPanel } from "./MonitorPanel"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import type { AdminDashboardData, WorkspaceSummary, ServiceStatus, OrphanUser, AnthropicUsage } from "@/actions/admin"
import { deleteOrphanUser, deleteAllOrphanUsers, getAnthropicUsage, saveManualBalance } from "@/actions/admin"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

const PLAN_COLORS: Record<string, string> = {
  free: "#555559",
  starter: "#5B7FFF",
  pro: "#CAFF33",
  scale: "#FF6B35",
}

const PLAN_LABELS: Record<string, string> = {
  free: "Free", starter: "Starter", pro: "Pro", scale: "Scale",
}

function fmt(n: number, decimals = 0) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function fmtUsd(n: number) { return `$${n.toFixed(4)}` }
function fmtBrl(usd: number) { return `R$${(usd * 5.7).toFixed(2)}` }

function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub?: string; icon: React.ElementType; accent?: boolean
}) {
  return (
    <div className="rounded-xl border p-5 flex flex-col gap-3" style={{
      borderColor: accent ? "rgba(202,255,51,0.3)" : "#2A2A2E",
      backgroundColor: accent ? "rgba(202,255,51,0.05)" : "#141416",
    }}>
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: "#8A8A8F" }}>{label}</p>
        <div className="flex size-7 items-center justify-center rounded-lg border" style={{
          borderColor: accent ? "rgba(202,255,51,0.3)" : "#2A2A2E",
          backgroundColor: "#1A1A1E",
        }}>
          <Icon className="size-3.5" style={{ color: accent ? "#CAFF33" : "#8A8A8F" }} />
        </div>
      </div>
      <p className="text-2xl font-bold font-[Syne]" style={{ color: accent ? "#CAFF33" : "#E8E8E8" }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: "#555559" }}>{sub}</p>}
    </div>
  )
}

function WorkspaceRow({ ws, totalCostBrl, limitBrl }: { ws: WorkspaceSummary; totalCostBrl: number; limitBrl: number }) {
  const [open, setOpen] = useState(false)
  const wsCostBrl = ws.total_cost_usd * 5.7
  const pctOfTotal = totalCostBrl > 0 ? (wsCostBrl / totalCostBrl) * 100 : 0
  const pctOfLimit = limitBrl > 0 ? Math.min((wsCostBrl / limitBrl) * 100, 100) : 0
  const barColor = pctOfLimit >= 95 ? "#FF4757" : pctOfLimit >= 80 ? "#FF6B35" : "#CAFF33"

  return (
    <>
      <tr className="border-b cursor-pointer transition-colors" style={{ borderColor: "#2A2A2E" }} onClick={() => setOpen((v) => !v)}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {open ? <ChevronUp className="size-3.5" style={{ color: "#555559" }} /> : <ChevronDown className="size-3.5" style={{ color: "#555559" }} />}
            <span className="text-sm font-medium" style={{ color: "#E8E8E8" }}>{ws.name}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{
            backgroundColor: `${PLAN_COLORS[ws.plan]}22`,
            color: PLAN_COLORS[ws.plan],
            border: `1px solid ${PLAN_COLORS[ws.plan]}44`,
          }}>
            {PLAN_LABELS[ws.plan] ?? ws.plan}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-center" style={{ color: "#8A8A8F" }}>{ws.members_count}</td>
        <td className="px-4 py-3 text-sm text-center" style={{ color: "#8A8A8F" }}>{ws.leads_count}</td>
        <td className="px-4 py-3 text-sm text-center" style={{ color: "#8A8A8F" }}>{ws.messages_count}</td>
        <td className="px-4 py-3 text-right">
          <div className="flex flex-col gap-1 items-end">
            <span className="text-sm font-mono" style={{ color: ws.total_cost_usd > 1 ? "#FF6B35" : "#8A8A8F" }}>
              R${wsCostBrl.toFixed(2)}
            </span>
            {wsCostBrl > 0 && (
              <div className="flex items-center gap-1.5 w-24">
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "#2A2A2E" }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pctOfLimit}%`, backgroundColor: barColor }} />
                </div>
                <span className="text-[9px] font-mono shrink-0" style={{ color: "#555559" }}>{pctOfTotal.toFixed(0)}%</span>
              </div>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-xs text-right" style={{ color: "#555559" }}>
          {new Date(ws.created_at).toLocaleDateString("pt-BR")}
        </td>
      </tr>
      {open && (
        <tr style={{ backgroundColor: "#0C0C0E" }}>
          <td colSpan={7} className="px-6 py-4">
            {/* Barra de consumo individual */}
            <div className="mb-4 rounded-lg border p-3" style={{ borderColor: "#2A2A2E" }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] uppercase tracking-wide" style={{ color: "#555559" }}>Consumo IA este mês</p>
                <p className="text-[10px] font-mono" style={{ color: barColor }}>
                  R${wsCostBrl.toFixed(2)} de R${limitBrl} · {pctOfLimit.toFixed(1)}% do limite
                </p>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#2A2A2E" }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pctOfLimit}%`, backgroundColor: barColor }} />
              </div>
              <div className="flex justify-between mt-1.5">
                <p className="text-[10px]" style={{ color: "#555559" }}>
                  Representa <span style={{ color: "#8A8A8F" }}>{pctOfTotal.toFixed(1)}%</span> do custo total da plataforma
                </p>
                <p className="text-[10px]" style={{ color: "#555559" }}>
                  Faltam <span style={{ color: "#8A8A8F" }}>R${Math.max(0, limitBrl - wsCostBrl).toFixed(2)}</span> para o limite
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg border p-3" style={{ borderColor: "#2A2A2E" }}>
                <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: "#555559" }}>Tokens Claude (mês)</p>
                <p className="text-sm font-mono" style={{ color: "#E8E8E8" }}>{fmt(ws.ai_input_tokens + ws.ai_output_tokens)}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "#8A8A8F" }}>{fmt(ws.ai_input_tokens)} in · {fmt(ws.ai_output_tokens)} out</p>
                <p className="text-[10px] mt-1 font-mono" style={{ color: "#FF6B35" }}>{fmtUsd(ws.ai_cost_usd)} · {fmtBrl(ws.ai_cost_usd)}</p>
              </div>
              <div className="rounded-lg border p-3" style={{ borderColor: "#2A2A2E" }}>
                <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: "#555559" }}>Áudio Whisper (mês)</p>
                <p className="text-sm font-mono" style={{ color: "#E8E8E8" }}>{fmt(Math.ceil(ws.whisper_seconds / 60))} min</p>
                <p className="text-[10px] mt-1 font-mono" style={{ color: "#FF6B35" }}>{fmtUsd(ws.whisper_cost_usd)} · {fmtBrl(ws.whisper_cost_usd)}</p>
              </div>
              <div className="rounded-lg border p-3" style={{ borderColor: "#2A2A2E" }}>
                <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: "#555559" }}>Mensagens WhatsApp</p>
                <p className="text-sm font-mono" style={{ color: "#E8E8E8" }}>{fmt(ws.whatsapp_messages)}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "#8A8A8F" }}>no mês atual</p>
              </div>
              <div className="rounded-lg border p-3" style={{ borderColor: "#2A2A2E" }}>
                <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: "#555559" }}>Custo total (mês)</p>
                <p className="text-sm font-mono" style={{ color: "#CAFF33" }}>{fmtUsd(ws.total_cost_usd)}</p>
                <p className="text-[10px] mt-0.5 font-mono" style={{ color: "#8A8A8F" }}>{fmtBrl(ws.total_cost_usd)}</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function StatusIcon({ status }: { status: ServiceStatus["status"] }) {
  if (status === "ok") return <CheckCircle className="size-4" style={{ color: "#2ED573" }} />
  if (status === "warn") return <AlertTriangle className="size-4" style={{ color: "#FF6B35" }} />
  return <HelpCircle className="size-4" style={{ color: "#555559" }} />
}

function UsageBar({ usage }: { usage: NonNullable<ServiceStatus["usage"]> }) {
  const pct = Math.min((usage.current / usage.limit) * 100, 100)
  const isWarn = pct >= usage.warnAt
  const isCritical = pct >= 95
  const barColor = isCritical ? "#FF4757" : isWarn ? "#FF6B35" : "#CAFF33"
  const textColor = isCritical ? "#FF4757" : isWarn ? "#FF6B35" : "#8A8A8F"

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px]" style={{ color: "#555559" }}>{usage.label}</p>
        <p className="text-[10px] font-mono" style={{ color: textColor }}>
          {usage.unit === "R$" ? `R$${usage.current.toFixed(2)}` : `${usage.current.toLocaleString("pt-BR")} ${usage.unit}`}
          <span style={{ color: "#2A2A2E" }}> / </span>
          {usage.unit === "R$" ? `R$${usage.limit}` : `${usage.limit.toLocaleString("pt-BR")} ${usage.unit}`}
        </p>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#2A2A2E" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
      <p className="text-[10px]" style={{ color: textColor }}>
        {pct.toFixed(1)}% utilizado
        {isCritical && " — atenção: limite próximo!"}
        {isWarn && !isCritical && " — monitorar"}
      </p>
    </div>
  )
}

function ServiceCard({ service }: { service: ServiceStatus }) {
  const borderColor = service.status === "ok" ? "rgba(46,213,115,0.2)" : service.status === "warn" ? "rgba(255,107,53,0.3)" : "#2A2A2E"
  const bgColor = service.status === "ok" ? "rgba(46,213,115,0.03)" : service.status === "warn" ? "rgba(255,107,53,0.05)" : "#141416"

  return (
    <div className="rounded-xl border p-4 flex flex-col gap-3" style={{ borderColor, backgroundColor: bgColor }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <StatusIcon status={service.status} />
          <p className="text-sm font-semibold" style={{ color: "#E8E8E8" }}>{service.name}</p>
        </div>
        <a
          href={service.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] rounded-md border px-2 py-1 transition-colors hover:border-pf-accent/30"
          style={{ borderColor: "#2A2A2E", color: "#555559" }}
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="size-2.5" />
          Abrir
        </a>
      </div>
      <p className="text-xs" style={{ color: "#8A8A8F" }}>{service.description}</p>
      <p className="text-xs font-mono rounded-md px-2 py-1" style={{ backgroundColor: "#0C0C0E", color: service.status === "warn" ? "#FF6B35" : "#555559" }}>
        {service.detail}
      </p>
      {service.usage && <UsageBar usage={service.usage} />}
    </div>
  )
}

function InfraTab({ data, from, to }: { data: AdminDashboardData; from: string; to: string }) {
  const { infra } = data
  const connectedWs = infra.whatsappConnections.filter((w) => w.connected)
  const disconnectedWs = infra.whatsappConnections.filter((w) => !w.connected)

  return (
    <div className="flex flex-col gap-6">
      {/* Monitoramento em tempo real */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#2A2A2E" }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "#2A2A2E", backgroundColor: "#141416" }}>
          <p className="text-sm font-semibold" style={{ color: "#E8E8E8" }}>Monitoramento Railway + Agente IA</p>
          <p className="text-xs mt-0.5" style={{ color: "#555559" }}>Ping em tempo real · alertas automáticos por e-mail</p>
        </div>
        <div className="p-5" style={{ backgroundColor: "#0C0C0E" }}>
          <MonitorPanel />
        </div>
      </div>

      {/* Cards de resumo infra */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Serviços ativos"
          value={`${infra.services.filter((s) => s.status === "ok").length}/${infra.services.length}`}
          icon={Server}
          sub={infra.services.filter((s) => s.status === "warn").length > 0 ? `${infra.services.filter((s) => s.status === "warn").length} alerta(s)` : "Tudo operacional"}
          accent={infra.services.every((s) => s.status === "ok")}
        />
        <StatCard
          label="WhatsApp conectados"
          value={String(connectedWs.length)}
          icon={Wifi}
          sub={`${disconnectedWs.length} sem conexão`}
        />
        <StatCard
          label="Mensagens (30 dias)"
          value={fmt(infra.totalMessages30d)}
          icon={MessageSquare}
          sub="todas as contas"
        />
        <StatCard
          label="Workspaces monitorados"
          value={String(data.workspaces.length)}
          icon={Users}
          sub={`${data.workspaces.filter((w) => w.plan !== "free").length} pagantes`}
        />
      </div>

      {/* Monitoramento API Google Gemini */}
      <AnthropicPanel from={from} to={to} />

      {/* Grid de serviços */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#2A2A2E" }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "#2A2A2E", backgroundColor: "#141416" }}>
          <p className="text-sm font-semibold" style={{ color: "#E8E8E8" }}>Serviços da plataforma</p>
          <p className="text-xs mt-0.5" style={{ color: "#555559" }}>Status baseado em configuração e dados em tempo real</p>
        </div>
        <div className="p-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" style={{ backgroundColor: "#0C0C0E" }}>
          {infra.services.map((s) => <ServiceCard key={s.name} service={s} />)}
        </div>
      </div>

      {/* WhatsApp por workspace */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#2A2A2E" }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "#2A2A2E", backgroundColor: "#141416" }}>
          <p className="text-sm font-semibold" style={{ color: "#E8E8E8" }}>WhatsApp por workspace</p>
          <p className="text-xs mt-0.5" style={{ color: "#555559" }}>Conversas ativas indicam número conectado</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: "#2A2A2E", backgroundColor: "#141416" }}>
                {["Workspace", "Plano", "Conexão", "Número"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-wide" style={{ color: "#555559" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {infra.whatsappConnections.map((w) => {
                const ws = data.workspaces.find((ws) => ws.id === w.workspaceId)
                return (
                  <tr key={w.workspaceId} className="border-b" style={{ borderColor: "#2A2A2E" }}>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: "#E8E8E8" }}>{w.workspaceName}</td>
                    <td className="px-4 py-3">
                      {ws && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{
                          backgroundColor: `${PLAN_COLORS[ws.plan]}22`,
                          color: PLAN_COLORS[ws.plan],
                          border: `1px solid ${PLAN_COLORS[ws.plan]}44`,
                        }}>
                          {PLAN_LABELS[ws.plan] ?? ws.plan}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {w.connected
                          ? <><Wifi className="size-3.5" style={{ color: "#2ED573" }} /><span className="text-xs" style={{ color: "#2ED573" }}>Conectado</span></>
                          : <><WifiOff className="size-3.5" style={{ color: "#555559" }} /><span className="text-xs" style={{ color: "#555559" }}>Sem conversas</span></>
                        }
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: "#8A8A8F" }}>{w.phone}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function OrphanUsersTable({ users }: { users: OrphanUser[] }) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deletingAll, setDeletingAll] = useState(false)
  const [list, setList] = useState(users)

  async function handleDelete(userId: string) {
    if (!confirm("Excluir este usuário permanentemente?")) return
    setDeleting(userId)
    const { error } = await deleteOrphanUser(userId)
    if (error) {
      alert(`Erro: ${error}`)
    } else {
      setList(l => l.filter(u => u.id !== userId))
    }
    setDeleting(null)
  }

  async function handleDeleteAll() {
    if (!confirm(`Excluir todos os ${list.length} usuários sem workspace permanentemente? Esta ação não pode ser desfeita.`)) return
    setDeletingAll(true)
    const { deleted, errors } = await deleteAllOrphanUsers(list.map(u => u.id))
    if (errors > 0) alert(`${deleted} excluídos, ${errors} com erro.`)
    setList([])
    setDeletingAll(false)
  }

  if (list.length === 0) return (
    <div className="rounded-xl border p-5 flex items-center gap-3" style={{ borderColor: "#2A2A2E", backgroundColor: "#141416" }}>
      <CheckCircle className="size-4 shrink-0" style={{ color: "#2ED573" }} />
      <p className="text-sm" style={{ color: "#8A8A8F" }}>Nenhum usuário órfão — base limpa.</p>
    </div>
  )

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "rgba(255,71,87,0.3)", backgroundColor: "#141416" }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#2A2A2E", backgroundColor: "rgba(255,71,87,0.05)" }}>
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4" style={{ color: "#FF4757" }} />
            <p className="text-sm font-semibold" style={{ color: "#E8E8E8" }}>Usuários sem workspace ({list.length})</p>
          </div>
          <p className="text-xs mt-0.5" style={{ color: "#555559" }}>Criados via convite ou cadastro incompleto — não têm dados no CRM. Podem ser excluídos com segurança.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: "rgba(255,71,87,0.15)", color: "#FF4757", border: "1px solid rgba(255,71,87,0.3)" }}>
            {list.filter(u => !u.email_confirmed).length} não confirmados
          </span>
          <button
            onClick={handleDeleteAll}
            disabled={deletingAll || list.length === 0}
            className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors hover:border-red-500/40 hover:text-red-400 disabled:opacity-50"
            style={{ borderColor: "#2A2A2E", color: "#555559" }}
          >
            <Trash2 className="size-3" />
            {deletingAll ? "Excluindo…" : "Excluir todos"}
          </button>
        </div>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b" style={{ borderColor: "#2A2A2E" }}>
            {["E-mail", "Criado em", "E-mail confirmado", ""].map(h => (
              <th key={h} className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-wide" style={{ color: "#555559" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {list.map(u => (
            <tr key={u.id} className="border-b" style={{ borderColor: "#2A2A2E" }}>
              <td className="px-4 py-3 text-sm font-mono" style={{ color: "#E8E8E8" }}>{u.email}</td>
              <td className="px-4 py-3 text-xs" style={{ color: "#555559" }}>
                {new Date(u.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </td>
              <td className="px-4 py-3">
                {u.email_confirmed
                  ? <span className="text-xs" style={{ color: "#2ED573" }}>✓ Confirmado</span>
                  : <span className="text-xs" style={{ color: "#555559" }}>Pendente</span>
                }
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => handleDelete(u.id)}
                  disabled={deleting === u.id}
                  className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors hover:border-red-500/40 hover:text-red-400 ml-auto"
                  style={{ borderColor: "#2A2A2E", color: "#555559" }}
                >
                  <Trash2 className="size-3" />
                  {deleting === u.id ? "Excluindo…" : "Excluir"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AnthropicPanel({ from, to }: { from: string; to: string }) {
  const [usage, setUsage] = useState<AnthropicUsage | null>(null)
  const [loading, setLoading] = useState(true)
  const [balanceInput, setBalanceInput] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const result = await getAnthropicUsage(from, to)
    setUsage(result)
    if (result.manual_balance_usd != null) {
      setBalanceInput(result.manual_balance_usd.toFixed(2))
    }
    setLoading(false)
  }, [from, to])

  useEffect(() => { load() }, [load])

  async function handleSaveBalance() {
    const val = parseFloat(balanceInput.replace(",", "."))
    if (isNaN(val) || val < 0) return
    setSaving(true)
    await saveManualBalance(val)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    await load()
    setSaving(false)
  }

  const tokensUsed = usage?.tokens_used_since_recharge ?? 0
  const tokensLimit = usage?.tokens_limit_estimate ?? 0
  const pct = tokensLimit > 0 ? Math.min((tokensUsed / tokensLimit) * 100, 100) : 0
  const barColor = pct >= 90 ? "#FF4757" : pct >= 70 ? "#FF6B35" : "#CAFF33"
  const costPeriodBrl = (usage?.used_usd_period ?? 0) * 5.7
  const costSinceRechargeBrl = (usage?.used_usd ?? 0) * 5.7

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#2A2A2E", backgroundColor: "#141416" }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#2A2A2E", backgroundColor: "rgba(202,255,51,0.03)" }}>
        <div className="flex items-center gap-2">
          <Zap className="size-4" style={{ color: "#CAFF33" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "#E8E8E8" }}>Google Gemini (2.0 Flash)</p>
            <p className="text-xs mt-0.5" style={{ color: "#555559" }}>Consumo do agente IA · tokens e saldo</p>
          </div>
        </div>
        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] rounded-md border px-2 py-1 transition-colors hover:border-pf-accent/30"
          style={{ borderColor: "#2A2A2E", color: "#555559" }}>
          <ExternalLink className="size-2.5" />
          Console
        </a>
      </div>
      <div className="p-5">
        {loading ? (
          <div className="flex items-center gap-2 py-4">
            <div className="size-3 rounded-full animate-pulse" style={{ backgroundColor: "#CAFF33" }} />
            <p className="text-xs" style={{ color: "#555559" }}>Carregando...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">

            {/* Saldo manual + barra de tokens */}
            <div className="rounded-lg border p-4 flex flex-col gap-4" style={{ borderColor: "#2A2A2E", backgroundColor: "#0C0C0E" }}>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1.5">
                  <p className="text-[10px] uppercase tracking-wide" style={{ color: "#555559" }}>Saldo atual (USD)</p>
                  <p className="text-[10px]" style={{ color: "#555559" }}>
                    Atualize após cada recarga no Google AI Studio
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-xs font-mono" style={{ color: "#555559" }}>$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={balanceInput}
                    onChange={e => setBalanceInput(e.target.value)}
                    placeholder="ex: 5.06"
                    className="rounded-lg border px-3 py-1.5 text-sm font-mono bg-transparent outline-none w-28 focus:border-[#CAFF33]/50"
                    style={{ borderColor: "#2A2A2E", color: "#E8E8E8", colorScheme: "dark" }}
                  />
                  <button
                    onClick={handleSaveBalance}
                    disabled={saving || !balanceInput}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
                    style={{ backgroundColor: saved ? "#2ED573" : "#CAFF33", color: "#0C0C0E" }}
                  >
                    {saving ? "Salvando…" : saved ? "Salvo!" : "Salvar"}
                  </button>
                </div>
              </div>

              {/* Barra de tokens */}
              {tokensLimit > 0 ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-wide" style={{ color: "#555559" }}>Tokens consumidos desde a última recarga</p>
                    <p className="text-[10px] font-mono" style={{ color: barColor }}>
                      {fmt(tokensUsed)} / ~{fmt(tokensLimit)} · {pct.toFixed(1)}%
                    </p>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: "#2A2A2E" }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px]" style={{ color: "#555559" }}>
                      Gasto desde recarga: <span className="font-mono" style={{ color: "#8A8A8F" }}>R${costSinceRechargeBrl.toFixed(4)} · ${(usage?.used_usd ?? 0).toFixed(6)} USD</span>
                    </p>
                    <p className="text-[10px]" style={{ color: "#555559" }}>
                      Saldo restante estimado: <span className="font-mono" style={{ color: pct >= 90 ? "#FF4757" : "#2ED573" }}>
                        ${Math.max(0, (usage?.manual_balance_usd ?? 0) - (usage?.used_usd ?? 0)).toFixed(4)} USD
                      </span>
                    </p>
                  </div>
                  {pct >= 90 && (
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(255,71,87,0.08)", border: "1px solid rgba(255,71,87,0.3)" }}>
                      <AlertTriangle className="size-3.5 shrink-0" style={{ color: "#FF4757" }} />
                      <p className="text-xs" style={{ color: "#FF4757" }}>Saldo próximo do fim — faça uma recarga no Google AI Studio.</p>
                    </div>
                  )}
                  {pct >= 70 && pct < 90 && (
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(255,107,53,0.08)", border: "1px solid rgba(255,107,53,0.3)" }}>
                      <AlertTriangle className="size-3.5 shrink-0" style={{ color: "#FF6B35" }} />
                      <p className="text-xs" style={{ color: "#FF6B35" }}>70% do saldo consumido — fique de olho.</p>
                    </div>
                  )}
                  {usage?.manual_balance_updated_at && (
                    <p className="text-[10px]" style={{ color: "#555559" }}>
                      Última atualização do saldo: {new Date(usage.manual_balance_updated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs" style={{ color: "#555559" }}>
                  Insira o saldo acima para ver a estimativa de tokens disponíveis.
                </p>
              )}
            </div>

            {/* Métricas do período */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border p-3" style={{ borderColor: "#2A2A2E" }}>
                <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: "#555559" }}>Custo no período</p>
                <p className="text-base font-mono font-bold" style={{ color: "#CAFF33" }}>R${costPeriodBrl.toFixed(4)}</p>
                <p className="text-[10px] mt-0.5 font-mono" style={{ color: "#555559" }}>${(usage?.used_usd_period ?? 0).toFixed(6)} USD</p>
              </div>
              <div className="rounded-lg border p-3" style={{ borderColor: "#2A2A2E" }}>
                <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: "#555559" }}>Requisições</p>
                <p className="text-base font-mono font-bold" style={{ color: "#E8E8E8" }}>{fmt(usage?.requests ?? 0)}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "#555559" }}>chamadas ao modelo</p>
              </div>
              <div className="rounded-lg border p-3" style={{ borderColor: "#2A2A2E" }}>
                <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: "#555559" }}>Tokens entrada</p>
                <p className="text-base font-mono font-bold" style={{ color: "#E8E8E8" }}>{fmt(usage?.input_tokens ?? 0)}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "#555559" }}>$0,075/M tokens</p>
              </div>
              <div className="rounded-lg border p-3" style={{ borderColor: "#2A2A2E" }}>
                <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: "#555559" }}>Tokens saída</p>
                <p className="text-base font-mono font-bold" style={{ color: "#E8E8E8" }}>{fmt(usage?.output_tokens ?? 0)}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "#555559" }}>$0,30/M tokens</p>
              </div>
            </div>

            {(usage?.requests ?? 0) > 0 && (
              <p className="text-[10px]" style={{ color: "#555559" }}>
                Custo médio por requisição:&nbsp;
                <span className="font-mono" style={{ color: "#8A8A8F" }}>
                  R${((usage?.used_usd_period ?? 0) * 5.7 / (usage?.requests ?? 1)).toFixed(5)}
                </span>
                &nbsp;·&nbsp;Total de tokens no período:&nbsp;
                <span className="font-mono" style={{ color: "#8A8A8F" }}>{fmt(usage?.total_tokens ?? 0)}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function BusinessTab({ data, limitBrl }: { data: AdminDashboardData; limitBrl: number }) {
  const mrrBrl = data.totals.mrr_usd * 5.7
  const costBrl = data.totals.total_cost_usd * 5.7
  const margin = mrrBrl > 0 ? ((mrrBrl - costBrl) / mrrBrl * 100) : 0

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Workspaces ativos" value={fmt(data.totals.workspaces)} icon={Users} sub={`${data.workspaces.filter(w => w.plan !== "free").length} pagantes`} />
        <StatCard label="Total de leads" value={fmt(data.totals.leads)} icon={TrendingUp} sub="na plataforma" />
        <StatCard label="MRR estimado" value={`R$${fmt(mrrBrl)}`} icon={DollarSign} accent sub={`$${fmt(data.totals.mrr_usd)} USD`} />
        <StatCard label="Custo IA (período)" value={`R$${fmt(costBrl, 2)}`} icon={MessageSquare} sub={`Margem: ${fmt(margin, 1)}%`} />
      </div>

      {data.growth.length > 0 && (
        <div className="rounded-xl border p-5" style={{ borderColor: "#2A2A2E", backgroundColor: "#141416" }}>
          <p className="text-sm font-semibold mb-1" style={{ color: "#E8E8E8" }}>Novos workspaces por mês</p>
          <p className="text-xs mb-4" style={{ color: "#555559" }}>Últimos 6 meses</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={data.growth} barCategoryGap="30%">
              <XAxis dataKey="month" tick={{ fill: "#555559", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#555559", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#141416", border: "1px solid #2A2A2E", borderRadius: 8 }}
                labelStyle={{ color: "#8A8A8F", fontSize: 11 }}
                itemStyle={{ color: "#CAFF33", fontSize: 12 }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {data.growth.map((_, i) => (
                  <Cell key={i} fill={i === data.growth.length - 1 ? "#CAFF33" : "#2A2A2E"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#2A2A2E" }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#2A2A2E", backgroundColor: "#141416" }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: "#E8E8E8" }}>Workspaces</p>
            <p className="text-xs" style={{ color: "#555559" }}>Clique em um workspace para ver o consumo detalhado</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: "#2A2A2E", backgroundColor: "#141416" }}>
                {["Workspace", "Plano", "Membros", "Leads", "Mensagens", "Custo/período", "Criado em"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-wide" style={{ color: "#555559" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.workspaces.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: "#555559" }}>Nenhum workspace encontrado</td>
                </tr>
              ) : (
                data.workspaces.map((ws) => <WorkspaceRow key={ws.id} ws={ws} totalCostBrl={costBrl} limitBrl={limitBrl} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      <OrphanUsersTable users={data.orphanUsers} />
    </div>
  )
}

type Tab = "business" | "infra" | "kb"

function toDateInput(iso: string) {
  return iso.slice(0, 10)
}

function startOfDay(dateStr: string) {
  return new Date(dateStr + "T00:00:00.000Z").toISOString()
}

function endOfDay(dateStr: string) {
  return new Date(dateStr + "T23:59:59.999Z").toISOString()
}

function defaultFrom() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

function defaultTo() {
  return new Date().toISOString()
}

export function AdminDashboardClient({ data, initialFrom, initialTo }: {
  data: AdminDashboardData
  initialFrom?: string
  initialTo?: string
}) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("business")

  const [fromInput, setFromInput] = useState(toDateInput(initialFrom ?? defaultFrom()))
  const [toInput, setToInput] = useState(toDateInput(initialTo ?? defaultTo()))

  function applyFilter() {
    const params = new URLSearchParams()
    params.set("from", startOfDay(fromInput))
    params.set("to", endOfDay(toInput))
    router.push(`/admin?${params.toString()}`)
  }

  function resetFilter() {
    const now = new Date()
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    setFromInput(toDateInput(from))
    setToInput(toDateInput(now.toISOString()))
    router.push("/admin")
  }

  const activeTo = initialTo ?? defaultTo()
  const activeFrom = initialFrom ?? defaultFrom()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/admin/login")
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "business", label: "Negócio", icon: BarChart2 },
    { id: "infra", label: "Infraestrutura", icon: Server },
    { id: "kb", label: "Base de Conhecimento", icon: BookOpen },
  ]

  const isFiltered = !!initialFrom || !!initialTo

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ backgroundColor: "#0C0C0E" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-mono tracking-widest uppercase mb-1" style={{ color: "#555559" }}>EngenharIA</p>
          <h1 className="text-2xl font-bold" style={{ color: "#E8E8E8", fontFamily: "Syne, sans-serif" }}>Painel Admin</h1>
          <p className="text-sm mt-0.5" style={{ color: "#555559" }}>
            Visão geral da plataforma · {new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </p>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-xs rounded-lg border px-3 py-2 transition-colors hover:border-pf-accent/40" style={{ borderColor: "#2A2A2E", color: "#8A8A8F" }}>
          <LogOut className="size-3.5" />
          Sair
        </button>
      </div>

      {/* Tabs + filtro de período (só aparece na aba Negócio) */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex gap-1 rounded-xl border p-1" style={{ borderColor: "#2A2A2E", backgroundColor: "#141416" }}>
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = tab === id
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: active ? "#CAFF33" : "transparent",
                  color: active ? "#0C0C0E" : "#8A8A8F",
                }}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            )
          })}
        </div>

        {tab === "business" && (
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="size-3.5 shrink-0" style={{ color: "#555559" }} />
            <input
              type="date"
              value={fromInput}
              onChange={e => setFromInput(e.target.value)}
              className="rounded-lg border px-2.5 py-1.5 text-xs font-mono bg-transparent outline-none focus:border-pf-accent/50"
              style={{ borderColor: "#2A2A2E", color: "#E8E8E8", colorScheme: "dark" }}
            />
            <span className="text-xs" style={{ color: "#555559" }}>até</span>
            <input
              type="date"
              value={toInput}
              onChange={e => setToInput(e.target.value)}
              className="rounded-lg border px-2.5 py-1.5 text-xs font-mono bg-transparent outline-none focus:border-pf-accent/50"
              style={{ borderColor: "#2A2A2E", color: "#E8E8E8", colorScheme: "dark" }}
            />
            <button
              onClick={applyFilter}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{ backgroundColor: "#CAFF33", color: "#0C0C0E" }}
            >
              Filtrar
            </button>
            {isFiltered && (
              <button
                onClick={resetFilter}
                className="rounded-lg border px-3 py-1.5 text-xs transition-colors hover:border-pf-accent/30"
                style={{ borderColor: "#2A2A2E", color: "#555559" }}
              >
                Limpar
              </button>
            )}
          </div>
        )}
      </div>

      {tab === "business" && (
        <BusinessTab
          data={data}
          limitBrl={data.infra.services.find(s => s.name === "Google Gemini")?.usage?.limit ?? 200}
        />
      )}
      {tab === "infra" && <InfraTab data={data} from={activeFrom} to={activeTo} />}
      {tab === "kb" && <KnowledgeBaseTab />}
    </div>
  )
}
