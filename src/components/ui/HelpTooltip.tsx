"use client"

import { useState, useRef, useEffect } from "react"
import { HelpCircle } from "lucide-react"

interface HelpTooltipProps {
  content: React.ReactNode
  width?: number // largura do popover em px, default 280
}

export function HelpTooltip({ content, width = 280 }: HelpTooltipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen((v) => !v) }}
        className="flex items-center justify-center text-pf-text-sec hover:text-pf-accent transition-colors"
        aria-label="Ajuda"
      >
        <HelpCircle className="size-4" />
      </button>

      {open && (
        <div
          className="absolute left-5 top-0 z-50 rounded-xl border border-pf-border bg-pf-surface shadow-xl"
          style={{ width }}
        >
          {/* Seta */}
          <div className="absolute -left-1.5 top-2 size-3 rotate-45 rounded-sm border-l border-t border-pf-border bg-pf-surface" />
          <div className="relative p-4 text-xs text-pf-text-sec leading-relaxed">
            {content}
          </div>
        </div>
      )}
    </div>
  )
}
