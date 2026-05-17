"use client"

import { useState, useEffect } from "react"
import { Bell, MessageCircle, Clock, Loader2, Lock } from "lucide-react"
import { getCatalogConfig } from "@/actions/catalog"
import { upsertCatalogConfig } from "@/actions/catalog"
import type { CatalogConfig } from "@/types"

export function RecuperadorTab() {
  const [config, setConfig] = useState<CatalogConfig | null>(null)
  const [loading, setLoading] = useState(true)

  // Banner state
  const [recoveryEnabled, setRecoveryEnabled] = useState(true)
  const [recoveryText, setRecoveryText] = useState("")
  const [savingBanner, setSavingBanner] = useState(false)
  const [savedBanner, setSavedBanner] = useState(false)
  const [bannerError, setBannerError] = useState<string | null>(null)

  useEffect(() => {
    getCatalogConfig().then((cfg) => {
      setConfig(cfg)
      setRecoveryEnabled(cfg?.cart_recovery_enabled ?? true)
      setRecoveryText(cfg?.cart_recovery_text ?? "")
      setLoading(false)
    })
  }, [])

  async function handleBannerToggle() {
    const next = !recoveryEnabled
    setRecoveryEnabled(next)
    setSavingBanner(true)
    const res = await upsertCatalogConfig({ cart_recovery_enabled: next })
    setSavingBanner(false)
    if (res.success && res.config) setConfig(res.config)
  }

  async function handleBannerSave() {
    setSavingBanner(true)
    setBannerError(null)
    const res = await upsertCatalogConfig({ cart_recovery_text: recoveryText })
    setSavingBanner(false)
    if (res.success && res.config) {
      setConfig(res.config)
      setSavedBanner(true)
      setTimeout(() => setSavedBanner(false), 2000)
    } else {
      setBannerError(res.error ?? "Erro ao salvar")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-5 animate-spin text-[#555559]" />
      </div>
    )
  }

  if (!config) {
    return (
      <div className="rounded-xl border border-[#2A2A2E] bg-[#141416] p-6 text-center text-sm text-[#555559]">
        Configure o catálogo primeiro na aba <strong className="text-[#8A8A8F]">Catálogo</strong> para ativar o recuperador.
      </div>
    )
  }

  const cartEnabled = config.cart_enabled

  return (
    <div className="flex flex-col gap-8">

      {/* Cabeçalho */}
      <div>
        <h3 className="font-heading text-lg font-bold text-[#E8E8E8]">Recuperador de Carrinho</h3>
        <p className="mt-1 text-sm text-[#8A8A8F]">
          Configure como recuperar clientes que adicionaram produtos mas não finalizaram o pedido.
        </p>
      </div>

      {!cartEnabled && (
        <div className="flex items-center gap-3 rounded-xl border border-[#FF6B35]/30 bg-[#FF6B35]/05 px-4 py-3 text-sm text-[#FF6B35]">
          <Bell className="size-4 shrink-0" />
          O carrinho está desativado. Ative-o na aba <strong className="mx-1">Catálogo → Carrinho</strong> para usar o recuperador.
        </div>
      )}

      {/* ── 1. Banner no catálogo ─────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-6 items-center justify-center rounded-full bg-[#CAFF33]/10 text-xs font-bold text-[#CAFF33] shrink-0">1</span>
          <div>
            <h4 className="text-sm font-bold text-[#E8E8E8]">Banner no catálogo</h4>
            <p className="text-xs text-[#555559] mt-0.5">Exibe um aviso quando o cliente volta ao catálogo com itens salvos. Gratuito, sem custo adicional.</p>
          </div>
        </div>

        <div className="rounded-xl border border-[#2A2A2E] bg-[#141416] p-5 flex flex-col gap-4">
          {/* Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#E8E8E8]">Ativar banner de recuperação</p>
              <p className="text-xs text-[#555559] mt-0.5">
                Aparece na parte inferior do catálogo quando o cliente retorna com itens no carrinho
              </p>
            </div>
            <button
              type="button"
              onClick={handleBannerToggle}
              disabled={savingBanner || !cartEnabled}
              className="w-11 h-6 rounded-full relative transition-colors shrink-0 ml-4 disabled:opacity-40"
              style={{ backgroundColor: recoveryEnabled ? "#2ED573" : "#1A1A1E", border: "1px solid #2A2A2E" }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                style={{ left: recoveryEnabled ? "calc(100% - 22px)" : "2px" }}
              />
            </button>
          </div>

          {/* Texto do banner */}
          {recoveryEnabled && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#8A8A8F]">Texto do banner</label>
              <input
                value={recoveryText}
                onChange={(e) => { setRecoveryText(e.target.value); setSavedBanner(false) }}
                placeholder="Ex: Você deixou itens no carrinho — continue de onde parou!"
                className="rounded-xl border border-[#2A2A2E] bg-transparent px-3 py-2.5 text-sm text-[#E8E8E8] outline-none placeholder:text-[#555559] focus:border-[#CAFF33] transition-colors"
                disabled={!cartEnabled}
              />
              <p className="text-[11px] text-[#555559]">
                O carrinho é mantido por 7 dias no navegador do cliente.
              </p>

              {bannerError && <p className="text-xs text-[#FF4757]">{bannerError}</p>}

              <div className="flex justify-end mt-1">
                <button
                  onClick={handleBannerSave}
                  disabled={savingBanner || !cartEnabled}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: "#CAFF33", color: "#0C0C0E" }}
                >
                  {savingBanner && <Loader2 className="size-3.5 animate-spin" />}
                  {savedBanner ? "✓ Salvo" : savingBanner ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          )}

          {/* Preview do banner */}
          {recoveryEnabled && cartEnabled && (
            <div className="rounded-xl border border-[#2ED573]/20 bg-[#2ED573]/04 p-3">
              <p className="text-[10px] font-semibold text-[#555559] uppercase tracking-widest mb-2">Preview do banner</p>
              <div
                className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{ background: "#141416", border: "1px solid #2ED573", boxShadow: "0 4px 16px rgba(46,213,115,0.1)" }}
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(46,213,115,0.12)" }}>
                  <Bell className="size-4 text-[#2ED573]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#E8E8E8] leading-snug">
                    {recoveryText || "Você deixou itens no carrinho — continue de onde parou!"}
                  </p>
                  <p className="text-[10px] text-[#8A8A8F] mt-0.5">Seu carrinho foi salvo — continue de onde parou.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="rounded-lg px-3 py-1.5 text-[11px] font-bold" style={{ backgroundColor: "#2ED573", color: "#0C0C0E" }}>
                    Ver
                  </span>
                  <span className="text-[#555559] text-xs">✕</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. Recuperador via WhatsApp ───────────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-6 items-center justify-center rounded-full bg-[#CAFF33]/10 text-xs font-bold text-[#CAFF33] shrink-0">2</span>
          <div>
            <h4 className="text-sm font-bold text-[#E8E8E8]">Recuperação via WhatsApp</h4>
            <p className="text-xs text-[#555559] mt-0.5">
              Envia uma mensagem automática para clientes que informaram o telefone no quiz mas não finalizaram o pedido.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[#2A2A2E] bg-[#141416] p-5 flex flex-col gap-5 relative overflow-hidden">
          {/* Overlay "em breve" */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl backdrop-blur-[2px]" style={{ background: "rgba(12,12,14,0.75)" }}>
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#1A1A1E] border border-[#2A2A2E]">
              <Lock className="size-5 text-[#555559]" />
            </div>
            <div className="text-center px-6">
              <p className="text-sm font-bold text-[#E8E8E8]">Em breve</p>
              <p className="text-xs text-[#555559] mt-1 leading-relaxed">
                Disponível após aprovação dos WhatsApp Templates na Meta. Aguardando aprovação do app (enviado em 16/05).
              </p>
            </div>
          </div>

          {/* Conteúdo bloqueado (visual de fundo) */}
          <div className="flex items-center justify-between opacity-30 pointer-events-none">
            <div>
              <p className="text-sm font-medium text-[#E8E8E8]">Ativar recuperação via WhatsApp</p>
              <p className="text-xs text-[#555559] mt-0.5">Dispara template automático após X horas sem pedido</p>
            </div>
            <div className="w-11 h-6 rounded-full relative" style={{ backgroundColor: "#1A1A1E", border: "1px solid #2A2A2E" }}>
              <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 opacity-30 pointer-events-none">
            <label className="text-xs font-medium text-[#8A8A8F]">Aguardar antes de enviar</label>
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-[#555559]" />
              <div className="rounded-xl border border-[#2A2A2E] bg-transparent px-3 py-2.5 text-sm text-[#555559] w-24">2 horas</div>
              <span className="text-xs text-[#555559]">após adição ao carrinho sem finalizar pedido</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 opacity-30 pointer-events-none">
            <label className="text-xs font-medium text-[#8A8A8F]">Template WhatsApp</label>
            <div className="flex items-center gap-2 rounded-xl border border-[#2A2A2E] bg-transparent px-3 py-2.5 text-sm text-[#555559]">
              <MessageCircle className="size-4" />
              Selecionar template aprovado...
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
