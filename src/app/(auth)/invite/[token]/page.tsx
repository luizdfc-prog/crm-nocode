"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { z } from "zod"
import { Loader2, Users, CheckCircle2, XCircle } from "lucide-react"
import { AuthCard } from "@/components/features/auth/AuthCard"
import { FormField, Input } from "@/components/features/auth/FormField"
import { PasswordInput } from "@/components/features/auth/PasswordInput"
import { Button } from "@/components/ui/button"

const ROLE_LABEL: Record<"admin" | "member", string> = {
  admin: "Administrador",
  member: "Membro",
}

interface InvitePreview {
  invite: {
    id: string
    email: string
    role: "admin" | "member"
    expires_at: string
  }
  workspace: {
    name: string
    plan: "free" | "pro"
  }
}

const acceptSchema = z
  .object({
    name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
    password: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
    confirmPassword: z.string().min(1, "Confirmação obrigatória"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  })

type AcceptFields = z.infer<typeof acceptSchema>
type FieldErrors = Partial<Record<keyof AcceptFields, string>>

type PageState =
  | { status: "loading" }
  | { status: "ready"; preview: InvitePreview }
  | { status: "invalid"; message: string }
  | { status: "success" }

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()

  const [pageState, setPageState] = useState<PageState>({ status: "loading" })
  const [values, setValues] = useState<AcceptFields>({
    name: "",
    password: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchInvite() {
      const res = await fetch(`/api/invites/${token}`)
      const data = await res.json()
      if (!res.ok) {
        setPageState({ status: "invalid", message: data.error })
        return
      }
      setPageState({ status: "ready", preview: data })
    }
    fetchInvite()
  }, [token])

  function set(field: keyof AcceptFields, value: string) {
    setValues((v) => ({ ...v, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
    setSubmitError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pageState.status !== "ready") return

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
    setSubmitError(null)

    try {
      const res = await fetch(`/api/invites/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: result.data.name,
          password: result.data.password,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setSubmitError(data.error)
        return
      }

      setPageState({ status: "success" })
      setTimeout(() => router.push("/dashboard"), 2000)
    } finally {
      setLoading(false)
    }
  }

  // ── Estados especiais ────────────────────────────────────────

  if (pageState.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pf-bg">
        <Loader2 className="size-8 animate-spin text-pf-accent" />
      </div>
    )
  }

  if (pageState.status === "success") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-pf-bg px-4 text-center">
        <CheckCircle2 className="size-12 text-pf-positive" />
        <h1 className="font-heading text-2xl font-bold text-pf-text">
          Convite aceito!
        </h1>
        <p className="text-sm text-pf-text-muted">
          Redirecionando para o dashboard…
        </p>
      </div>
    )
  }

  if (pageState.status === "invalid") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-pf-bg px-4 text-center">
        <XCircle className="size-12 text-pf-negative" />
        <h1 className="font-heading text-2xl font-bold text-pf-text">
          Convite inválido
        </h1>
        <p className="text-sm text-pf-text-muted">{pageState.message}</p>
        <Link
          href="/login"
          className="mt-2 text-sm text-pf-accent underline-offset-4 hover:underline"
        >
          Ir para o login
        </Link>
      </div>
    )
  }

  const { preview } = pageState

  return (
    <AuthCard
      title="Você foi convidado"
      subtitle={`Para o workspace ${preview.workspace.name}`}
    >
      {/* Preview do workspace */}
      <div className="mb-6 flex items-center gap-3 rounded-lg border border-pf-border bg-pf-surface-2 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pf-accent/10">
          <Users className="size-4 text-pf-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-pf-text">
            {preview.workspace.name}
          </p>
          <p className="text-xs text-pf-text-muted">
            {preview.invite.email} ·{" "}
            <span className="font-medium text-pf-text-sec">
              {ROLE_LABEL[preview.invite.role]}
            </span>
          </p>
        </div>
        <span className="shrink-0 rounded-md border border-pf-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pf-text-muted">
          {ROLE_LABEL[preview.invite.role]}
        </span>
      </div>

      {submitError && (
        <div className="mb-4 rounded-lg border border-pf-negative/30 bg-pf-negative/10 px-4 py-3 text-sm text-pf-negative">
          {submitError}
        </div>
      )}

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
            placeholder="Mínimo 6 caracteres"
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
