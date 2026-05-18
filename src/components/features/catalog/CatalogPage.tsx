"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { MessageCircle, Tag, ShoppingCart, Plus, Minus, Trash2, X, Bell } from "lucide-react"
import type { CatalogPublicData, CatalogCategory, CatalogProduct } from "@/types"
import { recordCatalogEvent } from "@/actions/catalogTracking"
import { brand } from "@/config/brand"
import { CATALOG_THEMES, getFontUrl, type CatalogTheme } from "@/lib/catalog-themes"

interface Props {
  data: CatalogPublicData
  catalogSlug?: string
}

interface CartItem {
  product: CatalogProduct
  quantity: number
}

function formatPrice(price: number | null) {
  if (price === null) return null
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function getPageUtms(): { source: string | null; medium: string | null; campaign: string | null } {
  if (typeof window === "undefined") return { source: null, medium: null, campaign: null }
  const p = new URLSearchParams(window.location.search)
  return {
    source: p.get("utm_source"),
    medium: p.get("utm_medium"),
    campaign: p.get("utm_campaign"),
  }
}

function buildWaText(text: string | undefined, config: CatalogPublicData["config"] | undefined, pageUtms: { source: string | null; medium: string | null; campaign: string | null } | undefined) {
  const utms = pageUtms ?? getPageUtms()
  const source = utms.source ?? config?.utm_source ?? null
  const medium = utms.medium ?? config?.utm_medium ?? null
  const campaign = utms.campaign ?? config?.utm_campaign ?? null

  let baseMsg = text ?? "Olá! Vi seu catálogo e tenho interesse."
  if (source || medium || campaign) {
    const tags: string[] = []
    if (source) tags.push(`[utm_source:${source}]`)
    if (medium) tags.push(`[utm_medium:${medium}]`)
    if (campaign) tags.push(`[utm_campaign:${campaign}]`)
    baseMsg += `\n${tags.join("")}`
  }
  return baseMsg
}

function whatsappUrl(number: string, text?: string, config?: CatalogPublicData["config"], pageUtms?: { source: string | null; medium: string | null; campaign: string | null }, catalogSlug?: string) {
  const message = buildWaText(text, config, pageUtms)
  if (catalogSlug) {
    return `/api/catalog/${catalogSlug}?text=${encodeURIComponent(message)}`
  }
  const clean = number.replace(/\D/g, "")
  return `https://wa.me/55${clean}?text=${encodeURIComponent(message)}`
}

function buildCartMessage(items: CartItem[]): string {
  const lines = items.map((item) => {
    const qty = item.quantity > 1 ? `${item.quantity}x ` : ""
    const price = item.product.price !== null
      ? ` — ${formatPrice(item.product.price! * item.quantity)}`
      : ""
    return `• ${qty}${item.product.name}${price}`
  })
  const total = items.reduce((acc, item) => {
    if (item.product.price === null) return acc
    return acc + item.product.price * item.quantity
  }, 0)
  const hasPrice = items.some((i) => i.product.price !== null)
  const totalLine = hasPrice ? `\n*Total: ${formatPrice(total)}*` : ""
  return `Olá! Tenho interesse nos seguintes produtos:\n\n${lines.join("\n")}${totalLine}`
}

// ── Carrinho flutuante ────────────────────────────────────────

function CartDrawer({
  items,
  accentColor,
  theme,
  config,
  pageUtms,
  catalogSlug,
  onClose,
  onUpdateQty,
  onRemove,
}: {
  items: CartItem[]
  accentColor: string
  theme: CatalogTheme
  config: CatalogPublicData["config"]
  pageUtms: { source: string | null; medium: string | null; campaign: string | null }
  catalogSlug?: string
  onClose: () => void
  onUpdateQty: (id: string, delta: number) => void
  onRemove: (id: string) => void
}) {
  const total = items.reduce((acc, item) => {
    if (item.product.price === null) return acc
    return acc + item.product.price * item.quantity
  }, 0)
  const hasPrice = items.some((i) => i.product.price !== null)
  const ctaText = config.cart_cta_text || "+ Finalizar Pedido"
  const cartMsg = buildCartMessage(items)
  const wpUrl = whatsappUrl(config.whatsapp_number, cartMsg, config, pageUtms, catalogSlug)

  function handleFinalize() {
    recordCatalogEvent({
      workspace_id: config.workspace_id,
      event_type: "cart_whatsapp_click",
    })
    if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>).fbq) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).fbq("track", "InitiateCheckout")
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col max-h-[80vh]"
        style={{ background: theme.drawerBg, border: `1px solid ${theme.border}`, borderRadius: `${theme.cardRadius} ${theme.cardRadius} 0 0` }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: theme.border }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${theme.border}` }}>
          <div className="flex items-center gap-2">
            <ShoppingCart className="size-4" style={{ color: accentColor }} />
            <span className="text-sm font-bold" style={{ color: theme.text }}>
              Carrinho ({items.reduce((a, i) => a + i.quantity, 0)} {items.reduce((a, i) => a + i.quantity, 0) === 1 ? "item" : "itens"})
            </span>
          </div>
          <button onClick={onClose} style={{ color: theme.textSec }} className="hover:opacity-70 transition-opacity">
            <X className="size-5" />
          </button>
        </div>

        {/* Itens */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
          {items.map((item) => (
            <div
              key={item.product.id}
              className="flex items-center gap-3 p-3"
              style={{ background: theme.surface2, border: `1px solid ${theme.cardBorder}`, borderRadius: theme.cardRadius }}
            >
              <div className="relative w-14 h-14 overflow-hidden shrink-0" style={{ borderRadius: theme.btnRadius, background: theme.bg }}>
                {item.product.image_url ? (
                  <Image src={item.product.image_url} alt={item.product.name} fill className="object-cover" sizes="56px" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-xl">📦</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold line-clamp-2 leading-snug" style={{ color: theme.text }}>{item.product.name}</p>
                {item.product.price !== null && (
                  <p className="text-xs font-bold mt-0.5" style={{ color: accentColor }}>
                    {formatPrice(item.product.price * item.quantity)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onUpdateQty(item.product.id, -1)}
                  className="w-6 h-6 flex items-center justify-center transition-opacity hover:opacity-70"
                  style={{ background: theme.border, borderRadius: theme.btnRadius }}
                >
                  <Minus className="size-3" style={{ color: theme.text }} />
                </button>
                <span className="text-xs font-bold w-5 text-center" style={{ color: theme.text }}>{item.quantity}</span>
                <button
                  onClick={() => onUpdateQty(item.product.id, 1)}
                  className="w-6 h-6 flex items-center justify-center transition-opacity hover:opacity-70"
                  style={{ background: theme.border, borderRadius: theme.btnRadius }}
                >
                  <Plus className="size-3" style={{ color: theme.text }} />
                </button>
                <button
                  onClick={() => onRemove(item.product.id)}
                  className="w-6 h-6 flex items-center justify-center ml-1 transition-opacity hover:opacity-70"
                  style={{ background: theme.border, borderRadius: theme.btnRadius }}
                >
                  <Trash2 className="size-3" style={{ color: "#FF4757" }} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-4 flex flex-col gap-3" style={{ borderTop: `1px solid ${theme.border}` }}>
          {hasPrice && (
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: theme.textSec }}>Total</span>
              <span className="text-base font-bold" style={{ color: theme.text }}>{formatPrice(total)}</span>
            </div>
          )}
          <a
            href={wpUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleFinalize}
            className="flex items-center justify-center gap-2 py-3.5 text-sm font-bold transition-opacity hover:opacity-80 active:scale-95"
            style={{ backgroundColor: accentColor, color: "#0C0C0E", borderRadius: theme.btnRadius }}
          >
            <MessageCircle className="size-4" />
            {ctaText}
          </a>
        </div>
      </div>
    </>
  )
}

// ── Card de produto ───────────────────────────────────────────

function ProductCard({ product, accentColor, theme, cartEnabled, onAddToCart, config, pageUtms, catalogSlug, onWhatsAppClick }: {
  product: CatalogProduct
  accentColor: string
  theme: CatalogTheme
  cartEnabled: boolean
  onAddToCart: (product: CatalogProduct) => void
  config: CatalogPublicData["config"]
  pageUtms: { source: string | null; medium: string | null; campaign: string | null }
  catalogSlug?: string
  onWhatsAppClick: (product: CatalogProduct) => void
}) {
  const [added, setAdded] = useState(false)

  function handleAdd() {
    onAddToCart(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1200)
  }

  const ctaButtonLabel = config.cta_product_message || "Pedir informações"
  const waMessage = `Olá! Tenho interesse no produto: *${product.name}*`

  return (
    <div
      className="overflow-hidden flex flex-col"
      style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder === "var(--accent)" ? accentColor : theme.cardBorder}`, borderRadius: theme.cardRadius }}
    >
      {/* Imagem */}
      <div className="relative w-full aspect-square flex items-center justify-center overflow-hidden" style={{ background: theme.surface }}>
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
            className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5"
            style={{ backgroundColor: accentColor, color: "#0C0C0E", borderRadius: theme.badgeRadius }}
          >
            {product.badge}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="leading-snug line-clamp-2 font-semibold" style={{ color: theme.text, fontSize: "13px" }}>{product.name}</p>
        {product.description && (
          <p className="line-clamp-2 leading-relaxed" style={{ color: theme.textSec, fontSize: "11px" }}>{product.description}</p>
        )}
        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          {product.price !== null ? (
            <span className="font-bold" style={{ color: accentColor, fontSize: theme.priceSize }}>{formatPrice(product.price)}</span>
          ) : (
            <span style={{ color: theme.textMuted, fontSize: "11px" }}>Consultar</span>
          )}
          {cartEnabled ? (
            <button
              onClick={handleAdd}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold transition-all hover:opacity-80 shrink-0 active:scale-95"
              style={{
                backgroundColor: added ? "#2ED573" : accentColor,
                color: "#0C0C0E",
                borderRadius: theme.btnRadius,
              }}
            >
              <Plus className="size-3" />
              {added ? "Adicionado!" : "Adicionar"}
            </button>
          ) : (
            <a
              href={whatsappUrl(config.whatsapp_number, waMessage, config, pageUtms, catalogSlug)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onWhatsAppClick(product)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold transition-all hover:opacity-80 shrink-0 active:scale-95"
              style={{ backgroundColor: accentColor, color: "#0C0C0E", borderRadius: theme.btnRadius }}
            >
              <MessageCircle className="size-3" />
              {ctaButtonLabel}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function CategoryChip({ category, active, onClick, accentColor, theme }: {
  category: CatalogCategory
  active: boolean
  onClick: () => void
  accentColor: string
  theme: CatalogTheme
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 shrink-0 transition-opacity hover:opacity-80"
    >
      <div
        className="w-14 h-14 flex items-center justify-center text-2xl border transition-colors"
        style={{
          backgroundColor: active ? accentColor : theme.chipInactiveBg,
          borderColor: active ? accentColor : theme.chipBorder,
          borderRadius: theme.cardRadius,
        }}
      >
        {category.emoji}
      </div>
      <span
        className="text-[10px] font-medium max-w-[56px] text-center leading-tight"
        style={{ color: active ? accentColor : theme.textSec }}
      >
        {category.name}
      </span>
    </button>
  )
}

function ProductSection({ title, products, accentColor, theme, cartEnabled, onAddToCart, config, pageUtms, catalogSlug, onWhatsAppClick }: {
  title: string
  products: CatalogProduct[]
  accentColor: string
  theme: CatalogTheme
  cartEnabled: boolean
  onAddToCart: (product: CatalogProduct) => void
  config: CatalogPublicData["config"]
  pageUtms: { source: string | null; medium: string | null; campaign: string | null }
  catalogSlug?: string
  onWhatsAppClick: (product: CatalogProduct) => void
}) {
  if (products.length === 0) return null

  const mobileCarousel = products.length > 2
  const desktopCarousel = products.length > 4

  const makeCard = (p: CatalogProduct) => (
    <ProductCard
      key={p.id}
      product={p}
      accentColor={accentColor}
      theme={theme}
      cartEnabled={cartEnabled}
      onAddToCart={onAddToCart}
      config={config}
      pageUtms={pageUtms}
      catalogSlug={catalogSlug}
      onWhatsAppClick={onWhatsAppClick}
    />
  )

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 style={{ color: theme.text, fontSize: theme.sectionTitleSize, fontWeight: theme.sectionTitleWeight }}>{title}</h2>
        <span style={{ color: theme.textMuted, fontSize: "11px" }}>{products.length} {products.length === 1 ? "item" : "itens"}</span>
      </div>

      {/* Desktop */}
      {desktopCarousel ? (
        <div className="hidden sm:flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {products.map((p) => (
            <div key={p.id} className="snap-start shrink-0 w-[220px]">{makeCard(p)}</div>
          ))}
        </div>
      ) : (
        <div className="hidden sm:grid grid-cols-3 md:grid-cols-4 gap-3">
          {products.map(makeCard)}
        </div>
      )}

      {/* Mobile */}
      {mobileCarousel ? (
        <div className="sm:hidden flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {products.map((p) => (
            <div key={p.id} className="snap-start shrink-0 w-[62vw] max-w-[220px]">{makeCard(p)}</div>
          ))}
        </div>
      ) : (
        <div className="sm:hidden grid grid-cols-2 gap-3">
          {products.map(makeCard)}
        </div>
      )}
    </section>
  )
}

function BannerSection({ config, theme }: { config: CatalogPublicData["config"]; theme: CatalogTheme }) {
  const [slide, setSlide] = useState(0)
  const slides = config.banner_slides ?? []
  const type = config.banner_type ?? "image"

  useEffect(() => {
    if (type !== "carousel" || slides.length < 2) return
    const t = setInterval(() => setSlide((s) => (s + 1) % slides.length), 4000)
    return () => clearInterval(t)
  }, [type, slides.length])

  const overlay = (
    <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(to bottom, transparent 50%, ${theme.bg})` }} />
  )

  if (type === "video" && config.banner_video_url) {
    return (
      <div className="relative w-full h-40 sm:h-52 md:h-72 overflow-hidden">
        <video src={config.banner_video_url} className="w-full h-full object-cover" muted loop autoPlay playsInline />
        {overlay}
      </div>
    )
  }

  if (type === "carousel" && slides.length > 0) {
    return (
      <div className="relative w-full h-40 sm:h-52 md:h-72 overflow-hidden">
        {slides.map((url, i) => (
          <div key={i} className="absolute inset-0 transition-opacity duration-700" style={{ opacity: i === slide ? 1 : 0 }}>
            <Image src={url} alt={`Slide ${i + 1}`} fill priority={i === 0} className="object-cover" />
          </div>
        ))}
        {overlay}
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
    const isGif = config.banner_url.toLowerCase().includes(".gif")
    const position = config.banner_position || "center center"
    return (
      <div className="relative w-full h-40 sm:h-52 md:h-72 overflow-hidden">
        {isGif ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={config.banner_url} alt="Banner" className="w-full h-full object-cover" style={{ objectPosition: position }} />
        ) : (
          <Image src={config.banner_url} alt="Banner" fill priority className="object-cover" style={{ objectPosition: position }} />
        )}
        {overlay}
      </div>
    )
  }

  return null
}

// ── Página principal ──────────────────────────────────────────

export function CatalogPage({ data, catalogSlug }: Props) {
  const { config, categories, products } = data
  const accent = config.accent_color || "#CAFF33"
  const templateKey = (config.template ?? "dark") as "dark" | "light" | "bold"
  const theme = CATALOG_THEMES[templateKey]
  const fontFamily = config.font_family || "DM Sans"
  const cartEnabled = config.cart_enabled ?? false
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const sectionsRef = useRef<Record<string, HTMLDivElement | null>>({})
  const [pageUtms, setPageUtms] = useState<{ source: string | null; medium: string | null; campaign: string | null }>({ source: null, medium: null, campaign: null })

  const cartKey = `cart_${config.workspace_id}`
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const saved = localStorage.getItem(cartKey)
      if (!saved) return []
      const parsed = JSON.parse(saved) as { items: CartItem[]; savedAt: number }
      if (Date.now() - parsed.savedAt > 7 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(cartKey)
        return []
      }
      return parsed.items
    } catch { return [] }
  })
  const [cartOpen, setCartOpen] = useState(false)
  const [showRecoveryBanner, setShowRecoveryBanner] = useState(false)
  const totalQty = cartItems.reduce((a, i) => a + i.quantity, 0)

  useEffect(() => {
    const recoveryEnabled = config.cart_recovery_enabled ?? true
    if (!cartEnabled || !recoveryEnabled) return
    try {
      const saved = localStorage.getItem(cartKey)
      if (saved) {
        const parsed = JSON.parse(saved) as { items: CartItem[]; savedAt: number }
        const isOldEnough = Date.now() - parsed.savedAt > 30 * 1000
        if (parsed.items.length > 0 && isOldEnough) {
          setShowRecoveryBanner(true)
          recordCatalogEvent({ workspace_id: config.workspace_id, event_type: "cart_recovery_shown" })
        }
      }
    } catch { /* ignora */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try {
      if (cartItems.length > 0) {
        localStorage.setItem(cartKey, JSON.stringify({ items: cartItems, savedAt: Date.now() }))
      } else {
        localStorage.removeItem(cartKey)
      }
    } catch { /* ignora */ }
  }, [cartItems, cartKey])

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

  function handleAddToCart(product: CatalogProduct) {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1 }]
    })
    recordCatalogEvent({ workspace_id: config.workspace_id, event_type: "add_to_cart", product_id: product.id, product_name: product.name })
    if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>).fbq) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).fbq("track", "AddToCart", { content_name: product.name, content_ids: [product.id] })
    }
  }

  function handleProductWhatsAppClick(product: CatalogProduct) {
    recordCatalogEvent({ workspace_id: config.workspace_id, event_type: "whatsapp_click", product_id: product.id, product_name: product.name })
  }

  function handleUpdateQty(id: string, delta: number) {
    setCartItems((prev) =>
      prev.map((i) => i.product.id === id ? { ...i, quantity: i.quantity + delta } : i).filter((i) => i.quantity > 0)
    )
  }

  function handleRemove(id: string) {
    setCartItems((prev) => prev.filter((i) => i.product.id !== id))
  }

  function handleCategoryClick(id: string) {
    if (activeCategoryId === id) {
      setActiveCategoryId(null)
    } else {
      setActiveCategoryId(id)
      sectionsRef.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  const uncategorized = products.filter((p) => !p.category_id)
  const displayCategories = activeCategoryId ? categories.filter((c) => c.id === activeCategoryId) : categories

  return (
    <>
      {/* Carrega fonte do Google Fonts se diferente da padrão */}
      {fontFamily !== "DM Sans" && (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link rel="stylesheet" href={getFontUrl(fontFamily)} />
      )}

      <div
        className="min-h-screen flex flex-col"
        style={{ background: theme.bg, fontFamily: `'${fontFamily}', sans-serif` }}
      >
        {/* Header */}
        <header className="sticky top-0 z-30" style={{ background: theme.headerBg, borderBottom: `1px solid ${theme.headerBorder}`, backdropFilter: "blur(12px)" }}>
          <div className="mx-auto max-w-4xl px-4 py-3 flex items-center gap-3">
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
              <p className="text-sm font-bold truncate" style={{ color: theme.text }}>{config.title}</p>
              {config.description && (
                <p className="text-xs truncate" style={{ color: theme.textSec }}>{config.description}</p>
              )}
            </div>
            {config.whatsapp_number && (
              <a
                href={whatsappUrl(config.whatsapp_number, config.cta_message || undefined, config, pageUtms, catalogSlug)}
                target={catalogSlug ? undefined : "_blank"}
                rel={catalogSlug ? undefined : "noopener noreferrer"}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold shrink-0 transition-opacity hover:opacity-80"
                style={{ backgroundColor: accent, color: "#0C0C0E", borderRadius: theme.btnRadius }}
              >
                <MessageCircle className="size-3.5" />
                Falar
              </a>
            )}
          </div>
        </header>

        {/* Banner de recuperação de carrinho */}
        {showRecoveryBanner && cartEnabled && cartItems.length > 0 && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div
              className="flex items-center gap-3 px-4 py-3 shadow-2xl"
              style={{ background: theme.surface, border: "1px solid #2ED573", borderRadius: theme.cardRadius, boxShadow: "0 8px 32px rgba(46,213,115,0.15)" }}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(46,213,115,0.12)" }}>
                <Bell className="size-4" style={{ color: "#2ED573" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold leading-snug" style={{ color: theme.text }}>
                  {config.cart_recovery_text || `Você deixou ${totalQty} ${totalQty === 1 ? "item" : "itens"} no carrinho`}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: theme.textSec }}>Seu carrinho foi salvo — continue de onde parou.</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setCartOpen(true)
                    setShowRecoveryBanner(false)
                    recordCatalogEvent({ workspace_id: config.workspace_id, event_type: "cart_recovery_click" })
                  }}
                  className="px-3 py-1.5 text-[11px] font-bold transition-opacity hover:opacity-80"
                  style={{ backgroundColor: "#2ED573", color: "#0C0C0E", borderRadius: theme.btnRadius }}
                >
                  Ver
                </button>
                <button onClick={() => setShowRecoveryBanner(false)} style={{ color: theme.textMuted }} className="hover:opacity-70 transition-opacity">
                  <X className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Banner */}
        <div className="w-full">
          <div className="mx-auto max-w-4xl">
            <BannerSection config={config} theme={theme} />
          </div>
        </div>

        {/* Conteúdo */}
        <div className="mx-auto w-full max-w-4xl flex-1 flex flex-col">
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
                    theme={theme}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Produtos */}
          <main className="flex-1 px-4 py-4 flex flex-col gap-8 pb-32">
            {displayCategories.map((cat) => {
              const catProducts = products.filter((p) => p.category_id === cat.id)
              return (
                <div key={cat.id} ref={(el) => { sectionsRef.current[cat.id] = el }}>
                  <ProductSection
                    title={`${cat.emoji} ${cat.name}`}
                    products={catProducts}
                    accentColor={accent}
                    theme={theme}
                    cartEnabled={cartEnabled}
                    onAddToCart={handleAddToCart}
                    config={config}
                    pageUtms={pageUtms}
                    catalogSlug={catalogSlug}
                    onWhatsAppClick={handleProductWhatsAppClick}
                  />
                </div>
              )
            })}

            {!activeCategoryId && uncategorized.length > 0 && (
              <ProductSection
                title="Outros produtos"
                products={uncategorized}
                accentColor={accent}
                theme={theme}
                cartEnabled={cartEnabled}
                onAddToCart={handleAddToCart}
                config={config}
                pageUtms={pageUtms}
                catalogSlug={catalogSlug}
                onWhatsAppClick={handleProductWhatsAppClick}
              />
            )}

            {products.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-20 text-center">
                <Tag className="size-10" style={{ color: theme.border }} />
                <p className="text-sm" style={{ color: theme.textMuted }}>Nenhum produto disponível no momento.</p>
              </div>
            )}
          </main>
        </div>

        {/* Botão flutuante WhatsApp */}
        {config.whatsapp_number && (!cartEnabled || totalQty === 0) && (
          <a
            href={whatsappUrl(config.whatsapp_number, config.cta_message || undefined, config, pageUtms, catalogSlug)}
            target={catalogSlug ? undefined : "_blank"}
            rel={catalogSlug ? undefined : "noopener noreferrer"}
            onClick={() => recordCatalogEvent({ workspace_id: config.workspace_id, event_type: "whatsapp_click" })}
            className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full px-4 py-3 shadow-lg text-sm font-bold transition-transform hover:scale-105 active:scale-95"
            style={{ backgroundColor: accent, color: "#0C0C0E" }}
          >
            <MessageCircle className="size-5" />
            Falar no WhatsApp
          </a>
        )}

        {/* Botão flutuante carrinho */}
        {cartEnabled && totalQty > 0 && (
          <button
            onClick={() => setCartOpen(true)}
            className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full px-4 py-3 shadow-lg text-sm font-bold transition-transform hover:scale-105 active:scale-95"
            style={{ backgroundColor: "#2ED573", color: "#0C0C0E" }}
          >
            <ShoppingCart className="size-5" />
            <span>{totalQty} {totalQty === 1 ? "item" : "itens"}</span>
          </button>
        )}

        {/* Drawer do carrinho */}
        {cartEnabled && cartOpen && totalQty > 0 && (
          <CartDrawer
            items={cartItems}
            accentColor={accent}
            theme={theme}
            config={config}
            pageUtms={pageUtms}
            catalogSlug={catalogSlug}
            onClose={() => setCartOpen(false)}
            onUpdateQty={handleUpdateQty}
            onRemove={handleRemove}
          />
        )}

        {/* Footer */}
        <footer className="py-4 text-center border-t" style={{ borderColor: theme.border }}>
          <p className="text-[10px]" style={{ color: theme.textMuted }}>
            Powered by{" "}
            <span style={{ color: accent }}>{brand.name}</span>
          </p>
        </footer>
      </div>
    </>
  )
}
