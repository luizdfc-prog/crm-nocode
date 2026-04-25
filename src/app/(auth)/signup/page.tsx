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

const signupSchema = z
  .object({
    name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
    email: z.string().min(1, "E-mail obrigatório").email("E-mail inválido"),
    password: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirmação obrigatória"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  })

type SignupFields = { name: string; email: string; password: string; confirmPassword: string }
type FieldErrors = Partial<Record<keyof SignupFields, string>>

export default function SignupPage() {
  const router = useRouter()
  const [values, setValues] = useState<SignupFields>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)

  function set(field: keyof SignupFields, value: string) {
    setValues((v) => ({ ...v, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const result = signupSchema.safeParse(values)
    if (!result.success) {
      const fieldErrors: FieldErrors = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof SignupFields
        if (!fieldErrors[key]) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setLoading(true)
    // Fake signup — será substituído pelo Supabase Auth no M7
    await new Promise((r) => setTimeout(r, 1200))
    setLoading(false)
    router.push("/onboarding")
  }

  return (
    <AuthCard title="Crie sua conta" subtitle="Comece grátis, sem cartão de crédito">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormField label="Nome completo" error={errors.name}>
          <Input
            type="text"
            placeholder="João Silva"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            hasError={!!errors.name}
            autoComplete="name"
            autoFocus
          />
        </FormField>

        <FormField label="E-mail" error={errors.email}>
          <Input
            type="email"
            placeholder="voce@empresa.com"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            hasError={!!errors.email}
            autoComplete="email"
          />
        </FormField>

        <FormField label="Senha" error={errors.password}>
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
              Criando conta…
            </>
          ) : (
            "Criar conta grátis"
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
