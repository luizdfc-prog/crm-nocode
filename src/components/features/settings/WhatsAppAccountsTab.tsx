"use client"

import { useEffect, useState, useCallback } from "react"
import {
  CheckCircle2, XCircle, Loader2, Unplug, MessageCircle,
  ShieldCheck, Zap, ToggleLeft, ToggleRight, ChevronDown, Plus,
} from "lucide-react"
import { getWhatsAppAccounts, updateWhatsAppAccount } from "@/actions/distributor"
import type { WhatsAppAccount, Pipeline } from "@/types"

const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID ?? "3265929643708504"
const META_CONFIG_ID = process.env.NEXT_PUBLIC_META_CONFIG_ID ?? "1247154870560259"

declare global {
  interface Window {
    FB?: {
      init: (opts: Record<string, unknown>) => void
      login: (
        cb: (res: { authResponse?: { code?: string } }) => void,
        opts: Record<string, unknown>
      ) => void
    }
    fbAsyncInit?: () => void
  }
}

interface WhatsAppAccountsTabProps {
  pipelines: Pipeline[]
  isAdmin: boolean
}

export function WhatsAppAccountsTab({ pipelines, isAdmin }: WhatsAppAccountsTabProps) {
  const [accounts, setAccounts] = useState<(WhatsAppAccount & { pipeline?: Pipeline })[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sdkReady, setSdkReady] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)

  // Carrega o Facebook SDK
  useEffect(() => {
    if (document.getElementById("fb-sdk")) { setSdkReady(true); return }
    window.fbAsyncInit = () => {
      window.FB?.init({ appId: META_APP_ID, autoLogAppEvents: true, xfbml: true, version: "v21.0" })
      setSdkReady(true)
    }
    const script = document.createElement("script")
    script.id = "fb-sdk"
    script.src = "https://connect.facebook.net/pt_BR/sdk.js"
    script.async = true
    script.defer = true
    document.body.appendChild(script)
  }, [])

  const fetchAccounts = useCallback(async () => {
    const data = await getWhatsAppAccounts()
    setAccounts(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  function handleConnect() {
    if (!window.FB) {
      setError("SDK do Facebook não carregado. Recarregue a página.")
      return
    }
    setError(null)
    setConnecting(true)

    window.FB.login(
      (response) => {
        const code = response.authResponse?.code
        if (!code) {
          setConnecting(false)
          setError("Conexão cancelada ou popup fechado.")
          return
        }
        fetch("/api/whatsapp-meta/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        })
          .then((res) => {
            if (!res.ok) return res.json().then((e) => { throw new Error(e.error ?? "Erro ao conectar") })
            return fetchAccounts()
          })
          .catch((err) => setError(err instanceof Error ? err.message : "Erro ao conectar"))
          .finally(() => setConnecting(false))
      },
      {
        config_id: META_CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {}, featureType: "", sessionInfoVersion: "3" },
      }
    )
  }

  // Recebe phone_number_id e waba_id do popup Meta
  useEffect(() => {
    async function handleMessage(event: MessageEvent) {
      if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") return
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data
        if (data?.type === "WA_EMBEDDED_SIGNUP") {
          const { phone_number_id, waba_id } = data.data ?? {}
          if (phone_number_id && waba_id) {
            await fetch("/api/whatsapp-meta/connect", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ phone_number_id, waba_id }),
            })
            await fetchAccounts()
          }
        }
      } catch { /* ignora mensagens não relacionadas */ }
    }
    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [fetchAccounts])

  async function handleToggleRouting(account: WhatsAppAccount) {
    if (!isAdmin) return
    setSaving(account.id)
    const result = await updateWhatsAppAccount(account.id, {
      active_in_routing: !account.active_in_routing,
    })
    if (result.success) {
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === account.id ? { ...a, active_in_routing: !a.active_in_routing } : a
        )
      )
    } else {
      setError(result.error)
    }
    setSaving(null)
  }

  async function handlePipelineChange(account: WhatsAppAccount, pipelineId: string) {
    if (!isAdmin) return
    setSaving(account.id)
    const result = await updateWhatsAppAccount(account.id, {
      pipeline_id: pipelineId || null,
    })
    if (result.success) {
      const pipeline = pipelines.find((p) => p.id === pipelineId) ?? undefined
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === account.id ? { ...a, pipeline_id: pipelineId || null, pipeline } : a
        )
      )
    } else {
      setError(result.error)
    }
    setSaving(null)
  }

  async function handleDisconnect(account: WhatsAppAccount) {
    if (!confirm(`Deseja desconectar +${account.phone_number}?`)) return
    setSaving(account.id)
    try {
      await fetch("/api/whatsapp-meta/connect", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: account.id }),
      })
      await fetchAccounts()
    } catch {
      setError("Erro ao desconectar")
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-5 animate-spin text-pf-text-muted" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <h3 className="text-sm font-semibold text-pf-text">WhatsApp Business</h3>
        <p className="text-xs text-pf-text-sec mt-1">
          Conecte múltiplos números via API oficial da Meta. Cada número pode ser vinculado a um vendedor/pipeline.
        </p>
      </div>

      {/* Lista de contas conectadas */}
      {accounts.length > 0 && (
        <div className="flex flex-col gap-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="rounded-xl border border-pf-border bg-pf-surface-2 p-4 flex flex-col gap-3"
            >
              {/* Header da conta */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="size-8 rounded-full flex items-center justify-center"
                    style={{ background: account.status === "active" ? "var(--positive)20" : "var(--negative)20" }}
                  >
                    {account.status === "active"
                      ? <CheckCircle2 className="size-4" style={{ color: "var(--positive)" }} />
                      : <XCircle className="size-4" style={{ color: "var(--negative)" }} />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-medium text-pf-text">
                      {account.display_name ?? `+${account.phone_number}`}
                    </p>
                    <p className="text-[11px] text-pf-text-muted font-mono">+{account.phone_number}</p>
                  </div>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => handleDisconnect(account)}
                    disabled={saving === account.id}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-pf-text-sec border border-pf-border hover:border-[var(--negative)] hover:text-[var(--negative)] transition-colors disabled:opacity-40"
                  >
                    {saving === account.id
                      ? <Loader2 className="size-3 animate-spin" />
                      : <Unplug className="size-3" />
                    }
                    Desconectar
                  </button>
                )}
              </div>

              {/* Pipeline vinculado */}
              {isAdmin && (
                <div className="flex flex-col gap-1.5 border-t border-pf-border pt-3">
                  <label className="text-[11px] text-pf-text-muted">Pipeline do vendedor</label>
                  <div className="relative">
                    <select
                      value={account.pipeline_id ?? ""}
                      onChange={(e) => handlePipelineChange(account, e.target.value)}
                      disabled={saving === account.id}
                      className="w-full appearance-none rounded-lg border border-pf-border bg-pf-surface px-3 py-2 pr-8 text-xs text-pf-text focus:outline-none focus:border-pf-accent disabled:opacity-50 cursor-pointer"
                    >
                      <option value="">Sem pipeline vinculado</option>
                      {pipelines.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-pf-text-muted" />
                  </div>
                  <p className="text-[10px] text-pf-text-muted">
                    Leads captados por este número entram diretamente neste pipeline.
                  </p>
                </div>
              )}

              {/* Toggle no rodízio */}
              {isAdmin && (
                <div className="flex items-center justify-between border-t border-pf-border pt-3">
                  <div>
                    <p className="text-xs font-medium text-pf-text">Ativo no Distribuidor</p>
                    <p className="text-[10px] text-pf-text-muted">
                      Incluir este número no rodízio de leads do Distribuidor
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleRouting(account)}
                    disabled={saving === account.id}
                    className="disabled:opacity-40 transition-opacity"
                  >
                    {account.active_in_routing
                      ? <ToggleRight className="size-7" style={{ color: "var(--accent)" }} />
                      : <ToggleLeft className="size-7 text-pf-text-muted" />
                    }
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Adicionar novo número */}
      {isAdmin && (
        <div className="flex flex-col gap-3">
          {accounts.length === 0 && (
            <div className="flex flex-col gap-2 rounded-xl border border-pf-border p-4 bg-pf-surface-2">
              <p className="text-xs font-semibold text-pf-text-sec mb-1">Por que usar a API oficial?</p>
              {[
                { icon: ShieldCheck, text: "API oficial da Meta — sem risco de banimento" },
                { icon: Zap, text: "Sem servidor intermediário, conexão direta e estável" },
                { icon: MessageCircle, text: "Suporte a múltiplos números por workspace" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2">
                  <Icon className="size-3.5 shrink-0" style={{ color: "var(--accent)" }} />
                  <span className="text-xs text-pf-text-sec">{text}</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={connecting || !sdkReady}
            className="flex h-9 items-center justify-center gap-2 rounded-lg bg-pf-accent px-4 text-sm font-semibold text-pf-bg transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {connecting
              ? <><Loader2 className="size-3.5 animate-spin" /> Conectando...</>
              : <><Plus className="size-3.5" /> {accounts.length === 0 ? "Conectar WhatsApp Business" : "Adicionar número"}</>
            }
          </button>

          {accounts.length === 0 && (
            <p className="text-[10px] text-pf-text-muted text-center">
              Você será direcionado para o fluxo oficial da Meta para autorizar o número.
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--negative)]/30 bg-[var(--negative)]/10 px-4 py-3">
          <XCircle className="size-4 shrink-0 text-[var(--negative)]" />
          <p className="text-xs text-[var(--negative)]">{error}</p>
        </div>
      )}

      {/* Instrução webhook */}
      {accounts.length === 0 && (
        <div className="rounded-xl border border-pf-border p-4 bg-pf-surface-2">
          <p className="text-xs font-semibold text-pf-text-sec mb-2">Webhook — configure uma vez no Meta</p>
          <div className="flex flex-col gap-1">
            <p className="text-[10px] text-pf-text-muted">URL de callback:</p>
            <code className="text-[10px] rounded px-2 py-1 font-mono break-all bg-pf-surface text-pf-accent">
              {typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/whatsapp
            </code>
          </div>
        </div>
      )}
    </div>
  )
}
