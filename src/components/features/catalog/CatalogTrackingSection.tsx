"use client"

import { useState, useEffect } from "react"
import {
  BarChart2, MousePointerClick, Eye, ShoppingBag,
  TrendingUp, HelpCircle, Loader2, ExternalLink
} from "lucide-react"
import { getCatalogStats } from "@/actions/catalogTracking"
import { upsertCatalogConfig } from "@/actions/catalog"
import { brand } from "@/config/brand"
import type { CatalogConfig, CatalogStats } from "@/types"
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid } from "recharts"

// ── Tooltip ──────────────────────────────────────────────────

function Tip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex items-center">
      <button type="button" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-sec)]">
        <HelpCircle className="size-3.5" />
      </button>
      {open && (
        <span className="absolute left-5 top-0 z-50 w-64 rounded-lg px-3 py-2 text-xs text-[var(--text-sec)] shadow-lg pointer-events-none" style={{ background: "#1A1A1E", border: "1px solid var(--border)" }}>
          {text}
        </span>
      )}
    </span>
  )
}

// ── Card de métrica ───────────────────────────────────────────

function MetricCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] px-4 py-3" style={{ background: "#141416" }}>
      <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0" style={{ backgroundColor: `${color}18` }}>
        <Icon className="size-4" style={{ color }} />
      </div>
      <div>
        <p className="text-xl font-bold text-[var(--text)]">{value.toLocaleString("pt-BR")}</p>
        <p className="text-xs text-[var(--text-muted)]">{label}</p>
      </div>
    </div>
  )
}

// ── Seção de pixels ───────────────────────────────────────────

interface PixelField {
  key: keyof CatalogConfig
  label: string
  placeholder: string
  tip: string
  docsUrl: string
  icon: string
}

const PIXEL_FIELDS: PixelField[] = [
  {
    key: "meta_pixel_id",
    label: "Meta Pixel ID",
    placeholder: "Ex: 123456789012345",
    tip: "ID numérico do seu Pixel do Facebook/Instagram. Encontre em Gerenciador de Eventos → Pixel → Configurações.",
    docsUrl: "https://www.facebook.com/business/help/952192354843755",
    icon: "📘",
  },
  {
    key: "gtm_container_id",
    label: "Google Tag Manager",
    placeholder: "Ex: GTM-XXXXXXX",
    tip: "ID do container GTM (começa com GTM-). Encontre em tagmanager.google.com → seu container.",
    docsUrl: "https://support.google.com/tagmanager/answer/6103696",
    icon: "🏷️",
  },
  {
    key: "ga4_measurement_id",
    label: "Google Analytics 4 (GA4)",
    placeholder: "Ex: G-XXXXXXXXXX",
    tip: "ID de medição do GA4 (começa com G-). Encontre em Propriedade → Fluxos de dados → Web.",
    docsUrl: "https://support.google.com/analytics/answer/9304153",
    icon: "📊",
  },
  {
    key: "tiktok_pixel_id",
    label: "TikTok Pixel",
    placeholder: "Ex: CXXXXXXXXXXXXXX",
    tip: "ID do Pixel do TikTok. Encontre em TikTok Ads Manager → Ativos → Eventos → Web.",
    docsUrl: "https://ads.tiktok.com/help/article/tiktok-pixel",
    icon: "🎵",
  },
]

interface Props {
  config: CatalogConfig | null
  onSaved: (c: CatalogConfig) => void
  onDirtyChange: (dirty: boolean) => void
}

export function CatalogTrackingSection({ config, onSaved, onDirtyChange }: Props) {
  const [pixels, setPixels] = useState({
    meta_pixel_id: config?.meta_pixel_id ?? "",
    gtm_container_id: config?.gtm_container_id ?? "",
    ga4_measurement_id: config?.ga4_measurement_id ?? "",
    tiktok_pixel_id: config?.tiktok_pixel_id ?? "",
    utm_source: config?.utm_source ?? "catalogo",
    utm_medium: config?.utm_medium ?? "whatsapp",
    utm_campaign: config?.utm_campaign ?? "",
    cta_message: config?.cta_message ?? "Olá! Vi seu catálogo e tenho interesse.",
    cta_product_message: config?.cta_product_message ?? "Pedir informações",
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [stats, setStats] = useState<CatalogStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [period, setPeriod] = useState(30)

  useEffect(() => {
    setLoadingStats(true)
    getCatalogStats(period).then((s) => { setStats(s); setLoadingStats(false) })
  }, [period])

  function patch(key: string, value: string) {
    setPixels((prev) => ({ ...prev, [key]: value }))
    onDirtyChange(true)
    setSaved(false)
  }

  async function handleSave() {
    if (!config) return
    setSaving(true)
    const res = await upsertCatalogConfig(pixels)
    setSaving(false)
    if (res.success && res.config) {
      onSaved(res.config)
      onDirtyChange(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <div className="flex flex-col gap-8">

      {/* ── Relatório nativo ── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="size-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text)]">Relatório do catálogo</h3>
            <Tip text={`Dados coletados nativamente pelo ${brand.name}: visitas, visualizações de produto e cliques no WhatsApp. Independe de pixels externos.`} />
          </div>
          {/* Seletor de período */}
          <div className="flex gap-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setPeriod(d)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                style={{
                  backgroundColor: period === d ? "var(--accent)" : "var(--surface-2)",
                  color: period === d ? "#0C0C0E" : "var(--text-muted)",
                  border: `1px solid ${period === d ? "var(--accent)" : "var(--border)"}`,
                }}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {loadingStats ? (
          <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin text-[var(--text-muted)]" /></div>
        ) : !stats ? (
          <p className="text-xs text-[var(--text-muted)] py-6 text-center">Nenhum dado ainda. Os eventos aparecem assim que o catálogo receber visitas.</p>
        ) : (
          <>
            {/* Cards de métricas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <MetricCard icon={Eye} label="Visitas à página" value={stats.total_page_views} color="#5B7FFF" />
              <MetricCard icon={ShoppingBag} label="Produtos visualizados" value={stats.total_product_views} color="#CAFF33" />
              <MetricCard icon={MousePointerClick} label="Cliques no WhatsApp" value={stats.total_whatsapp_clicks} color="#2ED573" />
            </div>

            {/* Gráfico de visitas por dia */}
            {stats.views_by_day.length > 1 && (
              <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: "#141416" }}>
                <p className="text-xs font-medium text-[var(--text-sec)] mb-3 flex items-center gap-1.5">
                  <TrendingUp className="size-3.5" /> Visitas diárias
                </p>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={stats.views_by_day} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2E" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#555559" }} tickFormatter={(d) => d.slice(5)} />
                    <YAxis tick={{ fontSize: 10, fill: "#555559" }} width={28} />
                    <RTooltip
                      contentStyle={{ background: "#1A1A1E", border: "1px solid #2A2A2E", borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "#8A8A8F" }}
                    />
                    <Bar dataKey="views" name="Visitas" fill="#5B7FFF" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="clicks" name="Cliques WA" fill="#2ED573" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top produtos */}
            {stats.top_products.length > 0 && (
              <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: "#141416" }}>
                <div className="px-4 py-2 border-b border-[var(--border)]">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Produtos mais vistos</p>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {stats.top_products.map((p, i) => (
                    <div key={p.product_name} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="text-xs font-bold text-[var(--text-muted)] w-4">{i + 1}</span>
                      <span className="flex-1 text-sm text-[var(--text)] truncate">{p.product_name}</span>
                      <span className="text-xs text-[#5B7FFF] shrink-0">{p.views} views</span>
                      <span className="text-xs text-[#2ED573] shrink-0">{p.clicks} cliques</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="border-t border-[var(--border)]" />

      {/* ── Pixels externos ── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[var(--text)]">Pixels e rastreamento externo</h3>
          <Tip text={`Cole os IDs dos pixels que deseja ativar. O ${brand.name} injeta automaticamente os scripts no catálogo e dispara eventos de visualização e clique.`} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PIXEL_FIELDS.map((f) => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{f.icon}</span>
                <label className="text-xs font-medium text-[var(--text-sec)]">{f.label}</label>
                <Tip text={f.tip} />
                <a href={f.docsUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                  <ExternalLink className="size-3" />
                </a>
              </div>
              <input
                value={pixels[f.key as keyof typeof pixels]}
                onChange={(e) => patch(f.key, e.target.value.trim())}
                placeholder={f.placeholder}
                className="rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] font-mono"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[var(--border)]" />

      {/* ── Textos dos CTAs ── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[var(--text)]">Texto dos botões WhatsApp</h3>
          <Tip text="Mensagem pré-preenchida que o lead envia ao clicar nos botões. Use {produto} no texto do produto — será substituído pelo nome real." />
        </div>

        <div className="flex flex-col gap-3">
          {/* Botão flutuante / header */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-[var(--text-sec)]">💬 Botão flutuante e header</label>
              <Tip text="Aparece no botão 'Falar no WhatsApp' que flutua na página e no botão do cabeçalho do catálogo." />
            </div>
            <input
              value={pixels.cta_message}
              onChange={(e) => patch("cta_message", e.target.value)}
              placeholder="Olá! Vi seu catálogo e tenho interesse."
              className="rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
            />
          </div>

          {/* Botão por produto */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-[var(--text-sec)]">🛍️ Botão "+ detalhes" (por produto)</label>
              <Tip text="Use {produto} onde quer que o nome do produto apareça. Ex: 'Quero saber mais sobre o {produto}'" />
            </div>
            <input
              value={pixels.cta_product_message}
              onChange={(e) => patch("cta_product_message", e.target.value)}
              placeholder="Ex: Pedir informações, Solicitar, Quero esse..."
              className="rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
            />
            <p className="text-[10px] text-[var(--text-muted)]">
              Preview: <span className="text-[var(--text-sec)]">{pixels.cta_product_message.replace("{produto}", "Piscina de Alvenaria 8×4m") || "—"}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--border)]" />

      {/* ── UTMs ── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[var(--text)]">Parâmetros UTM</h3>
          <Tip text="Adicionados automaticamente nos links do botão WhatsApp do catálogo. Permitem rastrear no GA4/Meta de qual catálogo vieram os leads." />
        </div>
        <p className="text-xs text-[var(--text-muted)] -mt-2">
          O link final ficará assim: <span className="font-mono text-[var(--text-sec)]">wa.me/55...?text=...&utm_source={pixels.utm_source || "catalogo"}&utm_medium={pixels.utm_medium || "whatsapp"}&utm_campaign={pixels.utm_campaign || "(vazio)"}</span>
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { key: "utm_source",   label: "utm_source",   placeholder: "catalogo",  tip: "Identifica a origem do tráfego. Ex: catalogo, z4p" },
            { key: "utm_medium",   label: "utm_medium",   placeholder: "whatsapp",  tip: "Canal de marketing. Ex: whatsapp, social, cpc" },
            { key: "utm_campaign", label: "utm_campaign", placeholder: "igui-piscinas", tip: "Nome da campanha. Ex: nome-do-catalogo, verao-2025" },
          ].map((f) => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-medium text-[var(--text-sec)] font-mono">{f.label}</label>
                <Tip text={f.tip} />
              </div>
              <input
                value={pixels[f.key as keyof typeof pixels]}
                onChange={(e) => patch(f.key, e.target.value.trim())}
                placeholder={f.placeholder}
                className="rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] font-mono"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Botão salvar */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !config}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: "#CAFF33", color: "#0C0C0E" }}
        >
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          {saving ? "Salvando..." : "Salvar configurações"}
        </button>
        {saved && <span className="text-xs text-[#2ED573]">✓ Salvo</span>}
      </div>
    </div>
  )
}
