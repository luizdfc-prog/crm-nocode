"use client"

import { useState, useTransition } from "react"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { KeyboardSensor } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Lock,
  Bot,
  ChevronRight,
  ChevronDown,
  GripVertical,
  X,
} from "lucide-react"
import {
  createPipeline,
  updatePipeline,
  deletePipeline,
  createStage,
  updateStage,
  deleteStage,
  reorderStages,
} from "@/actions/pipeline"
import type { Pipeline, PipelineStage } from "@/types"
import { cn } from "@/lib/utils"

interface PipelinesTabProps {
  initialPipelines: Pipeline[]
  isPro: boolean
  isAdmin: boolean
}

const TYPE_LABELS: Record<Pipeline["type"], string> = {
  sales: "Vendas",
  agent: "Agente IA",
  custom: "Personalizado",
}

const TYPE_BADGE: Record<Pipeline["type"], string> = {
  sales: "border-pf-cool/30 bg-pf-cool/10 text-pf-cool",
  agent: "border-pf-accent/30 bg-pf-accent/10 text-pf-accent",
  custom: "border-pf-border bg-pf-surface-2 text-pf-text-sec",
}

const PRESET_COLORS = [
  "#5B7FFF",
  "#CAFF33",
  "#2ED573",
  "#FF4757",
  "#FF6B35",
  "#F59E0B",
  "#06B6D4",
  "#A78BFA",
  "#EC4899",
  "#8A8A8F",
]

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            "size-6 rounded-full border-2 transition-all",
            value === c ? "border-pf-text scale-110" : "border-transparent"
          )}
          style={{ background: c }}
          title={c}
          aria-label={`Cor ${c}`}
        />
      ))}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="size-6 cursor-pointer rounded-full border border-pf-border bg-transparent"
        title="Cor personalizada"
        aria-label="Cor personalizada"
      />
    </div>
  )
}

const inputClass =
  "h-9 w-full rounded-lg border border-pf-border bg-pf-surface-2 px-3 text-sm text-pf-text placeholder:text-pf-text-muted outline-none transition-colors focus:border-pf-accent/50"

// ── Stage item (sortable) ─────────────────────────────────────────────────────

interface StageItemProps {
  stage: PipelineStage
  isAdmin: boolean
  onUpdate: (id: string, name: string, color: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function StageItem({ stage, isAdmin, onUpdate, onDelete }: StageItemProps) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(stage.name)
  const [color, setColor] = useState(stage.color)
  const [loading, setLoading] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id, disabled: !isAdmin || editing })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  async function handleSave() {
    if (!name.trim()) return
    setLoading(true)
    await onUpdate(stage.id, name.trim(), color)
    setLoading(false)
    setEditing(false)
  }

  async function handleDelete() {
    if (!confirm(`Deletar etapa "${stage.name}"? Esta ação não pode ser desfeita.`)) return
    setLoading(true)
    await onDelete(stage.id)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border border-pf-border bg-pf-surface-2 px-3 py-2.5"
    >
      {isAdmin && (
        <GripVertical
          className="size-4 shrink-0 text-pf-text-muted cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
        />
      )}
      <div
        className="size-3 shrink-0 rounded-full"
        style={{ background: stage.color }}
      />

      {editing ? (
        <div className="flex flex-1 flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={cn(inputClass, "flex-1")}
            autoFocus
          />
          <ColorPicker value={color} onChange={setColor} />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={loading || !name.trim()}
              className="flex h-7 items-center gap-1.5 rounded-lg bg-pf-accent px-3 text-xs font-semibold text-pf-bg disabled:opacity-60"
            >
              {loading && <Loader2 className="size-3 animate-spin" />}
              Salvar
            </button>
            <button
              onClick={() => { setEditing(false); setName(stage.name); setColor(stage.color) }}
              className="flex h-7 items-center rounded-lg border border-pf-border px-3 text-xs text-pf-text-sec hover:bg-pf-surface"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <span className="flex-1 text-sm text-pf-text">{stage.name}</span>
      )}

      {isAdmin && !editing && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="flex size-6 items-center justify-center rounded text-pf-text-muted hover:bg-pf-surface hover:text-pf-text-sec transition-colors"
            aria-label="Editar etapa"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex size-6 items-center justify-center rounded text-pf-text-muted hover:bg-pf-negative/10 hover:text-pf-negative transition-colors disabled:opacity-50"
            aria-label="Deletar etapa"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Pipeline accordion item ────────────────────────────────────────────────────

interface PipelineItemProps {
  pipeline: Pipeline
  isAdmin: boolean
  onRename: (id: string, name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onAddStage: (pipelineId: string, name: string, color: string) => Promise<PipelineStage | null>
  onUpdateStage: (id: string, name: string, color: string) => Promise<void>
  onDeleteStage: (id: string, pipelineId: string) => Promise<void>
  onReorderStages: (pipelineId: string, orderedIds: string[]) => Promise<void>
}

function PipelineItem({
  pipeline,
  isAdmin,
  onRename,
  onDelete,
  onAddStage,
  onUpdateStage,
  onDeleteStage,
  onReorderStages,
}: PipelineItemProps) {
  const [expanded, setExpanded] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState(pipeline.name)
  const [addingStage, setAddingStage] = useState(false)
  const [stageName, setStageName] = useState("")
  const [stageColor, setStageColor] = useState("#5B7FFF")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRename() {
    if (!newName.trim()) return
    setError(null)
    setLoading(true)
    await onRename(pipeline.id, newName.trim())
    setLoading(false)
    setRenaming(false)
  }

  async function handleDelete() {
    if (!confirm(`Deletar pipeline "${pipeline.name}" e todas as suas etapas? Esta ação não pode ser desfeita.`)) return
    setError(null)
    setLoading(true)
    await onDelete(pipeline.id)
  }

  async function handleAddStage() {
    if (!stageName.trim()) return
    setError(null)
    setLoading(true)
    const newStage = await onAddStage(pipeline.id, stageName.trim(), stageColor)
    if (newStage) setLocalStages((prev) => [...prev, newStage])
    setStageName("")
    setStageColor("#5B7FFF")
    setAddingStage(false)
    setLoading(false)
  }

  const [localStages, setLocalStages] = useState<PipelineStage[]>(pipeline.stages ?? [])
  const isAgent = pipeline.type === "agent"

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = localStages.findIndex((s) => s.id === active.id)
    const newIndex = localStages.findIndex((s) => s.id === over.id)
    const reordered = arrayMove(localStages, oldIndex, newIndex)
    setLocalStages(reordered)
    await onReorderStages(pipeline.id, reordered.map((s) => s.id))
  }

  return (
    <div className="rounded-xl border border-pf-border bg-pf-surface overflow-hidden">
      {/* Pipeline header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-3 text-left"
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronDown className="size-4 shrink-0 text-pf-text-muted" />
          ) : (
            <ChevronRight className="size-4 shrink-0 text-pf-text-muted" />
          )}

          {renaming ? (
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className={cn(inputClass, "h-7 text-sm")}
              autoFocus
            />
          ) : (
            <span className="flex-1 text-sm font-semibold text-pf-text">{pipeline.name}</span>
          )}

          <span
            className={cn(
              "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium shrink-0",
              TYPE_BADGE[pipeline.type]
            )}
          >
            {isAgent && <Bot className="size-2.5" />}
            {TYPE_LABELS[pipeline.type]}
          </span>

          <span className="shrink-0 text-xs text-pf-text-muted">
            {localStages.length} etapa{localStages.length !== 1 ? "s" : ""}
          </span>
        </button>

        {isAdmin && (
          <div className="flex items-center gap-1 shrink-0">
            {renaming ? (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); handleRename() }}
                  disabled={loading}
                  className="flex h-7 items-center gap-1 rounded-lg bg-pf-accent px-2.5 text-xs font-semibold text-pf-bg disabled:opacity-60"
                >
                  {loading && <Loader2 className="size-3 animate-spin" />}
                  Salvar
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setRenaming(false); setNewName(pipeline.name) }}
                  className="flex size-7 items-center justify-center rounded text-pf-text-muted hover:bg-pf-surface-2"
                >
                  <X className="size-3.5" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setRenaming(true) }}
                  className="flex size-7 items-center justify-center rounded text-pf-text-muted hover:bg-pf-surface-2 hover:text-pf-text-sec transition-colors"
                  title="Renomear pipeline"
                  aria-label="Renomear pipeline"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete() }}
                  disabled={loading}
                  className="flex size-7 items-center justify-center rounded text-pf-text-muted hover:bg-pf-negative/10 hover:text-pf-negative transition-colors disabled:opacity-50"
                  title="Deletar pipeline"
                  aria-label="Deletar pipeline"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Expanded content — stages */}
      {expanded && (
        <div className="border-t border-pf-border px-4 pb-4 pt-3">
          {error && (
            <p className="mb-3 text-xs text-pf-negative">{error}</p>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localStages.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-2">
                {localStages.map((stage) => (
                  <StageItem
                    key={stage.id}
                    stage={stage}
                    isAdmin={isAdmin && !isAgent}
                    onUpdate={async (id, name, color) => {
                      await onUpdateStage(id, name, color)
                      setLocalStages((prev) =>
                        prev.map((s) => (s.id === id ? { ...s, name, color } : s))
                      )
                    }}
                    onDelete={async (id) => {
                      await onDeleteStage(id, pipeline.id)
                      setLocalStages((prev) => prev.filter((s) => s.id !== id))
                    }}
                  />
                ))}

                {localStages.length === 0 && (
                  <p className="text-xs text-pf-text-muted py-2">
                    Nenhuma etapa. {isAdmin && !isAgent ? "Adicione uma abaixo." : ""}
                  </p>
                )}
              </div>
            </SortableContext>
          </DndContext>

          {/* Adicionar stage — só em pipelines não-agent e para admins */}
          {isAdmin && !isAgent && (
            <div className="mt-3">
              {addingStage ? (
                <div className="flex flex-col gap-3 rounded-lg border border-pf-border bg-pf-surface-2 p-3">
                  <input
                    placeholder="Nome da etapa"
                    value={stageName}
                    onChange={(e) => setStageName(e.target.value)}
                    className={inputClass}
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddStage() }}
                  />
                  <ColorPicker value={stageColor} onChange={setStageColor} />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddStage}
                      disabled={loading || !stageName.trim()}
                      className="flex h-7 items-center gap-1.5 rounded-lg bg-pf-accent px-3 text-xs font-semibold text-pf-bg disabled:opacity-60"
                    >
                      {loading && <Loader2 className="size-3 animate-spin" />}
                      Adicionar
                    </button>
                    <button
                      onClick={() => { setAddingStage(false); setStageName(""); setStageColor("#5B7FFF") }}
                      className="flex h-7 items-center rounded-lg border border-pf-border px-3 text-xs text-pf-text-sec hover:bg-pf-surface"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingStage(true)}
                  className="flex items-center gap-1.5 text-xs text-pf-text-muted hover:text-pf-text-sec transition-colors mt-1"
                >
                  <Plus className="size-3.5" />
                  Adicionar etapa
                </button>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  )
}

// ── PipelinesTab ──────────────────────────────────────────────────────────────

export function PipelinesTab({ initialPipelines, isPro, isAdmin }: PipelinesTabProps) {
  const [pipelines, setPipelines] = useState<Pipeline[]>(initialPipelines)
  const [creating, setCreating] = useState(false)
  const [newPipelineName, setNewPipelineName] = useState("")
  const [newPipelineType, setNewPipelineType] = useState<"sales" | "custom">("sales")
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleCreatePipeline() {
    if (!newPipelineName.trim()) return
    setGlobalError(null)

    startTransition(async () => {
      const result = await createPipeline(newPipelineName.trim(), newPipelineType)
      if (!result.success) {
        setGlobalError(result.error)
        return
      }
      setPipelines((prev) => [...prev, result.data])
      setNewPipelineName("")
      setNewPipelineType("sales")
      setCreating(false)
    })
  }

  async function handleRename(id: string, name: string) {
    setGlobalError(null)
    const result = await updatePipeline(id, name)
    if (!result.success) {
      setGlobalError(result.error)
      return
    }
    setPipelines((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: result.data.name } : p))
    )
  }

  async function handleDelete(id: string) {
    setGlobalError(null)
    const result = await deletePipeline(id)
    if (!result.success) {
      setGlobalError(result.error)
      return
    }
    setPipelines((prev) => prev.filter((p) => p.id !== id))
  }

  async function handleAddStage(pipelineId: string, name: string, color: string): Promise<PipelineStage | null> {
    setGlobalError(null)
    const result = await createStage(pipelineId, name, color)
    if (!result.success) {
      setGlobalError(result.error)
      return null
    }
    setPipelines((prev) =>
      prev.map((p) =>
        p.id === pipelineId
          ? { ...p, stages: [...(p.stages ?? []), result.data] }
          : p
      )
    )
    return result.data
  }

  async function handleUpdateStage(id: string, name: string, color: string) {
    setGlobalError(null)
    const result = await updateStage(id, { name, color })
    if (!result.success) {
      setGlobalError(result.error)
      return
    }
    setPipelines((prev) =>
      prev.map((p) => ({
        ...p,
        stages: (p.stages ?? []).map((s) =>
          s.id === id ? { ...s, name: result.data.name, color: result.data.color } : s
        ),
      }))
    )
  }

  async function handleReorderStages(_pipelineId: string, orderedIds: string[]) {
    setGlobalError(null)
    const updates = orderedIds.map((id, position) => ({ id, position }))
    const result = await reorderStages(updates)
    if (!result.success) setGlobalError(result.error)
  }

  async function handleDeleteStage(id: string, pipelineId: string) {
    setGlobalError(null)
    const result = await deleteStage(id)
    if (!result.success) {
      setGlobalError(result.error)
      return
    }
    setPipelines((prev) =>
      prev.map((p) =>
        p.id === pipelineId
          ? { ...p, stages: (p.stages ?? []).filter((s) => s.id !== id) }
          : p
      )
    )
  }

  const canCreateMore = isPro || pipelines.length === 0

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-heading text-base font-bold text-pf-text">Pipelines</h3>
          <p className="mt-0.5 text-sm text-pf-text-muted">
            Crie e gerencie fluxos de trabalho para diferentes processos de vendas
          </p>
        </div>

        {isAdmin && (
          <div>
            {isPro ? (
              <button
                onClick={() => setCreating(true)}
                disabled={creating}
                className="flex items-center gap-2 rounded-lg bg-pf-accent px-3 py-2 text-sm font-semibold text-pf-bg transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <Plus className="size-4" />
                Novo pipeline
              </button>
            ) : (
              <div
                className="flex items-center gap-2 rounded-lg border border-pf-border bg-pf-surface-2 px-3 py-2 text-sm text-pf-text-muted cursor-not-allowed"
                title="Disponível no plano Pro"
              >
                <Lock className="size-4" />
                Novo pipeline
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pro lock notice */}
      {!isPro && (
        <div className="rounded-lg border border-pf-warm/20 bg-pf-warm/5 px-4 py-3">
          <p className="text-sm text-pf-warm">
            <strong>Plano Free:</strong> você pode ter apenas 1 pipeline. Faça upgrade para Pro para criar pipelines ilimitados.
          </p>
        </div>
      )}

      {globalError && (
        <div className="rounded-lg border border-pf-negative/30 bg-pf-negative/10 px-4 py-3 text-sm text-pf-negative">
          {globalError}
        </div>
      )}

      {/* Formulário de novo pipeline */}
      {creating && (
        <div className="rounded-xl border border-pf-accent/30 bg-pf-surface p-4">
          <h4 className="mb-3 text-sm font-semibold text-pf-text">Novo pipeline</h4>
          <div className="flex flex-col gap-3">
            <input
              placeholder="Nome do pipeline"
              value={newPipelineName}
              onChange={(e) => setNewPipelineName(e.target.value)}
              className={inputClass}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleCreatePipeline() }}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-pf-text-sec">Tipo</label>
              <select
                value={newPipelineType}
                onChange={(e) => setNewPipelineType(e.target.value as "sales" | "custom")}
                className={cn(inputClass, "appearance-none cursor-pointer")}
              >
                <option value="sales">Vendas (stages padrão incluídas)</option>
                <option value="custom">Personalizado (stages em branco)</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreatePipeline}
                disabled={isPending || !newPipelineName.trim()}
                className="flex h-9 items-center gap-2 rounded-lg bg-pf-accent px-4 text-sm font-semibold text-pf-bg disabled:opacity-60"
              >
                {isPending && <Loader2 className="size-4 animate-spin" />}
                Criar pipeline
              </button>
              <button
                onClick={() => { setCreating(false); setNewPipelineName(""); setGlobalError(null) }}
                className="h-9 rounded-lg border border-pf-border px-4 text-sm text-pf-text-sec hover:bg-pf-surface-2"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de pipelines */}
      <div className="flex flex-col gap-3">
        {pipelines.map((pipeline) => (
          <PipelineItem
            key={pipeline.id}
            pipeline={pipeline}
            isAdmin={isAdmin}
            onRename={handleRename}
            onDelete={handleDelete}
            onAddStage={handleAddStage}
            onUpdateStage={handleUpdateStage}
            onDeleteStage={handleDeleteStage}
            onReorderStages={handleReorderStages}
          />
        ))}

        {pipelines.length === 0 && (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-pf-border py-12">
            <div className="text-center">
              <p className="text-sm font-medium text-pf-text-sec">Nenhum pipeline criado</p>
              <p className="mt-1 text-xs text-pf-text-muted">
                Clique em "Novo pipeline" para começar
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
