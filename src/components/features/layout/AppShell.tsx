"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-pf-bg">
      {/* Overlay para mobile */}
      <div
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-20 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setSidebarOpen(false)}
      />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Área principal — offset pelo sidebar no desktop */}
      <div className="flex min-w-0 flex-1 flex-col lg:ml-[240px]">
        <Header onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
