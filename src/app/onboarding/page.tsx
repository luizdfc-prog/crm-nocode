"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { Loader2, Building2 } from "lucide-react"
import { AuthCard } from "@/components/features/auth/AuthCard"
import { FormField, Input } from "@/components/features/auth/FormField"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import type { WorkspacePlan } from "@/types/supabase"

const workspaceSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter ao menos 2 caracteres")
    .max(50, "Nome deve ter no máximo 50 caracteres"),
})

export default function OnboardingPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  function handleChange(value: string) {
    setName(value)
    setError("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const result = workspaceSchema.safeParse({ name })
    if (!result.success) {
      setError(result.error.issues[0].message)
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      setError("Sessão expirada. Faça login novamente.")
      setLoading(false)
      router.push("/login")
      return
    }
    void user // referência mantida para garantir sessão válida

    // O trigger on_workspace_created insere o criador como admin automaticamente
    const { error: wsError } = await supabase
      .from("workspaces")
      .insert({ name: result.data.name, plan: "free" as WorkspacePlan })

    setLoading(false)

    if (wsError) {
      setError("Erro ao criar workspace. Tente novamente.")
      return
    }

    router.push("/dashboard")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-pf-bg px-4 py-12">
      <AuthCard
        title="Configure seu workspace"
        subtitle="Dê um nome para o seu espaço de trabalho. Você pode mudar isso depois."
      >
        {/* Ilustração / ícone */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-pf-border bg-pf-surface-2">
            <Building2 className="size-6 text-pf-accent" />
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <FormField label="Nome do workspace" error={error}>
            <Input
              type="text"
              placeholder="Ex: Acme Vendas, Freelance, Minha Empresa…"
              value={name}
              onChange={(e) => handleChange(e.target.value)}
              hasError={!!error}
              autoFocus
              maxLength={50}
            />
          </FormField>

          {/* Contador de caracteres */}
          <p className="-mt-2 text-right text-xs text-pf-text-muted">
            {name.length}/50
          </p>

          <Button
            type="submit"
            disabled={loading}
            className="h-10 w-full bg-pf-accent font-semibold text-pf-bg hover:bg-pf-accent/90"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Criando workspace…
              </>
            ) : (
              "Criar workspace e entrar"
            )}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-pf-text-muted">
          Você pode convidar colaboradores depois nas configurações.
        </p>
      </AuthCard>
    </div>
  )
}
