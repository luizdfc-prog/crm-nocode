"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, RefreshCw, Smartphone, CheckCircle2, XCircle, Unplug } from "lucide-react"
import { Button } from "@/components/ui/button"

type ConnectionStatus = "disconnected" | "qr" | "connecting" | "connected" | "unavailable"

interface StatusResponse {
  status: ConnectionStatus
  phone?: string | null
}

interface QRResponse {
  status: ConnectionStatus
  qr?: string | null
}

const POLL_INTERVAL_MS = 3000

export function WhatsAppQRTab() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected")
  const [phone, setPhone] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  async function fetchStatus(): Promise<ConnectionStatus> {
    try {
      const res = await fetch("/api/whatsapp-qr/status", { cache: "no-store" })
      if (!res.ok) {
        setStatus("unavailable")
        return "unavailable"
      }
      const data: StatusResponse = await res.json()
      setStatus(data.status)
      setPhone(data.phone ?? null)
      return data.status
    } catch {
      setStatus("unavailable")
      return "unavailable"
    }
  }

  async function fetchQR() {
    try {
      const res = await fetch("/api/whatsapp-qr/qr", { cache: "no-store" })
      if (!res.ok) return
      const data: QRResponse = await res.json()
      if (data.qr) setQrDataUrl(data.qr)
    } catch {
      // silencioso
    }
  }

  async function poll() {
    const currentStatus = await fetchStatus()
    if (currentStatus === "qr" || currentStatus === "connecting") {
      await fetchQR()
    } else {
      setQrDataUrl(null)
    }
  }

  useEffect(() => {
    poll().finally(() => setLoading(false))

    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      await fetch("/api/whatsapp-qr/status", { method: "DELETE" })
      setStatus("disconnected")
      setQrDataUrl(null)
      setPhone(null)
    } finally {
      setDisconnecting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-pf-text-muted" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-md">
      <div>
        <h3 className="font-heading text-base font-semibold text-pf-text">
          Conectar via QR Code
        </h3>
        <p className="mt-1 text-sm text-pf-text-sec">
          Conecte qualquer número WhatsApp ao Z4P escaneando o QR Code abaixo. Não é necessária aprovação da Meta.
        </p>
      </div>

      {/* Status badge */}
      <StatusBadge status={status} phone={phone} />

      {/* QR Code */}
      {(status === "qr" || status === "connecting") && (
        <div className="flex flex-col items-center gap-4">
          {qrDataUrl ? (
            <div className="rounded-2xl border border-pf-border bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR Code WhatsApp" className="size-64" />
            </div>
          ) : (
            <div className="flex size-64 items-center justify-center rounded-2xl border border-pf-border bg-pf-surface-2">
              <Loader2 className="size-8 animate-spin text-pf-text-muted" />
            </div>
          )}

          <div className="rounded-xl border border-pf-border bg-pf-surface-2 p-4 text-sm text-pf-text-sec space-y-1.5">
            <p className="font-medium text-pf-text">Como escanear:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Abra o WhatsApp no celular</li>
              <li>Toque em <span className="text-pf-text font-medium">Aparelhos conectados</span></li>
              <li>Toque em <span className="text-pf-text font-medium">Conectar aparelho</span></li>
              <li>Aponte para o QR Code acima</li>
            </ol>
          </div>

          <p className="text-xs text-pf-text-muted flex items-center gap-1.5">
            <RefreshCw className="size-3 animate-spin" />
            Verificando conexão automaticamente...
          </p>
        </div>
      )}

      {/* Conectado */}
      {status === "connected" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-xl border border-pf-positive/30 bg-pf-positive/10 p-4">
            <Smartphone className="size-5 text-pf-positive shrink-0" />
            <div>
              <p className="text-sm font-medium text-pf-text">WhatsApp conectado</p>
              {phone && (
                <p className="text-xs text-pf-text-muted mt-0.5">+{phone}</p>
              )}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="self-start border-pf-negative/40 text-pf-negative hover:bg-pf-negative/10 hover:text-pf-negative"
          >
            {disconnecting ? (
              <Loader2 className="mr-2 size-3.5 animate-spin" />
            ) : (
              <Unplug className="mr-2 size-3.5" />
            )}
            Desconectar
          </Button>
        </div>
      )}

      {/* Servidor indisponível */}
      {status === "unavailable" && (
        <div className="flex items-start gap-3 rounded-xl border border-pf-negative/30 bg-pf-negative/10 p-4">
          <XCircle className="size-5 text-pf-negative shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-pf-text">Servidor indisponível</p>
            <p className="text-xs text-pf-text-muted mt-0.5">
              O servidor Baileys não está respondendo. Verifique o deploy no Railway.
            </p>
          </div>
        </div>
      )}

      {/* Desconectado — aguardando QR */}
      {status === "disconnected" && (
        <div className="flex items-start gap-3 rounded-xl border border-pf-border bg-pf-surface-2 p-4">
          <Smartphone className="size-5 text-pf-text-muted shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-pf-text">Aguardando QR Code</p>
            <p className="text-xs text-pf-text-muted mt-0.5">
              O QR Code será exibido em instantes...
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status, phone }: { status: ConnectionStatus; phone: string | null }) {
  const configs: Record<ConnectionStatus, { label: string; color: string }> = {
    disconnected: { label: "Desconectado", color: "text-pf-text-muted bg-pf-surface-2 border-pf-border" },
    qr: { label: "Aguardando escaneamento", color: "text-pf-warm bg-pf-warm/10 border-pf-warm/30" },
    connecting: { label: "Conectando...", color: "text-pf-cool bg-pf-cool/10 border-pf-cool/30" },
    connected: { label: phone ? `Conectado (+${phone})` : "Conectado", color: "text-pf-positive bg-pf-positive/10 border-pf-positive/30" },
    unavailable: { label: "Servidor indisponível", color: "text-pf-negative bg-pf-negative/10 border-pf-negative/30" },
  }

  const { label, color } = configs[status]

  return (
    <div className={`inline-flex items-center gap-2 self-start rounded-full border px-3 py-1 text-xs font-medium ${color}`}>
      {status === "connected" && <CheckCircle2 className="size-3.5" />}
      {status === "connecting" && <Loader2 className="size-3.5 animate-spin" />}
      {label}
    </div>
  )
}
