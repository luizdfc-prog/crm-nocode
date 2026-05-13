"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Image from "next/image"
import { MessageCircle, ChevronRight, Tag } from "lucide-react"
import type { CatalogPublicData, CatalogCategory, CatalogProduct } from "@/types"
import { recordCatalogEvent } from "@/actions/catalogTracking"

interface Props {
  data: CatalogPublicData
}

function formatPrice(price: number | null) {
  if (price === null) return null
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

// Lê UTMs da URL da página (campanhas de tráfego) — sobrepõe aos UTMs padrão do catálogo
function getPageUtms(): { source: string | null; medium: string | null; campaign: string | null } {
  if (typeof window === "undefined") return { source: null, medium: null, campaign: null }
  const p = new URLSearchParams(window.location.search)
  return {
    source: p.get("utm_source"),
    medium: p.get("utm_medium"),
    campaign: p.get("utm_campaign"),
  }
}

function whatsappUrl(number: string, text?: string, config?: CatalogPublicData["config"], pageUtms?: { source: string | null; medium: string | null; campaign: string | null }) {
  const clean = number.replace(/\D/g, "")

  // Monta tags UTM de campanha para serem capturadas pelo webhook do CRM
  const utms = pageUtms ?? getPageUtms()
  const source = utms.source ?? config?.utm_source ?? null
  const medium = utms.medium ?? config?.utm_medium ?? null
  const campaign = utms.campaign ?? config?.utm_campaign ?? null

  // Embute tags na mensagem — invisíveis ao usuário mas capturadas pelo webhook
  let baseMsg = text ?? "Olá! Vi seu catálogo e tenho interesse."
  if (source || medium || campaign) {
    const tags: string[] = []
    if (source) tags.push(`[utm_source:${source}]`)
    if (medium) tags.push(`[utm_medium:${medium}]`)
    if (campaign) tags.push(`[utm_campaign:${campaign}]`)
    baseMsg += `\n${tags.join("")}`
  }

  return `https://wa.me/55${clean}?text=${encodeURIComponent(baseMsg)}`
}

function ProductCard({ product, accentColor, whatsappNumber, config, pageUtms }: {
  product: CatalogProduct
  accentColor: string
  whatsappNumber: string
  config: CatalogPublicData["config"]
  pageUtms: { source: string | null; medium: string | null; campaign: string | null }
}) {
  const msg = `Olá! Tenho interesse no produto: *${product.name}*`
  const wpUrl = whatsappUrl(whatsappNumber, msg, config, pageUtms)

  function handleProductView() {
    recordCatalogEvent({
      workspace_id: config.workspace_id,
      event_type: "product_view",
      product_id: product.id,
      product_name: product.name,
    })
    // Meta Pixel
    if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>).fbq) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).fbq("track", "ViewContent", { content_name: product.name, content_ids: [product.id] })
    }
  }

  function handleWhatsAppClick() {
    recordCatalogEvent({
      workspace_id: config.workspace_id,
      event_type: "whatsapp_click",
      product_id: product.id,
      product_name: product.name,
    })
    if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>).fbq) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).fbq("track", "Contact")
    }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: "#1A1A1E", border: "1px solid #2A2A2E" }}
      onMouseEnter={handleProductView}
    >
      {/* Imagem */}
      <div className="relative w-full aspect-square bg-[#141416] flex items-center justify-center overflow-hidden">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <span className="text-4xl select-none">📦</span>
        )}
        {product.badge && (
          <span
            className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: accentColor, color: "#0C0C0E" }}
          >
            {product.badge}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-sm font-semibold text-[#E8E8E8] leading-snug line-clamp-2">{product.name}</p>
        {product.description && (
          <p className="text-xs text-[#8A8A8F] line-clamp-2 leading-relaxed">{product.description}</p>
        )}
        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          {product.price !== null ? (
            <span className="text-sm font-bold" style={{ color: accentColor }}>
              {formatPrice(product.price)}
            </span>
          ) : (
            <span className="text-xs text-[#555559]">Consultar</span>
          )}
          <a
            href={wpUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleWhatsAppClick}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-opacity hover:opacity-80 shrink-0"
            style={{ backgroundColor: accentColor, color: "#0C0C0E" }}
          >
            <MessageCircle className="size-3" />
            + detalhes
          </a>
        </div>
      </div>
    </div>
  )
}

function CategoryChip({ category, active, onClick, accentColor }: {
  category: CatalogCategory
  active: boolean
  onClick: () => void
  accentColor: string
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 shrink-0 transition-opacity hover:opacity-80"
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border transition-colors"
        style={{
          backgroundColor: active ? accentColor : "#1A1A1E",
          borderColor: active ? accentColor : "#2A2A2E",
        }}
      >
        {category.emoji}
      </div>
      <span
        className="text-[10px] font-medium max-w-[56px] text-center leading-tight"
        style={{ color: active ? accentColor : "#8A8A8F" }}
      >
        {category.name}
      </span>
    </button>
  )
}

function ProductSection({ title, products, accentColor, whatsappNumber, config, pageUtms }: {
  title: string
  products: CatalogProduct[]
  accentColor: string
  whatsappNumber: string
  config: CatalogPublicData["config"]
  pageUtms: { source: string | null; medium: string | null; campaign: string | null }
}) {
  if (products.length === 0) return null
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-[#E8E8E8] font-[var(--font-heading)]">{title}</h2>
        <span className="text-xs text-[#555559]">{products.length} {products.length === 1 ? "item" : "itens"}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} accentColor={accentColor} whatsappNumber={whatsappNumber} config={config} pageUtms={pageUtms} />
        ))}
      </div>
    </section>
  )
}

function BannerSection({ config }: { config: CatalogPublicData["config"] }) {
  const [slide, setSlide] = useState(0)
  const slides = config.banner_slides ?? []
  const type = config.banner_type ?? "image"

  useEffect(() => {
    if (type !== "carousel" || slides.length < 2) return
    const t = setInterval(() => setSlide((s) => (s + 1) % slides.length), 4000)
    return () => clearInterval(t)
  }, [type, slides.length])

  const overlay = (
    <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to bottom, transparent 50%, #0C0C0E)" }} />
  )

  if (type === "video" && config.banner_video_url) {
    return (
      <div className="relative w-full h-40 sm:h-52 overflow-hidden">
        <video src={config.banner_video_url} className="w-full h-full object-cover" muted loop autoPlay playsInline />
        {overlay}
      </div>
    )
  }

  if (type === "carousel" && slides.length > 0) {
    return (
      <div className="relative w-full h-40 sm:h-52 overflow-hidden">
        {slides.map((url, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: i === slide ? 1 : 0 }}
          >
            <Image src={url} alt={`Slide ${i + 1}`} fill priority={i === 0} className="object-cover" />
          </div>
        ))}
        {overlay}
        {/* Dots */}
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className="w-1.5 h-1.5 rounded-full transition-colors"
              style={{ backgroundColor: i === slide ? "#fff" : "rgba(255,255,255,0.4)" }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (config.banner_url) {
    return (
      <div className="relative w-full h-40 sm:h-52 overflow-hidden">
        <Image src={config.banner_url} alt="Banner" fill priority className="object-cover" />
        {overlay}
      </div>
    )
  }

  return null
}

export function CatalogPage({ data }: Props) {
  const { config, categories, products } = data
  const accent = config.accent_color || "#CAFF33"
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const sectionsRef = useRef<Record<string, HTMLDivElement | null>>({})
  const [pageUtms, setPageUtms] = useState<{ source: string | null; medium: string | null; campaign: string | null }>({ source: null, medium: null, campaign: null })

  // Registra page_view uma única vez ao montar e captura UTMs da URL
  const tracked = useRef(false)
  useEffect(() => {
    if (tracked.current) return
    tracked.current = true
    const params = new URLSearchParams(window.location.search)
    const utms = {
      source: params.get("utm_source"),
      medium: params.get("utm_medium"),
      campaign: params.get("utm_campaign"),
    }
    setPageUtms(utms)
    recordCatalogEvent({
      workspace_id: config.workspace_id,
      event_type: "page_view",
      referrer: document.referrer || null,
      utm_source: utms.source,
      utm_medium: utms.medium,
      utm_campaign: utms.campaign,
    })
  }, [config.workspace_id])

  function handleCategoryClick(id: string) {
    if (activeCategoryId === id) {
      setActiveCategoryId(null)
    } else {
      setActiveCategoryId(id)
      sectionsRef.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  // Produtos sem categoria
  const uncategorized = products.filter((p) => !p.category_id)

  // Produtos filtrados por categoria ativa
  const displayCategories = activeCategoryId
    ? categories.filter((c) => c.id === activeCategoryId)
    : categories

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0C0C0E", fontFamily: "var(--font-sans, DM Sans, sans-serif)" }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3"
        style={{ background: "#141416", borderBottom: "1px solid #2A2A2E" }}
      >
        {config.logo_url ? (
          <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0">
            <Image src={config.logo_url} alt={config.title} fill className="object-cover" />
          </div>
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
            style={{ backgroundColor: accent, color: "#0C0C0E" }}
          >
            {config.title.charAt(0).toUpperCase() || "C"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#E8E8E8] truncate">{config.title}</p>
          {config.description && (
            <p className="text-xs text-[#8A8A8F] truncate">{config.description}</p>
          )}
        </div>
        {config.whatsapp_number && (
          <a
            href={whatsappUrl(config.whatsapp_number)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shrink-0 transition-opacity hover:opacity-80"
            style={{ backgroundColor: accent, color: "#0C0C0E" }}
          >
            <MessageCircle className="size-3.5" />
            Falar
          </a>
        )}
      </header>

      {/* Banner */}
      <BannerSection config={config} />

      {/* Categorias */}
      {categories.length > 0 && (
        <div className="px-4 pt-4 pb-2">
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {categories.map((cat) => (
              <CategoryChip
                key={cat.id}
                category={cat}
                active={activeCategoryId === cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                accentColor={accent}
              />
            ))}
          </div>
        </div>
      )}

      {/* Produtos */}
      <main className="flex-1 px-4 py-4 flex flex-col gap-8 pb-24">
        {displayCategories.map((cat) => {
          const catProducts = products.filter((p) => p.category_id === cat.id)
          return (
            <div
              key={cat.id}
              ref={(el) => { sectionsRef.current[cat.id] = el }}
            >
              <ProductSection
                title={`${cat.emoji} ${cat.name}`}
                products={catProducts}
                accentColor={accent}
                whatsappNumber={config.whatsapp_number}
                config={config}
                pageUtms={pageUtms}
              />
            </div>
          )
        })}

        {!activeCategoryId && uncategorized.length > 0 && (
          <ProductSection
            title="Outros produtos"
            products={uncategorized}
            accentColor={accent}
            whatsappNumber={config.whatsapp_number}
            config={config}
            pageUtms={pageUtms}
          />
        )}

        {products.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <Tag className="size-10 text-[#2A2A2E]" />
            <p className="text-sm text-[#555559]">Nenhum produto disponível no momento.</p>
          </div>
        )}
      </main>

      {/* Botão WhatsApp flutuante */}
      {config.whatsapp_number && (
        <a
          href={whatsappUrl(config.whatsapp_number, undefined, config, pageUtms)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => recordCatalogEvent({ workspace_id: config.workspace_id, event_type: "whatsapp_click" })}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full px-4 py-3 shadow-lg text-sm font-bold transition-transform hover:scale-105 active:scale-95"
          style={{ backgroundColor: accent, color: "#0C0C0E" }}
        >
          <MessageCircle className="size-5" />
          Falar no WhatsApp
        </a>
      )}

      {/* Footer */}
      <footer className="py-4 text-center border-t" style={{ borderColor: "#2A2A2E" }}>
        <p className="text-[10px] text-[#555559]">
          Powered by{" "}
          <span style={{ color: accent }}>Z4P</span>
        </p>
      </footer>
    </div>
  )
}
