"use client"

import { useEffect, useState, useCallback } from "react"
import { CheckCircle2, XCircle, Loader2, Unplug, MessageCircle, ShieldCheck, Zap } from "lucide-react"

interface WAAccount {
  phone_number: string
  display_name: string | null
  status: string
  connected_at: string
}

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

export function WhatsAppMetaTab() {
  const [account, setAccount] = useState<WAAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sdkReady, setSdkReady] = useState(false)

  // Carrega o Facebook SDK
  useEffect(() => {
    if (document.getElementById("fb-sdk")) { setSdkReady(true); return }

    window.fbAsyncInit = () => {
      window.FB?.init({
        appId: META_APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        version: "v21.0",
      })
      setSdkReady(true)
    }

    const script = document.createElement("script")
    script.id = "fb-sdk"
    script.src = "https://connect.facebook.net/pt_BR/sdk.js"
    script.async = true
    script.defer = true
    document.body.appendChild(script)
  }, [])

  const fetchAccount = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp-meta/status")
      if (res.ok) {
        const data = await res.json()
        setAccount(data.account ?? null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAccount() }, [fetchAccount])

  function handleConnect() {
    if (!window.FB) {
      setError("SDK do Facebook não carregado. Recarregue a página.")
      return
    }
    setError(null)
    setConnecting(true)

    // FB.login deve ser chamado sincronicamente no click para não perder o user gesture
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
            return fetchAccount()
          })
          .catch((err) => setError(err instanceof Error ? err.message : "Erro ao conectar"))
          .finally(() => setConnecting(false))
      },
      {
        config_id: META_CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: { solutionID: "coexistence" },
          featureType: "coexistence",
          sessionInfoVersion: "3",
        },
      }
    )
  }

  // Recebe phone_number_id e waba_id do popup via postMessage
  useEffect(() => {
    async function handleMessage(event: MessageEvent) {
      if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") return
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data
        if (data?.type === "WA_EMBEDDED_SIGNUP") {
          const { phone_number_id, waba_id } = data.data ?? {}
          if (phone_number_id && waba_id) {
            // Atualiza a conta com os IDs recebidos do popup
            await fetch("/api/whatsapp-meta/connect", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ phone_number_id, waba_id }),
            })
            await fetchAccount()
          }
        }
      } catch { /* ignora mensagens não relacionadas */ }
    }
    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [fetchAccount])

  async function handleDisconnect() {
    if (!confirm("Deseja desconectar o WhatsApp? O agente de IA não conseguirá mais responder.")) return
    setDisconnecting(true)
    setError(null)
    try {
      await fetch("/api/whatsapp-meta/connect", { method: "DELETE" })
      setAccount(null)
    } catch {
      setError("Erro ao desconectar")
    } finally {
      setDisconnecting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-5 animate-spin text-[var(--text-muted)]" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text)]">WhatsApp Business</h3>
        <p className="text-xs text-[var(--text-sec)] mt-1">
          Conecte seu número via API oficial da Meta. Zero risco de banimento, sem app intermediário.
        </p>
      </div>

      {/* Vantagens */}
      {!account && (
        <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] p-4 bg-[var(--surface-2)]">
          <p className="text-xs font-semibold text-[var(--text-sec)] mb-1">Por que usar a API oficial?</p>
          {[
            { icon: ShieldCheck, text: "API oficial da Meta — sem risco de banimento" },
            { icon: Zap, text: "Sem servidor intermediário, conexão direta e estável" },
            { icon: MessageCircle, text: "Suporte a múltiplos números por workspace" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2">
              <Icon className="size-3.5 shrink-0" style={{ color: "var(--accent)" }} />
              <span className="text-xs text-[var(--text-sec)]">{text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Status da conta conectada */}
      {account ? (
        <div className="flex flex-col gap-4 rounded-xl border border-[var(--border)] p-5 bg-[var(--surface-2)]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full flex items-center justify-center" style={{ background: "var(--positive)20" }}>
              <CheckCircle2 className="size-5" style={{ color: "var(--positive)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">WhatsApp conectado</p>
              <p className="text-xs text-[var(--text-muted)]">API oficial Meta · {account.status}</p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 border-t border-[var(--border)] pt-3">
            {account.display_name && (
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-muted)]">Nome</span>
                <span className="text-[var(--text)]">{account.display_name}</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-muted)]">Número</span>
              <span className="text-[var(--text)] font-mono">+{account.phone_number}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-muted)]">Conectado em</span>
              <span className="text-[var(--text)]">
                {new Date(account.connected_at).toLocaleDateString("pt-BR")}
              </span>
            </div>
          </div>

          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium border border-[var(--border)] text-[var(--text-sec)] hover:border-[var(--negative)] hover:text-[var(--negative)] transition-colors disabled:opacity-50"
          >
            {disconnecting ? <Loader2 className="size-3.5 animate-spin" /> : <Unplug className="size-3.5" />}
            Desconectar
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="flex h-9 items-center justify-center gap-2 rounded-lg bg-pf-accent px-4 text-sm font-semibold text-pf-bg transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {connecting
              ? <><Loader2 className="size-3.5 animate-spin" /> Conectando...</>
              : <><MessageCircle className="size-3.5" /> Conectar WhatsApp Business</>
            }
          </button>
          <p className="text-[10px] text-[var(--text-muted)] text-center">
            Você será direcionado para o fluxo oficial da Meta para autorizar o número.
          </p>
        </div>
      )}

      {/* Instrução para configurar webhook */}
      {!account && (
        <div className="rounded-xl border border-[var(--border)] p-4 bg-[var(--surface-2)]">
          <p className="text-xs font-semibold text-[var(--text-sec)] mb-2">Webhook — configure uma vez no Meta</p>
          <div className="flex flex-col gap-1">
            <p className="text-[10px] text-[var(--text-muted)]">URL de callback:</p>
            <code className="text-[10px] rounded px-2 py-1 font-mono break-all" style={{ background: "var(--surface)", color: "var(--accent)" }}>
              {process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== "undefined" ? window.location.origin : "")}/api/webhooks/whatsapp
            </code>
          </div>
          <div className="flex flex-col gap-1 mt-2">
            <p className="text-[10px] text-[var(--text-muted)]">Token de verificação (variável WHATSAPP_WEBHOOK_VERIFY_TOKEN):</p>
            <p className="text-[10px] text-[var(--text-muted)]">Configure na Vercel e cole o mesmo valor no painel da Meta.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--negative)]/30 bg-[var(--negative)]/10 px-4 py-3">
          <XCircle className="size-4 shrink-0 text-[var(--negative)]" />
          <p className="text-xs text-[var(--negative)]">{error}</p>
        </div>
      )}
    </div>
  )
}
