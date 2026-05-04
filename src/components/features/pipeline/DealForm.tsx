"use client"

import { useState, useEffect, useRef } from "react"
import { X, Loader2 } from "lucide-react"
import { z } from "zod"
import { cn } from "@/lib/utils"
import { STAGE_COLORS } from "./DealCard"
import type { Deal, DealStage, Lead, Profile } from "@/types"

const STAGE_LABELS: Record<DealStage, string> = {
  novo_lead: "Novo Lead",
  contato_realizado: "Contato Realizado",
  proposta_enviada: "Proposta Enviada",
  negociacao: "Negociação",
  fechado_ganho: "Fechado Ganho",
  fechado_perdido: "Fechado Perdido",
}

const DEAL_STAGES = [
  "novo_lead",
  "contato_realizado",
  "proposta_enviada",
  "negociacao",
  "fechado_ganho",
  "fechado_perdido",
] as const

const dealSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  value: z.coerce.number().min(0, "Valor deve ser positivo"),
  stage: z.enum(DEAL_STAGES),
  lead_id: z.string().nullable(),
  owner_id: z.string().nullable(),
  due_date: z.string().nullable(),
})

type DealFormData = z.infer<typeof dealSchema>

export type { DealFormData }

interface FieldProps {
  label: string
  error?: string
  children: React.ReactNode
  required?: boolean
}

function Field({ label, error, children, required }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-pf-text-sec">
        {label}
        {required && <span className="ml-0.5 text-pf-negative">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-pf-negative">{error}</p>}
    </div>
  )
}

const inputClass =
  "h-9 w-full rounded-lg border border-pf-border bg-pf-surface-2 px-3 text-sm text-pf-text placeholder:text-pf-text-muted outline-none transition-colors focus:border-pf-accent/50 aria-[invalid=true]:border-pf-negative/50"

function buildValues(initialData?: Partial<Deal>, defaultStage?: DealStage): DealFormData {
  return {
    title: initialData?.title ?? "",
    value: initialData?.value ?? 0,
    stage: initialData?.stage ?? defaultStage ?? "novo_lead",
    lead_id: initialData?.lead_id ?? null,
    owner_id: initialData?.owner_id ?? null,
    due_date: initialData?.due_date
      ? new Date(initialData.due_date).toISOString().split("T")[0]
      : null,
  }
}

interface DealFormProps {
  initialData?: Partial<Deal>
  defaultStage?: DealStage
  leads: Pick<Lead, "id" | "name" | "company">[]
  members: Pick<Profile, "id" | "name">[]
  onSubmit: (data: DealFormData) => void | Promise<void>
  onClose: () => void
  isOpen: boolean
}

export function DealForm({ initialData, defaultStage, leads, members, onSubmit, onClose, isOpen }: DealFormProps) {
  const [values, setValues] = useState<DealFormData>(() => buildValues(initialData, defaultStage))
  const [errors, setErrors] = useState<Partial<Record<keyof DealFormData, string>>>({})
  const [loading, setLoading] = useState(false)
  const mountedRef = useRef(true)

  const stageColor = STAGE_COLORS[values.stage]

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (isOpen) {
      setValues(buildValues(initialData, defaultStage))
      setErrors({})
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  function set<K extends keyof DealFormData>(key: K, value: DealFormData[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = dealSchema.safeParse(values)
    if (!result.success) {
      const fieldErrors: typeof errors = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof DealFormData
        fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }
    setLoading(true)
    await onSubmit(result.data)
    if (mountedRef.current) setLoading(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-pf-bg/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full flex-col bg-pf-surface shadow-2xl sm:max-w-md">
        {/* Accent top line */}
        <div
          className="h-[2px] w-full transition-colors duration-300"
          style={{ background: `linear-gradient(90deg, transparent, ${stageColor}, transparent)` }}
        />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-pf-border px-6 py-4">
          <h2 className="font-heading text-base font-bold text-pf-text">
            {initialData?.id ? "Editar Negócio" : "Novo Negócio"}
          </h2>
          <button
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-pf-text-muted transition-colors hover:bg-pf-surface-2 hover:text-pf-text"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex flex-col gap-5 px-6 py-6">
            <Field label="Título do negócio" required error={errors.title}>
              <input
                className={inputClass}
                placeholder="Ex: Licença Enterprise TechCorp"
                value={values.title}
                onChange={(e) => set("title", e.target.value)}
                aria-invalid={!!errors.title}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Valor (R$)" required error={errors.value}>
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  placeholder="0"
                  value={values.value || ""}
                  onChange={(e) => set("value", Number(e.target.value))}
                  aria-invalid={!!errors.value}
                />
              </Field>
              <Field label="Prazo">
                <input
                  type="date"
                  className={cn(inputClass, "cursor-pointer")}
                  value={values.due_date ?? ""}
                  onChange={(e) => set("due_date", e.target.value || null)}
                />
              </Field>
            </div>

            <Field label="Etapa">
              <div className="relative">
                <select
                  value={values.stage}
                  onChange={(e) => set("stage", e.target.value as DealStage)}
                  className={cn(inputClass, "appearance-none pr-8 cursor-pointer")}
                >
                  {DEAL_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {STAGE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              {/* mini color indicator */}
              <div
                className="mt-1 h-1 rounded-full transition-all duration-300"
                style={{ background: stageColor, opacity: 0.6 }}
              />
            </Field>

            <Field label="Lead vinculado">
              <div className="relative">
                <select
                  value={values.lead_id ?? ""}
                  onChange={(e) => set("lead_id", e.target.value || null)}
                  className={cn(inputClass, "appearance-none pr-8 cursor-pointer")}
                >
                  <option value="">Sem lead vinculado</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}{l.company ? ` — ${l.company}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </Field>

            <Field label="Responsável">
              <div className="relative">
                <select
                  value={values.owner_id ?? ""}
                  onChange={(e) => set("owner_id", e.target.value || null)}
                  className={cn(inputClass, "appearance-none pr-8 cursor-pointer")}
                >
                  <option value="">Sem responsável</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
          </div>

          {/* Footer */}
          <div className="mt-auto flex items-center justify-end gap-3 border-t border-pf-border px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-pf-border px-4 text-sm text-pf-text-sec transition-colors hover:bg-pf-surface-2 hover:text-pf-text"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex h-9 items-center gap-2 rounded-lg bg-pf-accent px-4 text-sm font-semibold text-pf-bg transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {initialData?.id ? "Salvar alterações" : "Criar negócio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
