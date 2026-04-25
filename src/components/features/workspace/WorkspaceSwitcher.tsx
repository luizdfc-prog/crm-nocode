"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check, Building2, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

const MOCK_WORKSPACES = [
  { id: "1", name: "Empresa Alfa", plan: "free" as const },
  { id: "2", name: "Projeto Beta", plan: "pro" as const },
  { id: "3", name: "Startup Gama", plan: "free" as const },
]

export function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState("1")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  const active = MOCK_WORKSPACES.find((w) => w.id === activeId) ?? MOCK_WORKSPACES[0]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-pf-surface-2"
      >
        <div className="flex size-6 shrink-0 items-center justify-center rounded-[5px] border border-pf-border bg-pf-surface-2">
          <Building2 className="size-3.5 text-pf-text-sec" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold leading-tight text-pf-text">
            {active.name}
          </p>
          <p className="text-[10px] capitalize leading-tight text-pf-text-muted">{active.plan}</p>
        </div>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-pf-text-muted transition-transform duration-200",
            open && "rotate-180"
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
              {MOCK_WORKSPACES.map((workspace) => (
                <li key={workspace.id}>
                  <button
                    onClick={() => {
                      setActiveId(workspace.id)
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
                            : "border border-pf-border text-pf-text-muted"
                        )}
                      >
                        {workspace.plan}
                      </span>
                      {workspace.id === activeId && (
                        <Check className="size-3 text-pf-accent" />
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-pf-border px-2 py-1.5">
            <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-pf-text-muted transition-colors hover:bg-pf-surface-2 hover:text-pf-text">
              <Plus className="size-3.5" />
              Novo workspace
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
