"use client"

import { useState } from "react"
import { z } from "zod"
import { X, Loader2, Send } from "lucide-react"

interface InviteModalProps {
  onClose: () => void
  onSuccess: () => void
}

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  role: z.enum(["admin", "member"]),
})

export function InviteModal({ onClose, onSuccess }: InviteModalProps) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"admin" | "member">("member")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const parsed = schema.safeParse({ email, role })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error)
        return
      }

      onSuccess()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-pf-border bg-pf-surface p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold text-pf-text">
              Convidar membro
            </h2>
            <p className="mt-0.5 text-sm text-pf-text-muted">
              Um e-mail com link de aceite será enviado
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-pf-text-muted hover:bg-pf-surface-2 hover:text-pf-text"
          >
            <X className="size-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-pf-negative/30 bg-pf-negative/10 px-4 py-3 text-sm text-pf-negative">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-pf-text-sec">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError(null)
              }}
              placeholder="colaborador@empresa.com"
              autoFocus
              className="h-10 rounded-lg border border-pf-border bg-pf-surface-2 px-3 text-sm text-pf-text placeholder:text-pf-text-muted focus:border-pf-accent focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-pf-text-sec">
              Papel
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "member")}
              className="h-10 rounded-lg border border-pf-border bg-pf-surface-2 px-3 text-sm text-pf-text focus:border-pf-accent focus:outline-none"
            >
              <option value="member">Membro — visualiza e edita leads/deals</option>
              <option value="admin">Admin — gerencia membros e workspace</option>
            </select>
          </div>

          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 flex-1 items-center justify-center rounded-xl border border-pf-border text-sm font-medium text-pf-text-sec hover:bg-pf-surface-2"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-pf-accent text-sm font-semibold text-pf-bg transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Send className="size-4" />
                  Enviar convite
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
