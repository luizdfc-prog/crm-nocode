"use client"

import { useState, useTransition } from "react"
import { Plus, Pencil, Trash2, Type, Hash, Calendar, ChevronDown, List, Loader2, Check, X, AlertCircle, Megaphone } from "lucide-react"
import {
  createFieldDefinition,
  updateFieldDefinition,
  deleteFieldDefinition,
} from "@/actions/customFields"
import { HelpTooltip } from "@/components/ui/HelpTooltip"
import type { LeadFieldDefinition, CustomFieldType, Pipeline, RequiredForRule } from "@/types"

interface Props {
  initialFields: LeadFieldDefinition[]
  isAdmin: boolean
  pipelines?: Pipeline[]
}


const TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Texto",
  number: "Número",
  date: "Data",
  select: "Seleção única",
  multiselect: "Múltipla seleção",
}

const TYPE_ICONS: Record<CustomFieldType, React.ElementType> = {
  text: Type,
  number: Hash,
  date: Calendar,
  select: ChevronDown,
  multiselect: List,
}

const inputClass =
  "h-9 w-full rounded-lg border border-pf-border bg-pf-surface-2 px-3 text-sm text-pf-text placeholder:text-pf-text-muted outline-none transition-colors focus:border-pf-accent/50"

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40)
}

interface FieldFormState {
  name: string
  field_key: string
  field_type: CustomFieldType
  options_raw: string
  required_for: RequiredForRule[]
}

function emptyForm(): FieldFormState {
  return { name: "", field_key: "", field_type: "text", options_raw: "", required_for: [] }
}

function fromDefinition(def: LeadFieldDefinition): FieldFormState {
  return {
    name: def.name,
    field_key: def.field_key,
    field_type: def.field_type,
    options_raw: def.options.join(", "),
    required_for: def.required_for ?? [],
  }
}

// Sub-componente para gerenciar regras de obrigatoriedade
interface RequiredForEditorProps {
  value: RequiredForRule[]
  onChange: (rules: RequiredForRule[]) => void
  pipelines: Pipeline[]
}

function RequiredForEditor({ value, onChange, pipelines }: RequiredForEditorProps) {
  const [addingPipelineId, setAddingPipelineId] = useState<string>("")
  const [addingStageId, setAddingStageId] = useState<string>("")

  const stagesForSelected = pipelines.find((p) => p.id === addingPipelineId)?.stages ?? []

  function addRule() {
    if (!addingPipelineId || !addingStageId) return
    const alreadyExists = value.some(
      (r) => r.pipeline_id === addingPipelineId && r.stage_id === addingStageId,
    )
    if (alreadyExists) return
    onChange([...value, { pipeline_id: addingPipelineId, stage_id: addingStageId }])
    setAddingStageId("")
  }

  function removeRule(idx: number) {
    onChange(value.filter((_, i) => i !== idx))
  }

  function pipelineName(id: string) {
    return pipelines.find((p) => p.id === id)?.name ?? id
  }

  function stageName(pipelineId: string, stageId: string) {
    return (
      pipelines
        .find((p) => p.id === pipelineId)
        ?.stages?.find((s) => s.id === stageId)?.name ?? stageId
    )
  }

  if (pipelines.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-pf-text-sec">Obrigatório na etapa</label>
        <HelpTooltip width={280} content={
          <p>Quando um negócio for movido para esta etapa, o vendedor será obrigado a preencher este campo antes de concluir o movimento.</p>
        } />
      </div>

      {/* Regras existentes */}
      {value.length > 0 && (
        <div className="flex flex-col gap-1">
          {value.map((rule, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 rounded-lg border border-pf-border bg-pf-surface px-3 py-1.5"
            >
              <AlertCircle className="size-3.5 shrink-0 text-pf-warm" />
              <span className="flex-1 text-xs text-pf-text">
                <span className="text-pf-text-sec">{pipelineName(rule.pipeline_id)}</span>
                <span className="mx-1 text-pf-text-muted">→</span>
                {stageName(rule.pipeline_id, rule.stage_id)}
              </span>
              <button
                type="button"
                onClick={() => removeRule(idx)}
                className="text-pf-text-muted hover:text-pf-negative"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Adicionar regra */}
      <div className="flex items-center gap-2">
        <select
          value={addingPipelineId}
          onChange={(e) => { setAddingPipelineId(e.target.value); setAddingStageId("") }}
          className="h-8 flex-1 rounded-lg border border-pf-border bg-pf-surface-2 px-2 text-xs text-pf-text outline-none focus:border-pf-accent/50 cursor-pointer"
        >
          <option value="">Pipeline...</option>
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={addingStageId}
          onChange={(e) => setAddingStageId(e.target.value)}
          disabled={!addingPipelineId}
          className="h-8 flex-1 rounded-lg border border-pf-border bg-pf-surface-2 px-2 text-xs text-pf-text outline-none focus:border-pf-accent/50 cursor-pointer disabled:opacity-40"
        >
          <option value="">Etapa...</option>
          {stagesForSelected.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={addRule}
          disabled={!addingPipelineId || !addingStageId}
          className="flex h-8 items-center gap-1 rounded-lg border border-pf-border px-2.5 text-xs text-pf-text-sec hover:bg-pf-surface-2 hover:text-pf-text disabled:opacity-40"
        >
          <Plus className="size-3" />
          Adicionar
        </button>
      </div>
    </div>
  )
}

interface InlineFormProps {
  initial: FieldFormState
  isEdit?: boolean
  onCancel: () => void
  onSaved: (field: LeadFieldDefinition) => void
  position?: number
  pipelines: Pipeline[]
}

function InlineForm({ initial, isEdit, onCancel, onSaved, position = 0, pipelines }: InlineFormProps) {
  const [form, setForm] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function patch(key: keyof FieldFormState, value: string) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === "name" && !isEdit) {
        next.field_key = slugify(value)
      }
      return next
    })
    setError(null)
  }

  const needsOptions = form.field_type === "select" || form.field_type === "multiselect"

  function handleSave() {
    if (!form.name.trim()) { setError("Nome é obrigatório"); return }
    if (!form.field_key.trim()) { setError("Chave é obrigatória"); return }
    if (!/^[a-z0-9_]+$/.test(form.field_key)) { setError("Chave: apenas letras minúsculas, números e _"); return }

    const options = needsOptions
      ? form.options_raw.split(",").map((o) => o.trim()).filter(Boolean)
      : []

    startTransition(async () => {
      let result
      if (isEdit) {
        result = await updateFieldDefinition({
          id: initial.field_key,
          name: form.name,
          options,
          required_for: form.required_for,
        })
      } else {
        result = await createFieldDefinition({
          name: form.name,
          field_key: form.field_key,
          field_type: form.field_type,
          options,
          position,
          required_for: form.required_for,
        })
      }

      if (!result.success) {
        setError(result.error)
        return
      }
      onSaved(result.data as LeadFieldDefinition)
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-pf-accent/40 bg-pf-surface-2 p-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-pf-text-sec">Nome do campo</label>
          <input
            className={inputClass}
            placeholder="Ex: Cidade"
            value={form.name}
            onChange={(e) => patch("name", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-pf-text-sec">Chave interna</label>
            {form.field_key === "origem" && (
              <span className="rounded bg-pf-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-pf-accent">
                rastreamento automático ativo
              </span>
            )}
          </div>
          <input
            className={inputClass}
            placeholder="cidade"
            value={form.field_key}
            readOnly={isEdit}
            onChange={(e) => patch("field_key", e.target.value)}
            style={isEdit ? { opacity: 0.5 } : undefined}
          />
          {form.field_key === "origem" && !isEdit && (
            <p className="text-[10px] text-pf-text-muted">
              Este campo será preenchido automaticamente pela primeira mensagem do lead no WhatsApp.
            </p>
          )}
        </div>
      </div>

      {!isEdit && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-pf-text-sec">Tipo</label>
          <select
            value={form.field_type}
            onChange={(e) => patch("field_type", e.target.value as CustomFieldType)}
            className={inputClass + " cursor-pointer"}
          >
            {(Object.keys(TYPE_LABELS) as CustomFieldType[]).map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
      )}

      {needsOptions && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-pf-text-sec">
            Opções <span className="text-pf-text-muted">(separadas por vírgula)</span>
          </label>
          <input
            className={inputClass}
            placeholder="Ex: São Paulo, Rio de Janeiro, Uberlândia"
            value={form.options_raw}
            onChange={(e) => patch("options_raw", e.target.value)}
          />
        </div>
      )}

      {pipelines.length > 0 && (
        <RequiredForEditor
          value={form.required_for}
          onChange={(rules) => setForm((p) => ({ ...p, required_for: rules }))}
          pipelines={pipelines}
        />
      )}

      {error && <p className="text-xs text-pf-negative">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-lg bg-pf-accent px-3 py-1.5 text-xs font-semibold text-pf-bg transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isPending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
          {isPending ? "Salvando..." : "Salvar"}
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 rounded-lg border border-pf-border px-3 py-1.5 text-xs text-pf-text-sec hover:bg-pf-surface hover:text-pf-text"
        >
          <X className="size-3" />
          Cancelar
        </button>
      </div>
    </div>
  )
}

interface EditFormProps {
  definition: LeadFieldDefinition
  onCancel: () => void
  onSaved: (field: LeadFieldDefinition) => void
  pipelines: Pipeline[]
}

function EditForm({ definition, onCancel, onSaved, pipelines }: EditFormProps) {
  const [form, setForm] = useState<{ name: string; options_raw: string; required_for: RequiredForRule[] }>({
    name: definition.name,
    options_raw: definition.options.join(", "),
    required_for: definition.required_for ?? [],
  })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const needsOptions = definition.field_type === "select" || definition.field_type === "multiselect"

  function handleSave() {
    if (!form.name.trim()) { setError("Nome é obrigatório"); return }
    const options = needsOptions
      ? form.options_raw.split(",").map((o) => o.trim()).filter(Boolean)
      : undefined

    startTransition(async () => {
      const result = await updateFieldDefinition({
        id: definition.id,
        name: form.name,
        options,
        required_for: form.required_for,
      })
      if (!result.success) { setError(result.error); return }
      onSaved(result.data as LeadFieldDefinition)
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-pf-accent/40 bg-pf-surface-2 p-4 mt-2">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-pf-text-sec">Nome do campo</label>
        <input
          className={inputClass}
          value={form.name}
          onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); setError(null) }}
        />
      </div>
      {needsOptions && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-pf-text-sec">Opções <span className="text-pf-text-muted">(separadas por vírgula)</span></label>
          <input
            className={inputClass}
            value={form.options_raw}
            onChange={(e) => setForm((p) => ({ ...p, options_raw: e.target.value }))}
          />
        </div>
      )}

      {pipelines.length > 0 && (
        <RequiredForEditor
          value={form.required_for}
          onChange={(rules) => setForm((p) => ({ ...p, required_for: rules }))}
          pipelines={pipelines}
        />
      )}

      {error && <p className="text-xs text-pf-negative">{error}</p>}
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={isPending} className="flex items-center gap-1.5 rounded-lg bg-pf-accent px-3 py-1.5 text-xs font-semibold text-pf-bg hover:opacity-90 disabled:opacity-60">
          {isPending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
          {isPending ? "Salvando..." : "Salvar"}
        </button>
        <button onClick={onCancel} className="flex items-center gap-1.5 rounded-lg border border-pf-border px-3 py-1.5 text-xs text-pf-text-sec hover:bg-pf-surface hover:text-pf-text">
          <X className="size-3" /> Cancelar
        </button>
      </div>
    </div>
  )
}


export function CustomFieldsTab({ initialFields, isAdmin, pipelines = [] }: Props) {
  const [fields, setFields] = useState<LeadFieldDefinition[]>(initialFields)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCreated(field: LeadFieldDefinition) {
    setFields((prev) => [...prev, field])
    setShowAdd(false)
  }

  function handleUpdated(field: LeadFieldDefinition) {
    setFields((prev) => prev.map((f) => (f.id === field.id ? field : f)))
    setEditingId(null)
  }

  function handleDelete(id: string) {
    setDeletingId(id)
    startTransition(async () => {
      const result = await deleteFieldDefinition(id)
      if (result.success) {
        setFields((prev) => prev.filter((f) => f.id !== id))
        setConfirmDeleteId(null)
      }
      setDeletingId(null)
    })
  }

  if (!isAdmin) {
    return (
      <div className="py-10 text-center text-sm text-pf-text-muted">
        Apenas administradores podem gerenciar campos personalizados.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-base font-bold text-pf-text">Campos personalizados</h3>
            <HelpTooltip width={320} content={
              <div className="flex flex-col gap-2">
                <p className="font-semibold text-pf-text">O que são campos personalizados?</p>
                <p>Campos extras que aparecem em todos os leads do workspace — visíveis e editáveis em Leads, Conversas e Pipeline.</p>
                <p className="font-semibold text-pf-text mt-1">Campo especial: <span className="text-pf-accent">origem</span></p>
                <p>Crie um campo com a chave exata <code className="bg-pf-surface-2 px-1 rounded">origem</code> para rastrear automaticamente de onde o lead veio.</p>
                <p>Use links com texto pré-preenchido:</p>
                <code className="block bg-pf-surface-2 rounded p-2 text-[10px] break-all">wa.me/55...?text=[origem:Instagram]</code>
                <p className="text-pf-text-muted">Palavras reconhecidas automaticamente: Instagram, Facebook, Google, TikTok, YouTube, LinkedIn, Site, Indicação.</p>
              </div>
            } />
          </div>
          <p className="text-sm text-pf-text-muted">
            Crie campos adicionais que aparecem em todos os leads do workspace
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setEditingId(null) }}
          className="flex h-9 shrink-0 items-center gap-2 rounded-lg bg-pf-accent px-4 text-sm font-semibold text-pf-bg transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" />
          Adicionar campo
        </button>
      </div>

      {/* Card informativo fixo — UTMs de campanha */}
      <div className="flex items-start gap-3 rounded-xl border border-[#5B7FFF]/20 bg-[#5B7FFF]/5 px-4 py-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#5B7FFF]/10 mt-0.5">
          <Megaphone className="size-4 text-[#5B7FFF]" />
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold text-pf-text">UTMs das Campanhas</p>
          <p className="text-xs text-pf-text-muted leading-relaxed">
            Quando um lead acessar o catálogo via link de campanha — ex: <span className="font-mono text-pf-text-sec">?utm_source=instagram&utm_campaign=verao</span> — os campos <span className="text-pf-text-sec font-medium">UTM Source</span>, <span className="text-pf-text-sec font-medium">UTM Medium</span> e <span className="text-pf-text-sec font-medium">UTM Campaign</span> serão preenchidos automaticamente no card do lead e estarão disponíveis no dashboard.
          </p>
        </div>
      </div>

      {showAdd && (
        <InlineForm
          initial={emptyForm()}
          position={fields.length}
          onCancel={() => setShowAdd(false)}
          onSaved={handleCreated}
          pipelines={pipelines}
        />
      )}

      {fields.length === 0 && !showAdd ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-pf-border py-12 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-pf-surface-2">
            <List className="size-5 text-pf-text-muted" />
          </div>
          <p className="text-sm font-medium text-pf-text">Nenhum campo criado</p>
          <p className="text-xs text-pf-text-muted">
            Clique em "Adicionar campo" para criar o primeiro campo personalizado
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {fields.map((field) => {
            const Icon = TYPE_ICONS[field.field_type]
            const isEditing = editingId === field.id
            const isConfirmingDelete = confirmDeleteId === field.id
            const isDeleting = deletingId === field.id
            const requiredCount = field.required_for?.length ?? 0

            return (
              <div key={field.id} className="flex flex-col rounded-xl border border-pf-border bg-pf-surface">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-pf-surface-2 text-pf-text-muted">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-pf-text">{field.name}</p>
                      {requiredCount > 0 && (
                        <span className="flex items-center gap-0.5 rounded-full border border-pf-warm/30 bg-pf-warm/10 px-1.5 py-0.5 text-[10px] font-medium text-pf-warm">
                          <AlertCircle className="size-2.5" />
                          {requiredCount} etapa{requiredCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-pf-text-muted">
                      {TYPE_LABELS[field.field_type]}
                      {field.options.length > 0 && ` · ${field.options.join(", ")}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {isConfirmingDelete ? (
                      <>
                        <span className="text-xs text-pf-text-muted mr-1">Excluir?</span>
                        <button
                          onClick={() => handleDelete(field.id)}
                          disabled={isDeleting}
                          className="flex items-center gap-1 rounded-lg bg-pf-negative/10 border border-pf-negative/30 px-2 py-1 text-xs text-pf-negative hover:bg-pf-negative/20 disabled:opacity-50"
                        >
                          {isDeleting ? <Loader2 className="size-3 animate-spin" /> : "Confirmar"}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-lg border border-pf-border px-2 py-1 text-xs text-pf-text-sec hover:bg-pf-surface-2"
                        >
                          Não
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => { setEditingId(isEditing ? null : field.id); setShowAdd(false) }}
                          className="flex size-7 items-center justify-center rounded-lg text-pf-text-muted hover:bg-pf-surface-2 hover:text-pf-text"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(field.id)}
                          className="flex size-7 items-center justify-center rounded-lg text-pf-text-muted hover:bg-pf-surface-2 hover:text-pf-negative"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="border-t border-pf-border px-4 pb-4 pt-3">
                    <EditForm
                      definition={field}
                      onCancel={() => setEditingId(null)}
                      onSaved={handleUpdated}
                      pipelines={pipelines}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
