"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!email.endsWith("@engenharia.app")) {
      setError("Acesso restrito a contas @engenharia.app")
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (authError) {
      setError("E-mail ou senha incorretos.")
      return
    }

    router.push("/admin")
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0C0C0E" }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-xs font-mono tracking-widest uppercase mb-2" style={{ color: "#555559" }}>EngenharIA</p>
          <h1 className="text-xl font-bold" style={{ color: "#E8E8E8", fontFamily: "Syne, sans-serif" }}>Painel Admin</h1>
          <p className="text-sm mt-1" style={{ color: "#555559" }}>Acesso restrito</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border p-6" style={{ borderColor: "#2A2A2E", backgroundColor: "#141416" }}>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "#8A8A8F" }}>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@engenharia.app"
              className="h-9 rounded-lg border px-3 text-sm outline-none transition-colors"
              style={{ borderColor: "#2A2A2E", backgroundColor: "#1A1A1E", color: "#E8E8E8" }}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "#8A8A8F" }}>Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-9 rounded-lg border px-3 text-sm outline-none transition-colors"
              style={{ borderColor: "#2A2A2E", backgroundColor: "#1A1A1E", color: "#E8E8E8" }}
            />
          </div>

          {error && (
            <p className="text-xs rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(255,71,87,0.08)", color: "#FF4757", border: "1px solid rgba(255,71,87,0.2)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-10 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            style={{ backgroundColor: "#CAFF33", color: "#0C0C0E" }}
          >
            {loading ? <><Loader2 className="size-4 animate-spin" /> Entrando…</> : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  )
}
