"use client"

import { useState, useEffect, useRef } from "react"
import { X, Loader2 } from "lucide-react"
import { z } from "zod"
import { cn } from "@/lib/utils"
import { STATUS_CONFIG } from "./LeadStatusBadge"
import { MOCK_PROFILES } from "@/utils/mock-data"
import type { Lead, LeadStatus } from "@/types"

const leadSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  email: z.string().email("E-mail inválido").or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  role: z.string().optional(),
  status: z.enum(["new", "contact", "proposal", "negotiation", "won", "lost"]),
  owner_id: z.string().optional(),
})

type LeadFormData = z.infer<typeof leadSchema>

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

interface LeadFormProps {
  initialData?: Partial<Lead>
  onSubmit: (data: LeadFormData) => void
  onClose: () => void
  isOpen: boolean
}

export type { LeadFormData }

function buildValues(initialData?: Partial<Lead>): LeadFormData {
  return {
    name: initialData?.name ?? "",
    email: initialData?.email ?? "",
    phone: initialData?.phone ?? "",
    company: initialData?.company ?? "",
    role: initialData?.role ?? "",
    status: initialData?.status ?? "new",
    owner_id: initialData?.owner_id ?? "",
  }
}

export function LeadForm({ initialData, onSubmit, onClose, isOpen }: LeadFormProps) {
  const [values, setValues] = useState<LeadFormData>(() => buildValues(initialData))
  const [errors, setErrors] = useState<Partial<Record<keyof LeadFormData, string>>>({})
  const [loading, setLoading] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (isOpen) {
      setValues(buildValues(initialData))
      setErrors({})
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  function set<K extends keyof LeadFormData>(key: K, value: LeadFormData[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = leadSchema.safeParse(values)
    if (!result.success) {
      const fieldErrors: typeof errors = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof LeadFormData
        fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }
    setLoading(true)
    await new Promise((r) => setTimeout(r, 600))
    if (!mountedRef.current) return
    setLoading(false)
    onSubmit(result.data)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-pf-bg/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-pf-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-pf-border px-6 py-4">
          <h2 className="font-heading text-base font-bold text-pf-text">
            {initialData?.id ? "Editar Lead" : "Novo Lead"}
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
            <Field label="Nome" required error={errors.name}>
              <input
                className={inputClass}
                placeholder="Ex: Rafael Mendes"
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
                aria-invalid={!!errors.name}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="E-mail" error={errors.email}>
                <input
                  type="email"
                  className={inputClass}
                  placeholder="email@empresa.com"
                  value={values.email}
                  onChange={(e) => set("email", e.target.value)}
                  aria-invalid={!!errors.email}
                />
              </Field>
              <Field label="Telefone">
                <input
                  className={inputClass}
                  placeholder="(11) 99999-9999"
                  value={values.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Empresa">
                <input
                  className={inputClass}
                  placeholder="Ex: TechCorp"
                  value={values.company}
                  onChange={(e) => set("company", e.target.value)}
                />
              </Field>
              <Field label="Cargo">
                <input
                  className={inputClass}
                  placeholder="Ex: CEO"
                  value={values.role}
                  onChange={(e) => set("role", e.target.value)}
                />
              </Field>
            </div>

            <Field label="Status">
              <div className="relative">
                <select
                  value={values.status}
                  onChange={(e) => set("status", e.target.value as LeadStatus)}
                  className={cn(inputClass, "appearance-none pr-8 cursor-pointer")}
                >
                  {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_CONFIG[s].label}
                    </option>
                  ))}
                </select>
              </div>
            </Field>

            <Field label="Responsável">
              <div className="relative">
                <select
                  value={values.owner_id}
                  onChange={(e) => set("owner_id", e.target.value)}
                  className={cn(inputClass, "appearance-none pr-8 cursor-pointer")}
                >
                  <option value="">Sem responsável</option>
                  {MOCK_PROFILES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
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
              {initialData?.id ? "Salvar alterações" : "Criar lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
