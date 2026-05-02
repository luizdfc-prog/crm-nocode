"use client"

import { useState } from "react"
import { Loader2, Check } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { WorkspaceRow } from "@/types/supabase"

interface WorkspaceTabProps {
  workspace: WorkspaceRow
  onUpdate: (name: string) => void
}

export function WorkspaceTab({ workspace, onUpdate }: WorkspaceTabProps) {
  const [name, setName] = useState(workspace.name)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isDirty = name.trim() !== workspace.name

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!isDirty || name.trim().length < 2) return

    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from("workspaces")
      .update({ name: name.trim() })
      .eq("id", workspace.id)

    setSaving(false)

    if (updateError) {
      setError("Erro ao salvar. Tente novamente.")
      return
    }

    onUpdate(name.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="font-heading text-base font-bold text-pf-text">
          Informações do Workspace
        </h3>
        <p className="mt-0.5 text-sm text-pf-text-muted">
          Edite o nome do seu workspace
        </p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-pf-text-sec">
            Nome do workspace
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
              setSaved(false)
            }}
            placeholder="Nome da empresa ou projeto"
            className="h-10 max-w-sm rounded-lg border border-pf-border bg-pf-surface-2 px-3 text-sm text-pf-text placeholder:text-pf-text-muted focus:border-pf-accent focus:outline-none"
          />
          {error && <p className="text-xs text-pf-negative">{error}</p>}
        </div>

        <div>
          <button
            type="submit"
            disabled={!isDirty || saving || name.trim().length < 2}
            className="flex h-9 items-center gap-2 rounded-lg bg-pf-accent px-4 text-sm font-semibold text-pf-bg transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : saved ? (
              <Check className="size-3.5" />
            ) : null}
            {saved ? "Salvo!" : "Salvar alterações"}
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-pf-border bg-pf-surface-2 p-4">
        <p className="text-xs font-medium text-pf-text-muted uppercase tracking-wide">
          ID do workspace
        </p>
        <p className="mt-1 font-mono text-xs text-pf-text-sec">{workspace.id}</p>
      </div>
    </div>
  )
}
