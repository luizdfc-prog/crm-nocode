"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import { AuthCard } from "@/components/features/auth/AuthCard"
import { FormField, Input } from "@/components/features/auth/FormField"
import { PasswordInput } from "@/components/features/auth/PasswordInput"
import { Button } from "@/components/ui/button"

const loginSchema = z.object({
  email: z.string().min(1, "E-mail obrigatório").email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
})

type LoginFields = z.infer<typeof loginSchema>
type FieldErrors = Partial<Record<keyof LoginFields, string>>

export default function LoginPage() {
  const router = useRouter()
  const [values, setValues] = useState<LoginFields>({ email: "", password: "" })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState("")
  const [loading, setLoading] = useState(false)

  function set(field: keyof LoginFields, value: string) {
    setValues((v) => ({ ...v, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
    setFormError("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")

    const result = loginSchema.safeParse(values)
    if (!result.success) {
      const fieldErrors: FieldErrors = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof LoginFields
        if (!fieldErrors[key]) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setLoading(true)
    // Fake auth — será substituído pelo Supabase Auth no M7
    await new Promise((r) => setTimeout(r, 1200))
    setLoading(false)
    router.push("/dashboard")
  }

  return (
    <AuthCard title="Bem-vindo de volta" subtitle="Entre na sua conta para continuar">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormField label="E-mail" error={errors.email}>
          <Input
            type="email"
            placeholder="voce@empresa.com"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            hasError={!!errors.email}
            autoComplete="email"
            autoFocus
          />
        </FormField>

        <FormField label="Senha" error={errors.password}>
          <PasswordInput
            placeholder="Sua senha"
            value={values.password}
            onChange={(e) => set("password", e.target.value)}
            hasError={!!errors.password}
            autoComplete="current-password"
          />
        </FormField>

        {formError && (
          <p className="rounded-lg border border-pf-negative/20 bg-pf-negative/5 px-3 py-2.5 text-sm text-pf-negative">
            {formError}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="mt-1 h-10 w-full bg-pf-accent font-semibold text-pf-bg hover:bg-pf-accent/90"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Entrando…
            </>
          ) : (
            "Entrar"
          )}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-pf-text-sec">
        Não tem uma conta?{" "}
        <Link
          href="/signup"
          className="font-medium text-pf-accent underline-offset-4 hover:underline"
        >
          Cadastre-se grátis
        </Link>
      </p>
    </AuthCard>
  )
}
