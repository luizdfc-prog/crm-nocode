"use client"

import { useState } from "react"
import { Loader2, Phone, Mail, Users, FileText } from "lucide-react"
import { z } from "zod"
import { cn } from "@/lib/utils"
import type { ActivityType } from "@/types"

const activitySchema = z.object({
  type: z.enum(["ligacao", "email", "reuniao", "nota"]),
  description: z.string().min(5, "Descrição deve ter ao menos 5 caracteres"),
  activity_date: z.string().min(1, "Data obrigatória"),
})

type ActivityFormData = z.infer<typeof activitySchema>

const TYPE_OPTIONS: { value: ActivityType; label: string; icon: React.ReactNode }[] = [
  { value: "ligacao", label: "Ligação", icon: <Phone className="size-3.5" /> },
  { value: "email", label: "E-mail", icon: <Mail className="size-3.5" /> },
  { value: "reuniao", label: "Reunião", icon: <Users className="size-3.5" /> },
  { value: "nota", label: "Nota", icon: <FileText className="size-3.5" /> },
]

interface ActivityFormProps {
  onSubmit: (data: ActivityFormData) => void | Promise<void>
}

export function ActivityForm({ onSubmit }: ActivityFormProps) {
  const [type, setType] = useState<ActivityType>("ligacao")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16))
  const [errors, setErrors] = useState<Partial<Record<keyof ActivityFormData, string>>>({})
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = activitySchema.safeParse({ type, description, activity_date: date })
    if (!result.success) {
      const fieldErrors: typeof errors = {}
      for (const issue of result.error.issues) {
        fieldErrors[issue.path[0] as keyof ActivityFormData] = issue.message
      }
      setErrors(fieldErrors)
      return
    }
    setLoading(true)
    await onSubmit(result.data)
    setLoading(false)
    setDescription("")
    setDate(new Date().toISOString().slice(0, 16))
    setErrors({})
    setExpanded(false)
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex w-full items-center gap-3 rounded-xl border border-dashed border-pf-border bg-pf-surface px-4 py-3 text-sm text-pf-text-muted transition-colors hover:border-pf-accent/40 hover:text-pf-text-sec"
      >
        <FileText className="size-4 shrink-0" />
        Registrar atividade...
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-pf-border bg-pf-surface p-4"
    >
      {/* Tipo */}
      <div className="flex gap-2">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setType(opt.value)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors",
              type === opt.value
                ? "border-pf-accent/40 bg-pf-accent/10 text-pf-accent"
                : "border-pf-border bg-pf-surface-2 text-pf-text-muted hover:text-pf-text"
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>

      {/* Descrição */}
      <div className="flex flex-col gap-1.5">
        <textarea
          rows={3}
          placeholder="Descreva o que aconteceu..."
          value={description}
          onChange={(e) => {
            setDescription(e.target.value)
            if (errors.description) setErrors((p) => ({ ...p, description: undefined }))
          }}
          className={cn(
            "w-full resize-none rounded-lg border border-pf-border bg-pf-surface-2 px-3 py-2 text-sm text-pf-text placeholder:text-pf-text-muted outline-none transition-colors focus:border-pf-accent/50",
            errors.description && "border-pf-negative/50"
          )}
        />
        {errors.description && (
          <p className="text-xs text-pf-negative">{errors.description}</p>
        )}
      </div>

      {/* Data */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-pf-text-muted">Data e hora</label>
        <input
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-9 w-full rounded-lg border border-pf-border bg-pf-surface-2 px-3 text-sm text-pf-text outline-none transition-colors focus:border-pf-accent/50"
        />
      </div>

      {/* Ações */}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="h-8 rounded-lg border border-pf-border px-3 text-xs text-pf-text-sec transition-colors hover:bg-pf-surface-2 hover:text-pf-text"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-pf-accent px-3 text-xs font-semibold text-pf-bg transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading && <Loader2 className="size-3.5 animate-spin" />}
          Registrar
        </button>
      </div>
    </form>
  )
}
