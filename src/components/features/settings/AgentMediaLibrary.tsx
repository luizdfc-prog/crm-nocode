"use client"

import { useState, useRef } from "react"
import { Loader2, Plus, Trash2, Image, Mic, Video, Paperclip } from "lucide-react"
import { uploadAgentMedia } from "@/actions/agent"
import type { AgentMedia } from "@/types"
import { HelpTooltip } from "@/components/ui/HelpTooltip"

interface AgentMediaLibraryProps {
  mediaLibrary: AgentMedia[]
  onChange: (library: AgentMedia[]) => void
}

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

export function AgentMediaLibrary({ mediaLibrary, onChange }: AgentMediaLibraryProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
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
  }

  function patchMedia(idx: number, patch: Partial<AgentMedia>) {
    onChange(mediaLibrary.map((m, i) => i === idx ? { ...m, ...patch } : m))
  }

  function removeMedia(idx: number) {
    onChange(mediaLibrary.filter((_, i) => i !== idx))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-pf-text">Biblioteca de Mídias</p>
          <HelpTooltip width={320} content={
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-pf-text">Como funciona?</p>
              <p>Cadastre aqui arquivos que o agente pode enviar automaticamente durante a conversa — fotos de produtos, tabelas de preços, vídeos de demonstração, áudios de apresentação.</p>
              <p>Para cada mídia, descreva <strong>quando o agente deve enviá-la</strong>. O agente decide sozinho o momento certo, com base na conversa.</p>
              <p className="font-medium text-pf-text">Exemplo:</p>
              <p className="text-pf-text-muted">Nome: "Tabela de Preços"<br />Quando enviar: "Quando o lead perguntar sobre valores, planos ou preços"</p>
            </div>
          } />
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

      {uploadError && <p className="text-xs text-pf-negative">{uploadError}</p>}

      {mediaLibrary.length === 0 && !uploading && (
        <div
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-pf-border bg-pf-surface-2/50 px-4 py-6 transition-colors hover:border-pf-accent/50"
        >
          <Paperclip className="size-5 text-pf-text-muted" />
          <p className="text-xs text-pf-text-muted text-center">
            Nenhuma mídia cadastrada. Clique para adicionar imagens, áudios ou vídeos.
          </p>
        </div>
      )}

      {mediaLibrary.map((media, idx) => (
        <div key={media.id} className="flex flex-col gap-3 rounded-xl border border-pf-border bg-pf-surface-2 p-4">
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

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-pf-text-sec">Nome da mídia</span>
            <input
              type="text"
              value={media.name}
              maxLength={100}
              placeholder="Ex: Tabela de Preços"
              onChange={(e) => patchMedia(idx, { name: e.target.value, id: slugify(e.target.value) })}
              className="h-8 rounded-lg border border-pf-border bg-pf-surface-2 px-3 text-sm text-pf-text outline-none transition-colors focus:border-pf-accent/50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-pf-text-sec">Quando o agente deve enviar</span>
              <HelpTooltip width={260} content={
                <div className="flex flex-col gap-1.5">
                  <p className="font-semibold text-pf-text">Instrução para o agente</p>
                  <p>Descreva a situação da conversa em que faz sentido enviar esta mídia.</p>
                  <p className="text-pf-text-muted">Exemplo: "Quando o lead perguntar sobre preços ou planos disponíveis"</p>
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
          {mediaLibrary.length}/20 mídias cadastradas. O agente usará o nome e a descrição de cada uma para decidir quando enviar.
        </p>
      )}
    </div>
  )
}
