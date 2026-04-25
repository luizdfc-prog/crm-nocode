"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { Loader2, Users } from "lucide-react"
import { AuthCard } from "@/components/features/auth/AuthCard"
import { FormField, Input } from "@/components/features/auth/FormField"
import { PasswordInput } from "@/components/features/auth/PasswordInput"
import { Button } from "@/components/ui/button"

// Mock do convite — será buscado via token no M10
const MOCK_INVITE = {
  workspaceName: "Acme Vendas",
  inviterName: "João Silva",
  role: "member" as "admin" | "member",
}

const ROLE_LABEL: Record<"admin" | "member", string> = {
  admin: "Admin",
  member: "Membro",
}

const acceptSchema = z
  .object({
    name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
    password: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirmação obrigatória"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  })

type AcceptFields = { name: string; password: string; confirmPassword: string }
type FieldErrors = Partial<Record<keyof AcceptFields, string>>

export default function InvitePage() {
  const router = useRouter()
  const [values, setValues] = useState<AcceptFields>({
    name: "",
    password: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)

  function set(field: keyof AcceptFields, value: string) {
    setValues((v) => ({ ...v, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const result = acceptSchema.safeParse(values)
    if (!result.success) {
      const fieldErrors: FieldErrors = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof AcceptFields
        if (!fieldErrors[key]) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setLoading(true)
    // Fake invite acceptance — será substituído no M10
    await new Promise((r) => setTimeout(r, 1200))
    setLoading(false)
    router.push("/dashboard")
  }

  return (
    <AuthCard
      title="Você foi convidado"
      subtitle={`${MOCK_INVITE.inviterName} te convidou para o workspace`}
    >
      {/* Preview do workspace */}
      <div className="mb-6 flex items-center gap-3 rounded-lg border border-pf-border bg-pf-surface-2 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pf-accent/10">
          <Users className="size-4 text-pf-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-pf-text">
            {MOCK_INVITE.workspaceName}
          </p>
          <p className="text-xs text-pf-text-muted">
            Seu papel:{" "}
            <span className="font-medium text-pf-text-sec">
              {ROLE_LABEL[MOCK_INVITE.role]}
            </span>
          </p>
        </div>
        <span className="shrink-0 rounded-md border border-pf-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pf-text-muted">
          {ROLE_LABEL[MOCK_INVITE.role]}
        </span>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormField label="Seu nome" error={errors.name}>
          <Input
            type="text"
            placeholder="Como quer ser chamado?"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            hasError={!!errors.name}
            autoComplete="name"
            autoFocus
          />
        </FormField>

        <FormField label="Criar senha" error={errors.password}>
          <PasswordInput
            placeholder="Mínimo 8 caracteres"
            value={values.password}
            onChange={(e) => set("password", e.target.value)}
            hasError={!!errors.password}
            autoComplete="new-password"
          />
        </FormField>

        <FormField label="Confirmar senha" error={errors.confirmPassword}>
          <PasswordInput
            placeholder="Repita a senha"
            value={values.confirmPassword}
            onChange={(e) => set("confirmPassword", e.target.value)}
            hasError={!!errors.confirmPassword}
            autoComplete="new-password"
          />
        </FormField>

        <Button
          type="submit"
          disabled={loading}
          className="mt-1 h-10 w-full bg-pf-accent font-semibold text-pf-bg hover:bg-pf-accent/90"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Aceitando convite…
            </>
          ) : (
            "Aceitar convite e entrar"
          )}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-pf-text-sec">
        Já tem uma conta?{" "}
        <Link
          href="/login"
          className="font-medium text-pf-accent underline-offset-4 hover:underline"
        >
          Entrar
        </Link>
      </p>
    </AuthCard>
  )
}
