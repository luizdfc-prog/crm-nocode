"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Kanban, Activity, Settings, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { WorkspaceSwitcher } from "@/components/features/workspace/WorkspaceSwitcher"

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/activities", label: "Atividades", icon: Activity },
  { href: "/settings", label: "Configurações", icon: Settings },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex w-[240px] flex-col",
        "border-r border-pf-border bg-pf-surface",
        "transition-transform duration-300 ease-in-out",
        "lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between border-b border-pf-border px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-pf-accent">
            <span className="select-none font-heading text-[13px] font-black leading-none text-pf-bg">
              P
            </span>
          </div>
          <span className="font-heading text-[17px] font-bold tracking-tight text-pf-text">
            PipeFlow
          </span>
        </div>

        {/* Fechar — só mobile */}
        <button
          onClick={onClose}
          aria-label="Fechar menu"
          className="flex size-7 items-center justify-center rounded-md text-pf-text-muted transition-colors hover:bg-pf-surface-2 hover:text-pf-text lg:hidden"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Workspace switcher */}
      <div className="border-b border-pf-border px-3 py-3">
        <WorkspaceSwitcher />
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-pf-text-muted select-none">
          Menu
        </p>
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive =
              pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"))

            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-150",
                    isActive
                      ? "bg-[rgba(202,255,51,0.09)] font-medium text-pf-accent"
                      : "text-pf-text-sec hover:bg-pf-surface-2 hover:text-pf-text"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0 transition-colors",
                      isActive ? "text-pf-accent" : "text-pf-text-muted"
                    )}
                  />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Rodapé — usuário + plano */}
      <div className="border-t border-pf-border p-3">
        <div className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-pf-surface-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-pf-border bg-pf-surface-2 text-[11px] font-semibold uppercase text-pf-text">
            JS
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium leading-tight text-pf-text">
              João Silva
            </p>
            <p className="truncate text-[10px] leading-tight text-pf-text-muted">
              joao@empresa.com
            </p>
          </div>
          <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide border border-pf-border text-pf-text-muted">
            Free
          </span>
        </div>
      </div>
    </aside>
  )
}
