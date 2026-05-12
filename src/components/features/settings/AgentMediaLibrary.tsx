"use client"

import { useState, useRef } from "react"
import { Loader2, Plus, Trash2, Image, Mic, Video, Paperclip, BookOpen, ChevronRight, ChevronLeft, X, Pencil, ChevronDown } from "lucide-react"
import { uploadAgentMedia } from "@/actions/agent"
import type { AgentMedia, AgentMediaFile } from "@/types"
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
        <p>Aqui você cadastra grupos de arquivos que o agente pode enviar automaticamente durante uma conversa no WhatsApp.</p>
        <p>Exemplos do que você pode cadastrar:</p>
        <ul className="flex flex-col gap-1 pl-3">
          <li className="flex gap-1.5"><span className="text-pf-accent mt-0.5">•</span><span><strong className="text-pf-text">Modelos de piscinas</strong> — várias fotos enviadas de uma vez</span></li>
          <li className="flex gap-1.5"><span className="text-pf-accent mt-0.5">•</span><span><strong className="text-pf-text">Tabela de preços</strong> — quando perguntar sobre valores</span></li>
          <li className="flex gap-1.5"><span className="text-pf-accent mt-0.5">•</span><span><strong className="text-pf-text">Sobre a empresa</strong> — vídeos institucionais</span></li>
          <li className="flex gap-1.5"><span className="text-pf-accent mt-0.5">•</span><span><strong className="text-pf-text">Áudio de apresentação</strong> — uma mensagem de voz gravada</span></li>
        </ul>
      </div>
    ),
  },
  {
    title: "Grupos com múltiplos arquivos",
    icon: BookOpen,
    content: (
      <div className="flex flex-col gap-2 text-xs text-pf-text-sec leading-relaxed">
        <p>Cada item da biblioteca é um <strong className="text-pf-text">grupo</strong>. Você pode adicionar vários arquivos em um mesmo grupo — o agente envia <strong className="text-pf-text">todos de uma vez</strong> quando o gatilho for acionado.</p>
        <div className="rounded-lg border border-pf-border bg-pf-surface px-3 py-2 flex flex-col gap-1">
          <p><span className="text-pf-text-muted">Grupo:</span> <span className="text-pf-text">Modelos de Piscinas</span></p>
          <p><span className="text-pf-text-muted">Arquivos:</span> <span className="text-pf-text">piscina01.jpg, piscina02.jpg, piscina03.jpg</span></p>
          <p><span className="text-pf-text-muted">Quando enviar:</span> <span className="text-pf-text">Quando o lead quiser ver os modelos</span></p>
        </div>
        <p>O agente envia as 3 fotos em sequência automaticamente.</p>
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
              <p>JPG, PNG, WebP — fotos de produtos, tabelas, cardápios</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Mic className="size-4 text-pf-warm shrink-0" />
            <div>
              <p className="font-medium text-pf-text">Áudio</p>
              <p>MP3, OGG, M4A — mensagens de voz, apresentações em áudio</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Video className="size-4 text-pf-accent shrink-0" />
            <div>
              <p className="font-medium text-pf-text">Vídeo</p>
              <p>MP4 — demonstrações, tutoriais, apresentações</p>
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
        <ol className="flex flex-col gap-1.5 pl-3">
          <li className="flex gap-1.5"><span className="text-pf-accent font-bold">1.</span><span>Clique em <strong className="text-pf-text">"Novo grupo"</strong> para criar um grupo</span></li>
          <li className="flex gap-1.5"><span className="text-pf-accent font-bold">2.</span><span>Dê um <strong className="text-pf-text">nome</strong> ao grupo (ex: "Modelos de Piscinas")</span></li>
          <li className="flex gap-1.5"><span className="text-pf-accent font-bold">3.</span><span>Clique em <strong className="text-pf-text">"+ Adicionar arquivo"</strong> para incluir quantos arquivos quiser</span></li>
          <li className="flex gap-1.5"><span className="text-pf-accent font-bold">4.</span><span>Escreva <strong className="text-pf-text">quando o agente deve enviar</strong> o grupo</span></li>
          <li className="flex gap-1.5"><span className="text-pf-accent font-bold">5.</span><span>Clique em <strong className="text-pf-text">"Salvar configuração"</strong></span></li>
        </ol>
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
        <button type="button" onClick={onDismiss} className="rounded p-0.5 text-pf-text-muted hover:text-pf-text transition-colors">
          <X className="size-3.5" />
        </button>
      </div>
      <div>{current.content}</div>
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {TOUR_STEPS.map((_, i) => (
            <button key={i} type="button" onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all ${i === step ? "w-4 bg-pf-accent" : "w-1.5 bg-pf-border hover:bg-pf-text-muted"}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)}
              className="flex items-center gap-1 rounded-lg border border-pf-border px-2.5 py-1 text-xs text-pf-text-sec hover:text-pf-text transition-colors">
              <ChevronLeft className="size-3" /> Anterior
            </button>
          )}
          {step < TOUR_STEPS.length - 1 ? (
            <button type="button" onClick={() => setStep(step + 1)}
              className="flex items-center gap-1 rounded-lg bg-pf-accent px-2.5 py-1 text-xs font-semibold text-pf-bg transition-opacity hover:opacity-90">
              Próximo <ChevronRight className="size-3" />
            </button>
          ) : (
            <button type="button" onClick={onDismiss}
              className="flex items-center gap-1 rounded-lg bg-pf-accent px-2.5 py-1 text-xs font-semibold text-pf-bg transition-opacity hover:opacity-90">
              Entendido!
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fileIcon(type: AgentMediaFile["type"]) {
  if (type === "image") return <Image className="size-3.5 text-pf-cool" />
  if (type === "audio") return <Mic className="size-3.5 text-pf-warm" />
  return <Video className="size-3.5 text-pf-accent" />
}

function slugify(name: string) {
  return name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `midia-${Date.now()}`
}

function normalizeMedia(media: AgentMedia): AgentMedia {
  // Garante retrocompatibilidade: se não tem files[], cria a partir de url/type
  if (!media.files || media.files.length === 0) {
    return { ...media, files: media.url ? [{ url: media.url, type: media.type }] : [] }
  }
  return media
}

// ── Item de arquivo dentro de um grupo ───────────────────────────────────────

function FileItem({ file, onRemove }: { file: AgentMediaFile; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-pf-border bg-pf-surface p-2">
      {file.type === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={file.url} alt="" className="size-14 rounded-md object-cover border border-pf-border shrink-0" />
      ) : (
        <div className="flex size-14 shrink-0 items-center justify-center rounded-md border border-pf-border bg-pf-surface-2">
          {fileIcon(file.type)}
        </div>
      )}
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        {fileIcon(file.type)}
        <span className="text-xs text-pf-text truncate">{file.filename ?? file.url.split("/").pop()}</span>
        <span className="text-[10px] text-pf-text-muted capitalize">{file.type}</span>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="flex items-center gap-1 rounded-lg border border-pf-border px-2 py-1 text-xs text-pf-text-muted transition-colors hover:border-pf-negative/50 hover:text-pf-negative shrink-0"
        title="Remover arquivo"
      >
        <Trash2 className="size-3" />
        Excluir
      </button>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export function AgentMediaLibrary({ mediaLibrary, onChange }: AgentMediaLibraryProps) {
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showTour, setShowTour] = useState(true)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadingForIdx = useRef<number | null>(null)

  const normalized = mediaLibrary.map(normalizeMedia)

  function addGroup() {
    const newGroup: AgentMedia = {
      id: `grupo-${Date.now()}`,
      name: "",
      description: "",
      url: "",
      type: "image",
      files: [],
    }
    onChange([...normalized, newGroup])
    setShowTour(false)
    setExpandedIdx(normalized.length)
  }

  function patchGroup(idx: number, patch: Partial<AgentMedia>) {
    onChange(normalized.map((m, i) => i === idx ? { ...m, ...patch } : m))
  }

  function removeGroup(idx: number) {
    onChange(normalized.filter((_, i) => i !== idx))
  }

  function triggerFileInput(idx: number) {
    uploadingForIdx.current = idx
    inputRef.current?.click()
  }

  async function handleFile(file: File, groupIdx: number) {
    setUploadingIdx(groupIdx)
    setUploadError(null)
    const fd = new FormData()
    fd.append("file", file)
    const result = await uploadAgentMedia(fd)
    setUploadingIdx(null)
    if (!result.success) {
      setUploadError(result.error)
      return
    }
    const newFile: AgentMediaFile = { url: result.url, type: result.type, filename: file.name }
    const group = normalized[groupIdx]
    const updatedFiles = [...(group.files ?? []), newFile]
    // url/type do grupo = primeiro arquivo (retrocompatibilidade)
    const firstFile = updatedFiles[0]
    patchGroup(groupIdx, { files: updatedFiles, url: firstFile.url, type: firstFile.type })
  }

  const totalFiles = normalized.reduce((s, g) => s + (g.files?.length ?? 0), 0)

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-pf-text">Biblioteca de Mídias</p>
          <HelpTooltip width={300} content={
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-pf-text">Biblioteca de Mídias</p>
              <p>Organize arquivos em grupos. Cada grupo tem um gatilho — quando acionado, o agente envia todos os arquivos do grupo em sequência.</p>
            </div>
          } />
          {!showTour && (
            <button type="button" onClick={() => setShowTour(true)}
              className="flex items-center gap-1 rounded-md border border-pf-border px-2 py-0.5 text-[10px] text-pf-text-muted hover:text-pf-text transition-colors">
              <BookOpen className="size-3" /> Ver tutorial
            </button>
          )}
        </div>
        {normalized.length < 20 && (
          <button type="button" onClick={addGroup}
            className="flex items-center gap-1.5 rounded-lg border border-pf-border bg-pf-surface-2 px-3 py-1.5 text-xs font-medium text-pf-text-sec transition-colors hover:border-pf-accent/50 hover:text-pf-text">
            <Plus className="size-3.5" /> Novo grupo
          </button>
        )}
      </div>

      {/* Input de arquivo oculto — compartilhado */}
      <input ref={inputRef} type="file" accept="image/*,audio/*,video/*" className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          const idx = uploadingForIdx.current
          if (file && idx !== null) handleFile(file, idx)
          e.target.value = ""
        }}
      />

      {showTour && normalized.length === 0 && <TourBanner onDismiss={() => setShowTour(false)} />}
      {uploadError && <p className="text-xs text-pf-negative">{uploadError}</p>}

      {normalized.length === 0 && !showTour && (
        <div onClick={addGroup}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-pf-border bg-pf-surface-2/50 px-4 py-6 transition-colors hover:border-pf-accent/50">
          <Paperclip className="size-5 text-pf-text-muted" />
          <p className="text-xs text-pf-text-muted text-center">Clique para criar o primeiro grupo de mídias</p>
        </div>
      )}

      {/* Grupos */}
      {normalized.map((group, idx) => {
        const isExpanded = expandedIdx === idx
        const fileCount = group.files?.length ?? 0

        return (
          <div key={group.id} className="flex flex-col rounded-xl border border-pf-border bg-pf-surface-2 overflow-hidden">
            {/* Cabeçalho clicável — sempre visível */}
            <div className="flex items-center justify-between gap-2 px-4 py-3">
              <button
                type="button"
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                className="flex flex-1 items-center gap-3 min-w-0 text-left"
              >
                <ChevronDown className={`size-3.5 text-pf-text-muted shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-medium text-pf-text truncate">
                    {group.name || <span className="text-pf-text-muted italic">Sem nome</span>}
                  </span>
                  <span className="text-[10px] text-pf-text-muted">
                    {fileCount === 0 ? "Nenhum arquivo" : `${fileCount} arquivo${fileCount !== 1 ? "s" : ""}`}
                    {group.description ? ` · ${group.description.slice(0, 40)}${group.description.length > 40 ? "…" : ""}` : ""}
                  </span>
                </div>
              </button>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                  className="flex items-center gap-1 rounded-lg border border-pf-border px-2.5 py-1 text-xs text-pf-text-sec transition-colors hover:border-pf-accent/50 hover:text-pf-text"
                >
                  <Pencil className="size-3" />
                  {isExpanded ? "Fechar" : "Editar"}
                </button>
                <button type="button" onClick={() => { removeGroup(idx); if (expandedIdx === idx) setExpandedIdx(null) }}
                  className="rounded p-1.5 text-pf-text-muted transition-colors hover:text-pf-negative" title="Remover grupo">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>

            {/* Prévia de arquivos quando colapsado */}
            {!isExpanded && fileCount > 0 && (
              <div className="flex items-center gap-1.5 border-t border-pf-border px-4 py-2 flex-wrap">
                {group.files!.slice(0, 6).map((file, fIdx) => (
                  <div key={fIdx} className="flex items-center gap-1 rounded-md border border-pf-border bg-pf-surface px-2 py-1">
                    {fileIcon(file.type)}
                    {file.type === "image" && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={file.url} alt="" className="size-5 rounded object-cover border border-pf-border shrink-0" />
                    )}
                    <span className="text-[10px] text-pf-text-muted truncate max-w-[80px]">{file.filename ?? file.url.split("/").pop()}</span>
                  </div>
                ))}
                {fileCount > 6 && (
                  <span className="text-[10px] text-pf-text-muted">+{fileCount - 6} mais</span>
                )}
              </div>
            )}

            {/* Formulário de edição — visível apenas quando expandido */}
            {isExpanded && (
              <div className="flex flex-col gap-3 border-t border-pf-border px-4 py-4">
                {/* Nome do grupo */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-pf-text-sec">Nome do grupo</span>
                    <HelpTooltip width={260} content={
                      <div className="flex flex-col gap-1.5">
                        <p className="font-semibold text-pf-text">Nome do grupo</p>
                        <p>Ex: "Modelos de Piscinas", "Sobre a Empresa", "Tabela de Preços"</p>
                      </div>
                    } />
                  </div>
                  <input type="text" value={group.name} maxLength={100}
                    placeholder="Ex: Modelos de Piscinas"
                    onChange={(e) => patchGroup(idx, { name: e.target.value, id: slugify(e.target.value) })}
                    className="h-8 rounded-lg border border-pf-border bg-pf-surface px-3 text-sm text-pf-text outline-none transition-colors focus:border-pf-accent/50"
                  />
                </div>

                {/* Arquivos do grupo */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-pf-text-sec">Arquivos</span>
                    <button type="button" onClick={() => triggerFileInput(idx)} disabled={uploadingIdx === idx}
                      className="flex items-center gap-1 rounded-lg border border-pf-border px-2.5 py-1 text-xs text-pf-text-sec transition-colors hover:border-pf-accent/50 hover:text-pf-text disabled:opacity-40">
                      {uploadingIdx === idx ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                      Adicionar arquivo
                    </button>
                  </div>

                  {fileCount === 0 ? (
                    <div onClick={() => triggerFileInput(idx)}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-pf-border px-3 py-2.5 transition-colors hover:border-pf-accent/40">
                      <Paperclip className="size-3.5 text-pf-text-muted" />
                      <p className="text-xs text-pf-text-muted">Clique para adicionar arquivos a este grupo</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {group.files!.map((file, fIdx) => (
                        <FileItem key={`${file.url}-${fIdx}`} file={file}
                          onRemove={() => {
                            const updatedFiles = group.files!.filter((_, fi) => fi !== fIdx)
                            const firstFile = updatedFiles[0]
                            patchGroup(idx, {
                              files: updatedFiles,
                              url: firstFile?.url ?? "",
                              type: firstFile?.type ?? "image",
                            })
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Quando enviar */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-pf-text-sec">Quando o agente deve enviar</span>
                    <HelpTooltip width={300} content={
                      <div className="flex flex-col gap-2">
                        <p className="font-semibold text-pf-text">Gatilho de envio</p>
                        <p>Descreva quando este grupo deve ser enviado. O agente enviará <strong className="text-pf-text">todos os arquivos do grupo</strong> quando o gatilho for acionado.</p>
                        <ul className="flex flex-col gap-1 text-pf-text-muted">
                          <li><strong className="text-pf-text">Modelos de piscinas:</strong> "Quando o lead quiser ver os modelos ou pedir fotos"</li>
                          <li><strong className="text-pf-text">Sobre a empresa:</strong> "Quando o lead quiser conhecer mais a empresa ou pedir informações institucionais"</li>
                        </ul>
                      </div>
                    } />
                  </div>
                  <input type="text" value={group.description} maxLength={500}
                    placeholder="Ex: Quando o lead quiser ver os modelos disponíveis"
                    onChange={(e) => patchGroup(idx, { description: e.target.value })}
                    className="h-8 rounded-lg border border-pf-border bg-pf-surface px-3 text-sm text-pf-text outline-none transition-colors focus:border-pf-accent/50"
                  />
                </div>

                {/* Botão fechar edição */}
                <button
                  type="button"
                  onClick={() => setExpandedIdx(null)}
                  className="self-end flex items-center gap-1 rounded-lg border border-pf-border px-3 py-1.5 text-xs text-pf-text-sec transition-colors hover:border-pf-accent/50 hover:text-pf-text"
                >
                  Fechar edição
                </button>
              </div>
            )}
          </div>
        )
      })}

      {normalized.length > 0 && (
        <p className="text-xs text-pf-text-muted">
          {normalized.length}/20 grupos · {totalFiles} arquivo{totalFiles !== 1 ? "s" : ""} cadastrados — o agente decide sozinho quando enviar cada grupo.
        </p>
      )}
    </div>
  )
}
