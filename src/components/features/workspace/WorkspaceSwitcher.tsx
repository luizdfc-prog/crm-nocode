"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check, Building2, Plus, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useWorkspaces } from "@/hooks/useWorkspaces"
import { createClient } from "@/lib/supabase/client"
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/supabase/workspace-cookie"

export function WorkspaceSwitcher() {
  const { workspaces, activeWorkspace, setActiveWorkspaceId, loading } =
    useWorkspaces()

  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState("")
  const [createError, setCreateError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setShowNewForm(false)
        setNewName("")
        setCreateError(null)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  async function handleCreateWorkspace(e: React.FormEvent) {
    e.preventDefault()
    if (newName.trim().length < 2) {
      setCreateError("Nome deve ter ao menos 2 caracteres")
      return
    }

    setCreating(true)
    setCreateError(null)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setCreating(false)
      return
    }

    // Criar workspace
    const { data: ws, error: wsError } = await supabase
      .from("workspaces")
      .insert({ name: newName.trim() })
      .select("id")
      .single()

    if (wsError || !ws) {
      setCreateError("Erro ao criar workspace")
      setCreating(false)
      return
    }

    // Adicionar usuário como admin
    const { error: memberError } = await supabase
      .from("workspace_members")
      .insert({ workspace_id: ws.id, profile_id: user.id, role: "admin" })

    if (memberError) {
      setCreateError("Erro ao configurar workspace")
      setCreating(false)
      return
    }

    setActiveWorkspaceId(ws.id)
    setShowNewForm(false)
    setNewName("")
    setOpen(false)

    // Recarregar a página para refletir novo workspace
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-2 py-2">
        <Loader2 className="size-4 animate-spin text-pf-text-muted" />
        <span className="text-xs text-pf-text-muted">Carregando…</span>
      </div>
    )
  }

  if (!activeWorkspace) {
    return (
      <div className="px-2 py-2 text-xs text-pf-text-muted">
        Nenhum workspace
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setOpen((v) => !v)
          setShowNewForm(false)
        }}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-pf-surface-2"
      >
        <div className="flex size-6 shrink-0 items-center justify-center rounded-[5px] border border-pf-border bg-pf-surface-2">
          <Building2 className="size-3.5 text-pf-text-sec" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold leading-tight text-pf-text">
            {activeWorkspace.name}
          </p>
          <p className="text-[10px] capitalize leading-tight text-pf-text-muted">
            {activeWorkspace.plan}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-pf-text-muted transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-lg border border-pf-border bg-pf-surface shadow-xl shadow-black/40">
          <div className="px-2 pb-1 pt-2">
            <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-pf-text-muted">
              Workspaces
            </p>
            <ul className="space-y-0.5">
              {workspaces.map((workspace) => (
                <li key={workspace.id}>
                  <button
                    onClick={() => {
                      setActiveWorkspaceId(workspace.id)
                      document.cookie = `${ACTIVE_WORKSPACE_COOKIE}=${workspace.id};path=/;max-age=31536000;samesite=lax`
                      setOpen(false)
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-pf-surface-2"
                  >
                    <div className="flex size-5 shrink-0 items-center justify-center rounded-[4px] border border-pf-border bg-pf-surface-2">
                      <Building2 className="size-3 text-pf-text-muted" />
                    </div>
                    <span className="min-w-0 flex-1 truncate text-xs text-pf-text">
                      {workspace.name}
                    </span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span
                        className={cn(
                          "rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                          workspace.plan === "pro"
                            ? "border border-pf-accent/30 bg-pf-accent/10 text-pf-accent"
                            : "border border-pf-border text-pf-text-muted",
                        )}
                      >
                        {workspace.plan}
                      </span>
                      {workspace.id === activeWorkspace.id && (
                        <Check className="size-3 text-pf-accent" />
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-pf-border px-2 py-1.5">
            {showNewForm ? (
              <form onSubmit={handleCreateWorkspace} className="px-2 py-1">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value)
                    setCreateError(null)
                  }}
                  placeholder="Nome do workspace"
                  autoFocus
                  className="mb-2 h-8 w-full rounded-md border border-pf-border bg-pf-surface-2 px-2 text-xs text-pf-text placeholder:text-pf-text-muted focus:border-pf-accent focus:outline-none"
                />
                {createError && (
                  <p className="mb-1.5 text-[10px] text-pf-negative">
                    {createError}
                  </p>
                )}
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewForm(false)
                      setNewName("")
                      setCreateError(null)
                    }}
                    className="flex-1 rounded-md border border-pf-border py-1 text-[11px] text-pf-text-muted hover:bg-pf-surface-2"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex flex-1 items-center justify-center gap-1 rounded-md bg-pf-accent py-1 text-[11px] font-semibold text-pf-bg disabled:opacity-60"
                  >
                    {creating ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      "Criar"
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowNewForm(true)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-pf-text-muted transition-colors hover:bg-pf-surface-2 hover:text-pf-text"
              >
                <Plus className="size-3.5" />
                Novo workspace
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
