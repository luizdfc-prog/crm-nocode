"use client"

import { useState, useTransition } from "react"
import { Pencil, Check, X, Loader2 } from "lucide-react"
import { upsertFieldValues } from "@/actions/customFields"
import type { LeadFieldWithValue } from "@/types"

interface Props {
  fields: LeadFieldWithValue[]
  leadId: string
  onSaved?: (updated: LeadFieldWithValue[]) => void
}

const inputClass =
  "h-8 w-full rounded-lg border border-pf-border bg-pf-surface px-2.5 text-sm text-pf-text outline-none transition-colors focus:border-pf-accent/50"

function formatDisplayValue(field: LeadFieldWithValue): string {
  if (!field.value) return "—"
  if (field.field_type === "multiselect") {
    try {
      const arr = JSON.parse(field.value) as string[]
      return arr.join(", ") || "—"
    } catch {
      return field.value
    }
  }
  if (field.field_type === "date") {
    try {
      return new Date(field.value + "T00:00:00").toLocaleDateString("pt-BR")
    } catch {
      return field.value
    }
  }
  return field.value
}

interface FieldEditorProps {
  field: LeadFieldWithValue
  editValue: string
  onChange: (v: string) => void
}

function FieldEditor({ field, editValue, onChange }: FieldEditorProps) {
  if (field.field_type === "select") {
    return (
      <select
        value={editValue}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass + " cursor-pointer"}
      >
        <option value="">— selecione —</option>
        {field.options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    )
  }

  if (field.field_type === "multiselect") {
    let selected: string[] = []
    try { selected = JSON.parse(editValue || "[]") } catch { selected = [] }
    return (
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-pf-border bg-pf-surface p-2">
        {field.options.map((opt) => {
          const active = selected.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              onClick={() => {
                const next = active ? selected.filter((s) => s !== opt) : [...selected, opt]
                onChange(JSON.stringify(next))
              }}
              className="rounded-md px-2 py-0.5 text-xs font-medium transition-colors"
              style={{
                backgroundColor: active ? "#CAFF33" : "var(--surface-2)",
                color: active ? "#0C0C0E" : "var(--text-muted)",
                border: "1px solid var(--border)",
              }}
            >
              {opt}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <input
      type={field.field_type === "number" ? "number" : field.field_type === "date" ? "date" : "text"}
      value={editValue}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
    />
  )
}

export function CustomFieldsSection({ fields, leadId, onSaved }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>("")
  const [localFields, setLocalFields] = useState<LeadFieldWithValue[]>(fields)
  const [isPending, startTransition] = useTransition()

  function startEdit(field: LeadFieldWithValue) {
    setEditingId(field.id)
    setEditValue(field.value ?? "")
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValue("")
  }

  function saveEdit(field: LeadFieldWithValue) {
    const finalValue = editValue === "" ? null : editValue
    startTransition(async () => {
      await upsertFieldValues(leadId, { [field.id]: finalValue })
      const updated = localFields.map((f) =>
        f.id === field.id ? { ...f, value: finalValue } : f
      )
      setLocalFields(updated)
      onSaved?.(updated)
      setEditingId(null)
    })
  }

  if (localFields.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      {localFields.map((field) => {
        const isEditing = editingId === field.id

        return (
          <div key={field.id} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-xs text-pf-text-muted">{field.name}</p>
              {!isEditing && (
                <button
                  onClick={() => startEdit(field)}
                  className="flex size-5 items-center justify-center rounded text-pf-text-muted hover:text-pf-text opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ opacity: 1 }}
                >
                  <Pencil className="size-3" />
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="flex flex-col gap-1.5">
                <FieldEditor field={field} editValue={editValue} onChange={setEditValue} />
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => saveEdit(field)}
                    disabled={isPending}
                    className="flex items-center gap-1 rounded-lg bg-pf-accent px-2 py-1 text-[10px] font-semibold text-pf-bg hover:opacity-90 disabled:opacity-60"
                  >
                    {isPending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                    Salvar
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex items-center gap-1 rounded-lg border border-pf-border px-2 py-1 text-[10px] text-pf-text-sec hover:bg-pf-surface-2"
                  >
                    <X className="size-3" /> Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <p
                className="mt-0.5 text-sm text-pf-text cursor-pointer hover:text-pf-accent transition-colors"
                onClick={() => startEdit(field)}
                title="Clique para editar"
              >
                {formatDisplayValue(field)}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
