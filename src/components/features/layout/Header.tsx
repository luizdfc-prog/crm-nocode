"use client"

import { usePathname } from "next/navigation"
import { Menu, Bell, Search } from "lucide-react"

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/leads": "Leads",
  "/pipeline": "Pipeline",
  "/activities": "Atividades",
  "/settings": "Configurações",
}

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  for (const [route, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(route + "/")) return title
  }
  return "PipeFlow"
}

interface HeaderProps {
  onToggleSidebar: () => void
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const pathname = usePathname()
  const title = getPageTitle(pathname)

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-pf-border bg-pf-surface px-4">
      <div className="flex items-center gap-3">
        {/* Hamburguer — só mobile */}
        <button
          onClick={onToggleSidebar}
          aria-label="Abrir menu"
          className="flex size-8 items-center justify-center rounded-md text-pf-text-sec transition-colors hover:bg-pf-surface-2 hover:text-pf-text lg:hidden"
        >
          <Menu className="size-5" />
        </button>

        <h1 className="font-heading text-lg font-bold leading-none text-pf-text">{title}</h1>
      </div>

      <div className="flex items-center gap-1">
        <button
          aria-label="Buscar"
          className="flex size-8 items-center justify-center rounded-md text-pf-text-muted transition-colors hover:bg-pf-surface-2 hover:text-pf-text"
        >
          <Search className="size-4" />
        </button>

        <button
          aria-label="Notificações"
          className="relative flex size-8 items-center justify-center rounded-md text-pf-text-muted transition-colors hover:bg-pf-surface-2 hover:text-pf-text"
        >
          <Bell className="size-4" />
          {/* Indicador de notificação */}
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-pf-accent" />
        </button>

        {/* Avatar */}
        <div className="ml-1 flex size-7 cursor-pointer items-center justify-center rounded-full border border-pf-border bg-pf-surface-2 text-[11px] font-semibold uppercase text-pf-text transition-colors hover:border-pf-accent/40">
          JS
        </div>
      </div>
    </header>
  )
}
