"use client"

import { useState } from "react"
import {
  Users, MessageSquare, DollarSign, TrendingUp,
  ChevronDown, ChevronUp, LogOut, ExternalLink,
  CheckCircle, AlertTriangle, HelpCircle, Wifi, WifiOff,
  BarChart2, Server,
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import type { AdminDashboardData, WorkspaceSummary, ServiceStatus } from "@/actions/admin"
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

function WorkspaceRow({ ws }: { ws: WorkspaceSummary }) {
  const [open, setOpen] = useState(false)
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
        <td className="px-4 py-3 text-sm text-right font-mono" style={{ color: ws.total_cost_usd > 1 ? "#FF6B35" : "#8A8A8F" }}>
          {fmtUsd(ws.total_cost_usd)}
        </td>
        <td className="px-4 py-3 text-xs text-right" style={{ color: "#555559" }}>
          {new Date(ws.created_at).toLocaleDateString("pt-BR")}
        </td>
      </tr>
      {open && (
        <tr style={{ backgroundColor: "#0C0C0E" }}>
          <td colSpan={7} className="px-6 py-4">
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

function InfraTab({ data }: { data: AdminDashboardData }) {
  const { infra } = data
  const connectedWs = infra.whatsappConnections.filter((w) => w.connected)
  const disconnectedWs = infra.whatsappConnections.filter((w) => !w.connected)

  return (
    <div className="flex flex-col gap-6">
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

function BusinessTab({ data }: { data: AdminDashboardData }) {
  const mrrBrl = data.totals.mrr_usd * 5.7
  const costBrl = data.totals.total_cost_usd * 5.7
  const margin = mrrBrl > 0 ? ((mrrBrl - costBrl) / mrrBrl * 100) : 0

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Workspaces ativos" value={fmt(data.totals.workspaces)} icon={Users} sub={`${data.workspaces.filter(w => w.plan !== "free").length} pagantes`} />
        <StatCard label="Total de leads" value={fmt(data.totals.leads)} icon={TrendingUp} sub="na plataforma" />
        <StatCard label="MRR estimado" value={`R$${fmt(mrrBrl)}`} icon={DollarSign} accent sub={`$${fmt(data.totals.mrr_usd)} USD`} />
        <StatCard label="Custo IA (mês)" value={`R$${fmt(costBrl, 2)}`} icon={MessageSquare} sub={`Margem: ${fmt(margin, 1)}%`} />
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
                {["Workspace", "Plano", "Membros", "Leads", "Mensagens", "Custo/mês", "Criado em"].map((h) => (
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
                data.workspaces.map((ws) => <WorkspaceRow key={ws.id} ws={ws} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

type Tab = "business" | "infra"

export function AdminDashboardClient({ data }: { data: AdminDashboardData }) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("business")

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/admin/login")
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "business", label: "Negócio", icon: BarChart2 },
    { id: "infra", label: "Infraestrutura", icon: Server },
  ]

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

      {/* Tabs */}
      <div className="flex gap-1 mb-8 rounded-xl border p-1" style={{ borderColor: "#2A2A2E", backgroundColor: "#141416", width: "fit-content" }}>
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

      {tab === "business" ? <BusinessTab data={data} /> : <InfraTab data={data} />}
    </div>
  )
}
