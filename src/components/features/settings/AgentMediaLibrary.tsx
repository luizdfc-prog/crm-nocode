"use client"

import { useState, useRef } from "react"
import { Loader2, Plus, Trash2, Image, Mic, Video, Paperclip, BookOpen, ChevronRight, ChevronLeft, X } from "lucide-react"
import { uploadAgentMedia } from "@/actions/agent"
import type { AgentMedia } from "@/types"
import { HelpTooltip } from "@/components/ui/HelpTooltip"

interface AgentMediaLibraryProps {
  mediaLibrary: AgentMedia[]
  onChange: (library: AgentMedia[]) => void
}

// ── Tour guiado ────────────────────────────────────────────────────────────────

const TOUR_STEPS = [
  {
    title: "O que é a Biblioteca de Mídias?",
    icon: BookOpen,
    content: (
      <div className="flex flex-col gap-2 text-xs text-pf-text-sec leading-relaxed">
        <p>Aqui você cadastra arquivos que o agente pode enviar automaticamente durante uma conversa no WhatsApp.</p>
        <p>Exemplos do que você pode cadastrar:</p>
        <ul className="flex flex-col gap-1 pl-3">
          <li className="flex gap-1.5"><span className="text-pf-accent mt-0.5">•</span><span><strong className="text-pf-text">Foto do produto</strong> — quando o lead quiser ver como é</span></li>
          <li className="flex gap-1.5"><span className="text-pf-accent mt-0.5">•</span><span><strong className="text-pf-text">Tabela de preços</strong> — quando perguntar sobre valores</span></li>
          <li className="flex gap-1.5"><span className="text-pf-accent mt-0.5">•</span><span><strong className="text-pf-text">Vídeo de demonstração</strong> — quando quiser ver o produto em uso</span></li>
          <li className="flex gap-1.5"><span className="text-pf-accent mt-0.5">•</span><span><strong className="text-pf-text">Áudio de apresentação</strong> — uma mensagem de voz gravada sua</span></li>
          <li className="flex gap-1.5"><span className="text-pf-accent mt-0.5">•</span><span><strong className="text-pf-text">Cardápio ou catálogo</strong> — para apresentar opções disponíveis</span></li>
        </ul>
      </div>
    ),
  },
  {
    title: "Como o agente decide quando enviar?",
    icon: BookOpen,
    content: (
      <div className="flex flex-col gap-2 text-xs text-pf-text-sec leading-relaxed">
        <p>Você escreve uma instrução dizendo <strong className="text-pf-text">em qual situação</strong> cada mídia deve ser enviada. O agente lê essa instrução e decide sozinho o momento certo.</p>
        <p className="text-pf-text font-medium">Exemplo real:</p>
        <div className="rounded-lg border border-pf-border bg-pf-surface px-3 py-2 flex flex-col gap-1">
          <p><span className="text-pf-text-muted">Nome:</span> <span className="text-pf-text">Tabela de Preços</span></p>
          <p><span className="text-pf-text-muted">Quando enviar:</span> <span className="text-pf-text">Quando o lead perguntar sobre preço, valor, quanto custa ou planos disponíveis</span></p>
        </div>
        <p>Quanto mais detalhada a instrução, mais preciso o agente será. Você pode cadastrar até <strong className="text-pf-text">20 mídias</strong> por workspace.</p>
      </div>
    ),
  },
  {
    title: "Formatos aceitos",
    icon: Paperclip,
    content: (
      <div className="flex flex-col gap-3 text-xs text-pf-text-sec leading-relaxed">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Image className="size-4 text-pf-cool shrink-0" />
            <div>
              <p className="font-medium text-pf-text">Imagem</p>
              <p>JPG, PNG, WebP — ideal para fotos de produtos, tabelas, cardápios</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Mic className="size-4 text-pf-warm shrink-0" />
            <div>
              <p className="font-medium text-pf-text">Áudio</p>
              <p>MP3, OGG, M4A — mensagens de voz gravadas, apresentações em áudio</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Video className="size-4 text-pf-accent shrink-0" />
            <div>
              <p className="font-medium text-pf-text">Vídeo</p>
              <p>MP4 — demonstrações, tutoriais, apresentações de produto</p>
            </div>
          </div>
        </div>
        <p className="text-pf-text-muted">Tamanho máximo: <strong className="text-pf-text">16 MB</strong> por arquivo.</p>
      </div>
    ),
  },
  {
    title: "Pronto para começar!",
    icon: Plus,
    content: (
      <div className="flex flex-col gap-2 text-xs text-pf-text-sec leading-relaxed">
        <p>Para adicionar sua primeira mídia:</p>
        <ol className="flex flex-col gap-1.5 pl-3">
          <li className="flex gap-1.5"><span className="text-pf-accent font-bold">1.</span><span>Clique em <strong className="text-pf-text">"Adicionar mídia"</strong> e escolha o arquivo</span></li>
          <li className="flex gap-1.5"><span className="text-pf-accent font-bold">2.</span><span>Dê um <strong className="text-pf-text">nome claro</strong> para identificar o arquivo</span></li>
          <li className="flex gap-1.5"><span className="text-pf-accent font-bold">3.</span><span>Escreva <strong className="text-pf-text">quando o agente deve enviar</strong> (quanto mais detalhe, melhor)</span></li>
          <li className="flex gap-1.5"><span className="text-pf-accent font-bold">4.</span><span>Clique em <strong className="text-pf-text">"Salvar configuração"</strong> no final da página</span></li>
        </ol>
        <p className="text-pf-text-muted">Na próxima conversa, o agente já usará as mídias cadastradas automaticamente.</p>
      </div>
    ),
  },
]

function TourBanner({ onDismiss }: { onDismiss: () => void }) {
  const [step, setStep] = useState(0)
  const current = TOUR_STEPS[step]
  const Icon = current.icon

  return (
    <div className="rounded-xl border border-pf-accent/30 bg-pf-accent/5 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-pf-accent" />
          <p className="text-sm font-semibold text-pf-text">{current.title}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded p-0.5 text-pf-text-muted hover:text-pf-text transition-colors"
          title="Fechar tour"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div>{current.content}</div>

      <div className="flex items-center justify-between">
        {/* Indicadores de passo */}
        <div className="flex gap-1">
          {TOUR_STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-4 bg-pf-accent" : "w-1.5 bg-pf-border hover:bg-pf-text-muted"
              }`}
            />
          ))}
        </div>

        {/* Navegação */}
        <div className="flex items-center gap-2">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1 rounded-lg border border-pf-border px-2.5 py-1 text-xs text-pf-text-sec hover:text-pf-text transition-colors"
            >
              <ChevronLeft className="size-3" />
              Anterior
            </button>
          )}
          {step < TOUR_STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1 rounded-lg bg-pf-accent px-2.5 py-1 text-xs font-semibold text-pf-bg transition-opacity hover:opacity-90"
            >
              Próximo
              <ChevronRight className="size-3" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onDismiss}
              className="flex items-center gap-1 rounded-lg bg-pf-accent px-2.5 py-1 text-xs font-semibold text-pf-bg transition-opacity hover:opacity-90"
            >
              Entendido!
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mediaIcon(type: AgentMedia["type"]) {
  if (type === "image") return <Image className="size-4 text-pf-cool" />
  if (type === "audio") return <Mic className="size-4 text-pf-warm" />
  return <Video className="size-4 text-pf-accent" />
}

function mediaLabel(type: AgentMedia["type"]) {
  if (type === "image") return "Imagem"
  if (type === "audio") return "Áudio"
  return "Vídeo"
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    || `midia-${Date.now()}`
}

// ── Componente principal ──────────────────────────────────────────────────────

export function AgentMediaLibrary({ mediaLibrary, onChange }: AgentMediaLibraryProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showTour, setShowTour] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setUploading(true)
    setUploadError(null)
    const fd = new FormData()
    fd.append("file", file)
    const result = await uploadAgentMedia(fd)
    setUploading(false)
    if (!result.success) {
      setUploadError(result.error)
      return
    }
    const baseName = file.name.replace(/\.[^.]+$/, "")
    const newMedia: AgentMedia = {
      id: slugify(baseName),
      name: baseName,
      description: "",
      url: result.url,
      type: result.type,
    }
    onChange([...mediaLibrary, newMedia])
    setShowTour(false)
  }

  function patchMedia(idx: number, patch: Partial<AgentMedia>) {
    onChange(mediaLibrary.map((m, i) => i === idx ? { ...m, ...patch } : m))
  }

  function removeMedia(idx: number) {
    onChange(mediaLibrary.filter((_, i) => i !== idx))
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-pf-text">Biblioteca de Mídias</p>
          <HelpTooltip width={300} content={
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-pf-text">Biblioteca de Mídias</p>
              <p>Arquivos cadastrados aqui podem ser enviados automaticamente pelo agente durante a conversa — sem nenhuma ação manual.</p>
              <p className="text-pf-text-muted">Clique em <strong className="text-pf-text">"?"</strong> ao lado de cada campo para dicas de preenchimento.</p>
            </div>
          } />
          {!showTour && (
            <button
              type="button"
              onClick={() => setShowTour(true)}
              className="flex items-center gap-1 rounded-md border border-pf-border px-2 py-0.5 text-[10px] text-pf-text-muted hover:text-pf-text transition-colors"
            >
              <BookOpen className="size-3" />
              Ver tutorial
            </button>
          )}
        </div>
        {mediaLibrary.length < 20 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-lg border border-pf-border bg-pf-surface-2 px-3 py-1.5 text-xs font-medium text-pf-text-sec transition-colors hover:border-pf-accent/50 hover:text-pf-text disabled:opacity-40"
          >
            {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            Adicionar mídia
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,audio/*,video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ""
        }}
      />

      {/* Tour guiado — aparece quando biblioteca está vazia ou quando reaberto */}
      {showTour && mediaLibrary.length === 0 && (
        <TourBanner onDismiss={() => setShowTour(false)} />
      )}

      {uploadError && <p className="text-xs text-pf-negative">{uploadError}</p>}

      {/* Área vazia sem tour */}
      {mediaLibrary.length === 0 && !uploading && !showTour && (
        <div
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-pf-border bg-pf-surface-2/50 px-4 py-6 transition-colors hover:border-pf-accent/50"
        >
          <Paperclip className="size-5 text-pf-text-muted" />
          <p className="text-xs text-pf-text-muted text-center">
            Clique para adicionar a primeira mídia
          </p>
        </div>
      )}

      {/* Lista de mídias */}
      {mediaLibrary.map((media, idx) => (
        <div key={media.id} className="flex flex-col gap-3 rounded-xl border border-pf-border bg-pf-surface-2 p-4">
          {/* Tipo + preview + remover */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {mediaIcon(media.type)}
              <span className="text-xs font-medium text-pf-text-sec">{mediaLabel(media.type)}</span>
              {media.type === "image" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={media.url} alt={media.name} className="size-8 rounded object-cover border border-pf-border" />
              )}
            </div>
            <button
              type="button"
              onClick={() => removeMedia(idx)}
              className="rounded p-1 text-pf-text-muted transition-colors hover:text-pf-negative"
              title="Remover mídia"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>

          {/* Nome */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-pf-text-sec">Nome da mídia</span>
              <HelpTooltip width={280} content={
                <div className="flex flex-col gap-1.5">
                  <p className="font-semibold text-pf-text">Nome da mídia</p>
                  <p>Use um nome descritivo e claro. O agente usa este nome internamente para identificar o arquivo.</p>
                  <p className="text-pf-text-muted">Bons exemplos:<br />
                    "Tabela de Preços", "Foto do Produto A",<br />
                    "Vídeo de Demonstração", "Cardápio Completo"
                  </p>
                </div>
              } />
            </div>
            <input
              type="text"
              value={media.name}
              maxLength={100}
              placeholder="Ex: Tabela de Preços"
              onChange={(e) => patchMedia(idx, { name: e.target.value, id: slugify(e.target.value) })}
              className="h-8 rounded-lg border border-pf-border bg-pf-surface-2 px-3 text-sm text-pf-text outline-none transition-colors focus:border-pf-accent/50"
            />
          </div>

          {/* Quando enviar */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-pf-text-sec">Quando o agente deve enviar</span>
              <HelpTooltip width={300} content={
                <div className="flex flex-col gap-2">
                  <p className="font-semibold text-pf-text">Instrução de envio</p>
                  <p>Descreva o momento da conversa em que faz sentido enviar este arquivo. Quanto mais específica a instrução, mais preciso o agente será.</p>
                  <p className="font-medium text-pf-text">Exemplos por tipo:</p>
                  <ul className="flex flex-col gap-1 text-pf-text-muted">
                    <li><strong className="text-pf-text">Tabela de preços:</strong> "Quando o lead perguntar sobre preço, valor, quanto custa ou planos"</li>
                    <li><strong className="text-pf-text">Foto do produto:</strong> "Quando o lead quiser ver o produto, pedir foto ou imagem"</li>
                    <li><strong className="text-pf-text">Vídeo demo:</strong> "Quando o lead quiser entender como funciona ou pedir uma demonstração"</li>
                    <li><strong className="text-pf-text">Áudio de boas-vindas:</strong> "Logo no início da conversa, após o lead se apresentar"</li>
                  </ul>
                </div>
              } />
            </div>
            <input
              type="text"
              value={media.description}
              maxLength={500}
              placeholder="Ex: Quando o lead perguntar sobre preço ou querer ver os planos"
              onChange={(e) => patchMedia(idx, { description: e.target.value })}
              className="h-8 rounded-lg border border-pf-border bg-pf-surface-2 px-3 text-sm text-pf-text outline-none transition-colors focus:border-pf-accent/50"
            />
          </div>
        </div>
      ))}

      {mediaLibrary.length > 0 && (
        <p className="text-xs text-pf-text-muted">
          {mediaLibrary.length}/20 mídias cadastradas — o agente decide sozinho quando enviar cada uma, com base na conversa.
        </p>
      )}
    </div>
  )
}
