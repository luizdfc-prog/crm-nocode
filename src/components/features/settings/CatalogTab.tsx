"use client"

import { useEffect, useState, useRef, lazy, Suspense } from "react"
import {
  Loader2, Plus, Trash2, Edit2, Check, X, ExternalLink,
  ImagePlus, GripVertical, Eye, EyeOff, Tag, HelpCircle,
  Images, Video, Image as ImageIcon, AlertTriangle, Zap
} from "lucide-react"
import Image from "next/image"
import {
  getCatalogConfig,
  upsertCatalogConfig,
  getCatalogCategories,
  createCatalogCategory,
  updateCatalogCategory,
  deleteCatalogCategory,
  getCatalogProducts,
  createCatalogProduct,
  updateCatalogProduct,
  deleteCatalogProduct,
} from "@/actions/catalog"
import type { CatalogConfig, CatalogCategory, CatalogProduct } from "@/types"
import { createClient } from "@/lib/supabase/client"
import { CatalogQuizSection } from "./CatalogQuizSection"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? ""

// ── Helpers ──────────────────────────────────────────────────

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

// ── Upload de arquivo ────────────────────────────────────────

async function uploadFile(file: File, path: string): Promise<string | null> {
  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from("catalog-images")
    .upload(path, file, { upsert: true })

  if (error) return null

  const { data: url } = supabase.storage.from("catalog-images").getPublicUrl(data.path)
  return url.publicUrl
}

// ── Tooltip ──────────────────────────────────────────────────

function Tooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="text-[var(--text-muted)] hover:text-[var(--text-sec)] transition-colors"
      >
        <HelpCircle className="size-3.5" />
      </button>
      {open && (
        <span
          className="absolute left-5 top-0 z-50 w-56 rounded-lg px-3 py-2 text-xs text-[var(--text-sec)] shadow-lg pointer-events-none"
          style={{ background: "#1A1A1E", border: "1px solid var(--border)" }}
        >
          {text}
        </span>
      )}
    </span>
  )
}

// ── Seção de Config Geral ────────────────────────────────────

function ConfigSection({ config, onSaved, onDirtyChange, saveRef }: {
  config: CatalogConfig | null
  onSaved: (c: CatalogConfig) => void
  onDirtyChange: (dirty: boolean) => void
  saveRef: React.MutableRefObject<(() => Promise<void>) | null>
}) {
  const [form, setForm] = useState<Partial<CatalogConfig>>(config ?? {
    slug: "", title: "", description: "", whatsapp_number: "", accent_color: "#CAFF33",
    enabled: false, banner_type: "image", banner_slides: [], banner_video_url: null,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [uploadingSlide, setUploadingSlide] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [connectedPhone, setConnectedPhone] = useState<string | null>(null)
  const bannerRef = useRef<HTMLInputElement>(null)
  const slideRef = useRef<HTMLInputElement>(null)

  // Busca número conectado ao WhatsApp via Baileys
  useEffect(() => {
    fetch("/api/whatsapp-qr/status")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const phone = data?.phone as string | undefined
        if (!phone) return
        // Remove +55 se presente, mantém só os dígitos
        const clean = phone.replace(/\D/g, "").replace(/^55/, "")
        setConnectedPhone(clean)
        // Pré-preenche automaticamente se o campo estiver vazio
        setForm((prev) => {
          if (!prev.whatsapp_number) return { ...prev, whatsapp_number: clean }
          return prev
        })
      })
      .catch(() => null)
  }, [])
  const videoRef = useRef<HTMLInputElement>(null)
  const logoRef = useRef<HTMLInputElement>(null)

  function patch(key: keyof CatalogConfig, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }))
    onDirtyChange(true)
  }

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingBanner(true)
    const url = await uploadFile(file, `banners/${Date.now()}-${file.name}`)
    if (url) patch("banner_url", url)
    setUploadingBanner(false)
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    const url = await uploadFile(file, `logos/${Date.now()}-${file.name}`)
    if (url) patch("logo_url", url)
    setUploadingLogo(false)
  }

  async function handleSlideUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploadingSlide(true)
    const urls = await Promise.all(files.map((f) => uploadFile(f, `banners/${Date.now()}-${f.name}`)))
    const valid = urls.filter(Boolean) as string[]
    patch("banner_slides", [...(form.banner_slides ?? []), ...valid])
    setUploadingSlide(false)
    e.target.value = ""
  }

  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingVideo(true)
    const url = await uploadFile(file, `videos/${Date.now()}-${file.name}`)
    if (url) patch("banner_video_url", url)
    setUploadingVideo(false)
  }

  function removeSlide(idx: number) {
    patch("banner_slides", (form.banner_slides ?? []).filter((_, i) => i !== idx))
  }

  async function handleSave() {
    if (!form.slug || !form.title) {
      setError("Slug e nome são obrigatórios")
      return
    }
    setSaving(true)
    setError(null)
    const res = await upsertCatalogConfig(form)
    setSaving(false)
    if (!res.success) { setError(res.error ?? "Erro"); return }
    onSaved(res.config!)
    onDirtyChange(false)
  }

  // Expõe handleSave para a tab pai acionar via barra sticky
  saveRef.current = handleSave

  const catalogUrl = form.slug ? `${APP_URL}/c/${form.slug}` : null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text)]">Configurações gerais</h3>
        {catalogUrl && (
          <a
            href={catalogUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-[var(--accent)] hover:opacity-80 transition-opacity"
          >
            Ver catálogo <ExternalLink className="size-3" />
          </a>
        )}
      </div>

      {/* Ativo/inativo */}
      <div className="flex items-center justify-between rounded-xl border border-[var(--border)] px-4 py-3">
        <div>
          <p className="text-sm font-medium text-[var(--text)]">Catálogo público</p>
          <p className="text-xs text-[var(--text-muted)]">Quando ativo, qualquer pessoa com o link pode acessar</p>
        </div>
        <button
          onClick={() => patch("enabled", !form.enabled)}
          className="w-11 h-6 rounded-full relative transition-colors shrink-0"
          style={{ backgroundColor: form.enabled ? "#2ED573" : "var(--surface-2)", border: "1px solid var(--border)" }}
        >
          <span
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
            style={{ left: form.enabled ? "calc(100% - 22px)" : "2px" }}
          />
        </button>
      </div>

      {/* Slug */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-[var(--text-sec)]">URL do catálogo</label>
        <div className="flex items-center rounded-xl border border-[var(--border)] overflow-hidden">
          <span className="px-3 py-2.5 text-xs text-[var(--text-muted)] bg-[var(--surface-2)] border-r border-[var(--border)] shrink-0">
            {APP_URL}/c/
          </span>
          <input
            value={form.slug ?? ""}
            onChange={(e) => patch("slug", slugify(e.target.value))}
            placeholder="minha-empresa"
            className="flex-1 bg-transparent px-3 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
          />
        </div>
      </div>

      {/* Nome e descrição */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[var(--text-sec)]">Nome do catálogo</label>
          <input
            value={form.title ?? ""}
            onChange={(e) => patch("title", e.target.value)}
            placeholder="Minha Empresa"
            className="rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[var(--text-sec)]">WhatsApp (com DDD)</label>
          <input
            value={form.whatsapp_number ?? ""}
            onChange={(e) => patch("whatsapp_number", e.target.value.replace(/\D/g, ""))}
            placeholder="11999990000"
            className="rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
          />
          {/* Aviso: número diferente do conectado */}
          {connectedPhone && form.whatsapp_number && form.whatsapp_number !== connectedPhone ? (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: "#FF6B3518", border: "1px solid #FF6B3540" }}>
              <AlertTriangle className="size-3.5 shrink-0 mt-0.5" style={{ color: "#FF6B35" }} />
              <span style={{ color: "#FF6B35" }}>
                O número conectado ao CRM é <strong>{connectedPhone}</strong>. Use o mesmo número para que os leads do catálogo entrem corretamente no CRM.
              </span>
            </div>
          ) : connectedPhone && form.whatsapp_number === connectedPhone ? (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "#2ED573" }}>
              <Zap className="size-3" />
              Mesmo número conectado ao CRM — perfeito!
            </div>
          ) : !connectedPhone ? (
            <p className="text-[10px]" style={{ color: "#FF6B35" }}>
              ⚠️ Nenhum WhatsApp conectado ao CRM. Conecte em <strong>Configurações → WhatsApp QR</strong> e use o mesmo número aqui.
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-[var(--text-sec)]">Descrição (opcional)</label>
        <input
          value={form.description ?? ""}
          onChange={(e) => patch("description", e.target.value)}
          placeholder="Ex: Produtos artesanais com entrega em todo o Brasil"
          className="rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
        />
      </div>

      {/* Cor de destaque */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-[var(--text-sec)]">Cor de destaque</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={form.accent_color ?? "#CAFF33"}
            onChange={(e) => patch("accent_color", e.target.value)}
            className="w-10 h-10 rounded-lg border border-[var(--border)] bg-transparent cursor-pointer"
          />
          <span className="text-sm font-mono text-[var(--text-muted)]">{form.accent_color ?? "#CAFF33"}</span>
        </div>
      </div>

      {/* Banner de capa */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-[var(--text-sec)]">Banner de capa</label>
          <Tooltip text="Escolha o tipo de banner exibido no topo do catálogo público. Formato ideal para mobile: 9:16 (vertical) ou 16:6 (faixa). Recomendamos imagens de até 2MB." />
        </div>

        {/* Seletor de tipo */}
        <div className="flex gap-2">
          {([
            { key: "image",    icon: ImageIcon, label: "Imagem única" },
            { key: "carousel", icon: Images,    label: "Carrossel"    },
            { key: "video",    icon: Video,     label: "Vídeo"        },
          ] as const).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => patch("banner_type", key)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border"
              style={{
                backgroundColor: form.banner_type === key ? "var(--accent)" : "var(--surface-2)",
                borderColor: form.banner_type === key ? "var(--accent)" : "var(--border)",
                color: form.banner_type === key ? "#0C0C0E" : "var(--text-sec)",
              }}
            >
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Imagem única */}
        {form.banner_type === "image" && (
          <div className="flex flex-col gap-1">
            <div
              className="relative rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--surface-2)] cursor-pointer hover:border-[var(--accent)] transition-colors"
              style={{ aspectRatio: "16/5" }}
              onClick={() => bannerRef.current?.click()}
            >
              {form.banner_url ? (
                <Image src={form.banner_url} alt="Banner" fill className="object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-1">
                  <ImagePlus className="size-5 text-[var(--text-muted)]" />
                  <span className="text-xs text-[var(--text-muted)]">Clique para adicionar</span>
                </div>
              )}
              {uploadingBanner && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="size-5 animate-spin text-white" />
                </div>
              )}
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">Formato ideal para mobile: 16:6 (ex: 1200×450px) · máx. 2MB · suporta GIF animado</p>
            <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
          </div>
        )}

        {/* Carrossel */}
        {form.banner_type === "carousel" && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 flex-wrap">
              {(form.banner_slides ?? []).map((url, idx) => (
                <div key={idx} className="relative w-28 h-16 rounded-lg overflow-hidden border border-[var(--border)] group">
                  <Image src={url} alt={`Slide ${idx + 1}`} fill className="object-cover" />
                  <button
                    onClick={() => removeSlide(idx)}
                    className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="size-3 text-white" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => slideRef.current?.click()}
                disabled={uploadingSlide}
                className="w-28 h-16 rounded-lg border border-dashed border-[var(--border)] flex flex-col items-center justify-center gap-1 hover:border-[var(--accent)] transition-colors"
              >
                {uploadingSlide
                  ? <Loader2 className="size-4 animate-spin text-[var(--text-muted)]" />
                  : <><ImagePlus className="size-4 text-[var(--text-muted)]" /><span className="text-[10px] text-[var(--text-muted)]">Adicionar</span></>
                }
              </button>
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">Formato ideal: 16:6 (ex: 1200×450px) · até 5 imagens · máx. 2MB cada</p>
            <input ref={slideRef} type="file" accept="image/*" multiple className="hidden" onChange={handleSlideUpload} />
          </div>
        )}

        {/* Vídeo */}
        {form.banner_type === "video" && (
          <div className="flex flex-col gap-1">
            <div
              className="relative rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--surface-2)] cursor-pointer hover:border-[var(--accent)] transition-colors"
              style={{ aspectRatio: "16/5" }}
              onClick={() => videoRef.current?.click()}
            >
              {form.banner_video_url ? (
                <video
                  src={form.banner_video_url}
                  className="w-full h-full object-cover"
                  muted
                  loop
                  autoPlay
                  playsInline
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-1">
                  <Video className="size-5 text-[var(--text-muted)]" />
                  <span className="text-xs text-[var(--text-muted)]">Clique para adicionar vídeo</span>
                </div>
              )}
              {uploadingVideo && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="size-5 animate-spin text-white" />
                </div>
              )}
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">Formato: MP4 ou WebM · Ideal 16:6 para desktop, 9:16 para mobile · máx. 20MB · sem som</p>
            <input ref={videoRef} type="file" accept="video/mp4,video/webm" className="hidden" onChange={handleVideoUpload} />
          </div>
        )}
      </div>

      {/* Logo */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-[var(--text-sec)]">Logo da empresa</label>
          <Tooltip text="Exibida no cabeçalho do catálogo. Use fundo transparente (PNG). Tamanho ideal: 200×200px." />
        </div>
        <div
          className="relative rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--surface-2)] cursor-pointer hover:border-[var(--accent)] transition-colors"
          style={{ aspectRatio: "16/5" }}
          onClick={() => logoRef.current?.click()}
        >
          {form.logo_url ? (
            <Image src={form.logo_url} alt="Logo" fill className="object-contain p-2" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-1">
              <ImagePlus className="size-5 text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-muted)]">Adicionar logo</span>
            </div>
          )}
          {uploadingLogo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 className="size-5 animate-spin text-white" />
            </div>
          )}
        </div>
        <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
      </div>

      {error && <p className="text-xs text-[var(--negative)]">{error}</p>}
    </div>
  )
}

// ── Seção de Categorias ──────────────────────────────────────

function CategoriesSection({
  categories,
  onChange,
}: {
  categories: CatalogCategory[]
  onChange: (cats: CatalogCategory[]) => void
}) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState("")
  const [newEmoji, setNewEmoji] = useState("📦")
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editEmoji, setEditEmoji] = useState("")

  async function handleAdd() {
    if (!newName.trim()) return
    setSaving(true)
    const res = await createCatalogCategory({ name: newName.trim(), emoji: newEmoji })
    setSaving(false)
    if (res.success && res.category) {
      onChange([...categories, res.category])
      setNewName("")
      setNewEmoji("📦")
      setAdding(false)
    }
  }

  async function handleUpdate(id: string) {
    const res = await updateCatalogCategory(id, { name: editName, emoji: editEmoji })
    if (res.success) {
      onChange(categories.map((c) => c.id === id ? { ...c, name: editName, emoji: editEmoji } : c))
      setEditId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover esta categoria? Os produtos não serão deletados.")) return
    const res = await deleteCatalogCategory(id)
    if (res.success) onChange(categories.filter((c) => c.id !== id))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text)]">Categorias</h3>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--text-sec)] border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
        >
          <Plus className="size-3.5" /> Nova
        </button>
      </div>

      {adding && (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--accent)] p-2 bg-[var(--surface-2)]">
          <div className="flex flex-col items-center">
            <input
              value={newEmoji}
              onChange={(e) => setNewEmoji(e.target.value)}
              className="w-10 text-center text-lg bg-[var(--surface)] border border-[var(--border)] rounded-lg outline-none cursor-pointer hover:border-[var(--accent)] transition-colors"
              maxLength={2}
              placeholder="😀"
              title="Clique e cole ou digite um emoji"
            />
          </div>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Nome da categoria"
            autoFocus
            className="flex-1 bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
          />
          <button onClick={handleAdd} disabled={saving} className="hover:opacity-80" style={{ color: "#CAFF33" }}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          </button>
          <button onClick={() => setAdding(false)} className="text-[var(--text-muted)] hover:opacity-80">
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-1">
        {categories.length === 0 && (
          <p className="text-xs text-[var(--text-muted)] py-4 text-center">Nenhuma categoria criada ainda</p>
        )}
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5 group hover:border-[var(--border)] transition-colors"
          >
            <GripVertical className="size-3.5 text-[var(--text-muted)] shrink-0 opacity-0 group-hover:opacity-100" />
            {editId === cat.id ? (
              <>
                <input
                  value={editEmoji}
                  onChange={(e) => setEditEmoji(e.target.value)}
                  className="w-10 text-center text-lg bg-[var(--surface)] border border-[var(--border)] rounded-lg outline-none hover:border-[var(--accent)] transition-colors"
                  maxLength={2}
                  placeholder="😀"
                  title="Clique e cole ou digite um emoji"
                />
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUpdate(cat.id)}
                  autoFocus
                  className="flex-1 bg-transparent text-sm text-[var(--text)] outline-none"
                />
                <button onClick={() => handleUpdate(cat.id)} style={{ color: "#CAFF33" }}><Check className="size-3.5" /></button>
                <button onClick={() => setEditId(null)} className="text-[var(--text-muted)]"><X className="size-3.5" /></button>
              </>
            ) : (
              <>
                <span className="text-lg">{cat.emoji}</span>
                <span className="flex-1 text-sm text-[var(--text)]">{cat.name}</span>
                <button
                  onClick={() => { setEditId(cat.id); setEditName(cat.name); setEditEmoji(cat.emoji) }}
                  className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--text)] transition-opacity"
                >
                  <Edit2 className="size-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(cat.id)}
                  className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--negative)] transition-opacity"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Dropdown de categoria (evita select nativo branco no Windows) ─────────

function CategorySelect({ categories, value, onChange }: {
  categories: CatalogCategory[]
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = categories.find((c) => c.id === value)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <div className="flex flex-col gap-1.5" ref={ref}>
      <label className="text-xs font-medium text-[var(--text-sec)]">Categoria</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition-colors text-left"
          style={{
            background: "#141416",
            borderColor: open ? "var(--accent)" : "var(--border)",
            color: selected ? "var(--text)" : "var(--text-muted)",
          }}
        >
          <span>{selected ? `${selected.emoji} ${selected.name}` : "Sem categoria"}</span>
          <svg className={`size-4 text-[var(--text-muted)] transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
        </button>

        {open && (
          <div
            className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border overflow-hidden shadow-xl"
            style={{ background: "#141416", borderColor: "var(--border)" }}
          >
            {[{ id: "", emoji: "", name: "Sem categoria" }, ...categories].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { onChange(c.id); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors hover:bg-[var(--surface-2)]"
                style={{ color: value === c.id ? "var(--accent)" : "var(--text)" }}
              >
                {c.emoji && <span>{c.emoji}</span>}
                <span>{c.name}</span>
                {value === c.id && <Check className="size-3.5 ml-auto" style={{ color: "var(--accent)" }} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Modal de produto ─────────────────────────────────────────

interface ProductFormState {
  name: string
  description: string
  price: string
  badge: string
  active: boolean
  category_id: string
  image_url: string
}

function ProductModal({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: CatalogProduct | null
  categories: CatalogCategory[]
  onClose: () => void
  onSaved: (p: CatalogProduct) => void
}) {
  const [form, setForm] = useState<ProductFormState>({
    name: product?.name ?? "",
    description: product?.description ?? "",
    price: product?.price != null ? String(product.price) : "",
    badge: product?.badge ?? "",
    active: product?.active ?? true,
    category_id: product?.category_id ?? "",
    image_url: product?.image_url ?? "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const imgRef = useRef<HTMLInputElement>(null)

  function patch(key: keyof ProductFormState, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const url = await uploadFile(file, `products/${Date.now()}-${file.name}`)
    if (url) patch("image_url", url)
    setUploading(false)
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Nome é obrigatório"); return }
    setSaving(true)
    setError(null)

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: form.price ? parseFloat(form.price.replace(",", ".")) : null,
      badge: form.badge.trim() || null,
      active: form.active,
      category_id: form.category_id || null,
      image_url: form.image_url || null,
    }

    let res
    if (product) {
      res = await updateCatalogProduct(product.id, payload)
      if (res.success) {
        const cat = categories.find((c) => c.id === payload.category_id) ?? null
        onSaved({ ...product, ...payload, category: cat ?? undefined })
      }
    } else {
      res = await createCatalogProduct(payload as Parameters<typeof createCatalogProduct>[0])
      if (res.success && res.product) onSaved(res.product)
    }

    setSaving(false)
    if (!res.success) setError(res.error ?? "Erro ao salvar")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70">
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--border)] flex flex-col gap-4 p-5 max-h-[90vh] overflow-y-auto"
        style={{ background: "#141416" }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text)]">{product ? "Editar produto" : "Novo produto"}</h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text)]"><X className="size-4" /></button>
        </div>

        {/* Imagem */}
        <div
          className="relative rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--surface-2)] cursor-pointer hover:border-[var(--accent)] transition-colors"
          style={{ aspectRatio: "16/9" }}
          onClick={() => imgRef.current?.click()}
        >
          {form.image_url ? (
            <Image src={form.image_url} alt="Produto" fill className="object-cover" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <ImagePlus className="size-6 text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-muted)]">Clique para adicionar imagem</span>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 className="size-5 animate-spin text-white" />
            </div>
          )}
        </div>
        <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

        {/* Nome */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[var(--text-sec)]">Nome do produto *</label>
          <input
            value={form.name}
            onChange={(e) => patch("name", e.target.value)}
            placeholder="Ex: Camiseta Básica"
            className="rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
          />
        </div>

        {/* Descrição */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[var(--text-sec)]">Descrição</label>
          <textarea
            value={form.description}
            onChange={(e) => patch("description", e.target.value)}
            placeholder="Detalhes do produto..."
            rows={2}
            className="rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] resize-none"
          />
        </div>

        {/* Preço e Badge */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-sec)]">Preço (opcional)</label>
            <input
              value={form.price}
              onChange={(e) => patch("price", e.target.value)}
              placeholder="Ex: 49,90"
              className="rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-sec)]">Badge</label>
            <input
              value={form.badge}
              onChange={(e) => patch("badge", e.target.value)}
              placeholder="Ex: Novidade"
              className="rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
            />
          </div>
        </div>

        {/* Categoria */}
        <CategorySelect
          categories={categories}
          value={form.category_id}
          onChange={(v) => patch("category_id", v)}
        />

        {/* Ativo */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--text-sec)]">Visível no catálogo</span>
          <button
            onClick={() => patch("active", !form.active)}
            className="w-10 h-5 rounded-full relative transition-colors shrink-0"
            style={{ backgroundColor: form.active ? "#2ED573" : "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            <span
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
              style={{ left: form.active ? "calc(100% - 18px)" : "2px" }}
            />
          </button>
        </div>

        {error && <p className="text-xs text-[var(--negative)]">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: "var(--accent)" }}
          >
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            {saving ? "Salvando..." : "Salvar produto"}
          </button>
          <button onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm text-[var(--text-sec)] border border-[var(--border)] hover:border-[var(--text-sec)] transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Seção de Produtos ────────────────────────────────────────

function ProductsSection({ categories }: { categories: CatalogCategory[] }) {
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [modalProduct, setModalProduct] = useState<CatalogProduct | null | "new">(null)

  useEffect(() => {
    getCatalogProducts().then((p) => { setProducts(p); setLoading(false) })
  }, [])

  async function handleToggleActive(p: CatalogProduct) {
    await updateCatalogProduct(p.id, { active: !p.active })
    setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, active: !x.active } : x))
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este produto?")) return
    await deleteCatalogProduct(id)
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  function handleSaved(saved: CatalogProduct) {
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [...prev, saved]
    })
    setModalProduct(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text)]">Produtos</h3>
        <button
          onClick={() => setModalProduct("new")}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-black transition-opacity hover:opacity-80"
          style={{ backgroundColor: "var(--accent)" }}
        >
          <Plus className="size-3.5" /> Novo produto
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-[var(--text-muted)]" /></div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Tag className="size-8 text-[var(--border)]" />
          <p className="text-sm text-[var(--text-muted)]">Nenhum produto criado ainda</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {products.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-[var(--border)] px-3 py-2.5 group hover:border-[var(--border)] transition-colors"
            >
              {/* Imagem miniatura */}
              <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-[var(--surface-2)] shrink-0">
                {p.image_url ? (
                  <Image src={p.image_url} alt={p.name} fill className="object-cover" />
                ) : (
                  <span className="flex items-center justify-center h-full text-lg">📦</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text)] truncate">{p.name}</p>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  {p.category?.name ?? "Sem categoria"}
                  {p.price != null ? ` · R$ ${p.price.toFixed(2)}` : ""}
                </p>
              </div>

              {/* Status */}
              <button
                onClick={() => handleToggleActive(p)}
                className="shrink-0 transition-opacity hover:opacity-80"
                title={p.active ? "Visível" : "Oculto"}
              >
                {p.active
                  ? <Eye className="size-4 text-[#2ED573]" />
                  : <EyeOff className="size-4 text-[var(--text-muted)]" />
                }
              </button>

              <button
                onClick={() => setModalProduct(p)}
                className="shrink-0 opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--text)] transition-opacity"
              >
                <Edit2 className="size-4" />
              </button>
              <button
                onClick={() => handleDelete(p.id)}
                className="shrink-0 opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--negative)] transition-opacity"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {modalProduct !== null && (
        <ProductModal
          product={modalProduct === "new" ? null : modalProduct}
          categories={categories}
          onClose={() => setModalProduct(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

// ── Tab principal ────────────────────────────────────────────

export function CatalogTab() {
  const [config, setConfig] = useState<CatalogConfig | null>(null)
  const [categories, setCategories] = useState<CatalogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const saveRef = useRef<(() => Promise<void>) | null>(null)

  useEffect(() => {
    Promise.all([getCatalogConfig(), getCatalogCategories()]).then(([cfg, cats]) => {
      setConfig(cfg)
      setCategories(cats)
      setLoading(false)
    })
  }, [])

  async function handleSave() {
    if (!saveRef.current) return
    setSaving(true)
    await saveRef.current()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-5 animate-spin text-[var(--text-muted)]" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Barra sticky de salvar — aparece quando há alterações */}
      {dirty && (
        <div
          className="sticky top-0 z-20 flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 -mx-1"
          style={{ background: "#1A1A1E", border: "1px solid var(--accent)" }}
        >
          <span className="text-xs text-[var(--text-sec)]">Você tem alterações não salvas</span>
          <div className="flex items-center gap-3">
            {saved && <span className="text-xs text-[#2ED573]">✓ Salvo</span>}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: "var(--accent)" }}
            >
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      <ConfigSection
        config={config}
        onSaved={setConfig}
        onDirtyChange={setDirty}
        saveRef={saveRef}
      />
      <div className="border-t border-[var(--border)]" />
      <CategoriesSection categories={categories} onChange={setCategories} />
      <div className="border-t border-[var(--border)]" />
      <ProductsSection categories={categories} />
      <div className="border-t border-[var(--border)]" />
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-[var(--text)]">Quiz de Qualificação</h2>
        <p className="text-xs text-[var(--text-muted)]">
          Pré-qualifique leads antes de abrirem o catálogo. Opcional — configure conforme sua necessidade.
        </p>
        <div className="mt-2">
          <CatalogQuizSection />
        </div>
      </div>
    </div>
  )
}
