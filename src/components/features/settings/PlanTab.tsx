"use client"

import { useTransition } from "react"
import { Zap, Check, Users, Database, Loader2, ExternalLink } from "lucide-react"
import { createCheckoutSession, createPortalSession } from "@/app/actions/stripe"
import type { WorkspaceRow } from "@/types/supabase"

interface PlanTabProps {
  workspace: WorkspaceRow
  currentUserRole: "admin" | "member"
  upgradeSuccess?: boolean
}

const FREE_FEATURES = [
  "Até 50 leads",
  "Até 2 membros",
  "Pipeline Kanban",
  "Atividades e timeline",
]

const PRO_FEATURES = [
  "Leads ilimitados",
  "Membros ilimitados",
  "Pipeline Kanban",
  "Atividades e timeline",
  "Suporte prioritário",
]

export function PlanTab({ workspace, currentUserRole, upgradeSuccess }: PlanTabProps) {
  const isPro = workspace.plan === "pro"
  const isAdmin = currentUserRole === "admin"
  const [checkoutPending, startCheckout] = useTransition()
  const [portalPending, startPortal] = useTransition()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="font-heading text-base font-bold text-pf-text">
          Plano & Cobrança
        </h3>
        <p className="mt-0.5 text-sm text-pf-text-muted">
          Gerencie sua assinatura do PipeFlow
        </p>
      </div>

      {/* Banner de sucesso pós-checkout */}
      {upgradeSuccess && (
        <div className="flex items-center gap-3 rounded-xl border border-pf-positive/30 bg-pf-positive/10 px-4 py-3">
          <Zap className="size-4 shrink-0 text-pf-positive" />
          <p className="text-sm font-medium text-pf-positive">
            Plano Pro ativado com sucesso! Bem-vindo ao Pro.
          </p>
        </div>
      )}

      {/* Status atual */}
      <div className="rounded-xl border border-pf-border bg-pf-surface-2 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-pf-text-muted">
              Plano atual
            </p>
            <p className="mt-1 font-heading text-2xl font-bold text-pf-text">
              {isPro ? "Pro" : "Free"}
            </p>
          </div>
          {isPro ? (
            <span className="flex items-center gap-1.5 rounded-full bg-pf-accent/15 px-3 py-1 text-xs font-semibold text-pf-accent">
              <Zap className="size-3" />
              Ativo
            </span>
          ) : (
            <span className="rounded-full border border-pf-border bg-pf-surface px-3 py-1 text-xs font-medium text-pf-text-muted">
              Grátis
            </span>
          )}
        </div>

        {isPro && (
          <div className="mt-4 flex gap-4 border-t border-pf-border pt-4">
            <div className="flex items-center gap-2 text-sm text-pf-text-sec">
              <Users className="size-4 text-pf-text-muted" />
              Membros ilimitados
            </div>
            <div className="flex items-center gap-2 text-sm text-pf-text-sec">
              <Database className="size-4 text-pf-text-muted" />
              Leads ilimitados
            </div>
          </div>
        )}
      </div>

      {/* Cards de plano */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Free */}
        <div
          className={`rounded-xl border p-5 ${
            !isPro
              ? "border-pf-accent bg-pf-accent/5"
              : "border-pf-border bg-pf-surface"
          }`}
        >
          <div className="mb-4">
            <p className="font-heading text-base font-bold text-pf-text">Free</p>
            <p className="mt-1 font-heading text-3xl font-extrabold text-pf-text">
              R$0
              <span className="text-base font-normal text-pf-text-muted">
                /mês
              </span>
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-pf-text-sec">
                <Check className="size-4 shrink-0 text-pf-positive" />
                {f}
              </li>
            ))}
          </ul>
          {!isPro && (
            <p className="mt-4 text-xs font-medium text-pf-accent">
              Plano atual
            </p>
          )}
        </div>

        {/* Pro */}
        <div
          className={`rounded-xl border p-5 ${
            isPro
              ? "border-pf-accent bg-pf-accent/5"
              : "border-pf-border bg-pf-surface"
          }`}
        >
          <div className="mb-4">
            <p className="font-heading text-base font-bold text-pf-text">Pro</p>
            <p className="mt-1 font-heading text-3xl font-extrabold text-pf-text">
              R$49
              <span className="text-base font-normal text-pf-text-muted">
                /mês
              </span>
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-pf-text-sec">
                <Check className="size-4 shrink-0 text-pf-positive" />
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-4">
            {isPro ? (
              <button
                onClick={() => isAdmin && startPortal(() => createPortalSession())}
                disabled={!isAdmin || portalPending}
                className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-pf-accent/40 bg-transparent text-sm font-semibold text-pf-accent transition-colors hover:bg-pf-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {portalPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ExternalLink className="size-4" />
                )}
                {portalPending ? "Abrindo portal..." : "Gerenciar assinatura"}
              </button>
            ) : (
              <button
                onClick={() => isAdmin && startCheckout(() => createCheckoutSession())}
                disabled={!isAdmin || checkoutPending}
                title={!isAdmin ? "Apenas admins podem fazer upgrade" : undefined}
                className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-pf-accent text-sm font-semibold text-pf-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {checkoutPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Zap className="size-4" />
                )}
                {checkoutPending ? "Redirecionando..." : "Assinar Pro"}
              </button>
            )}
            {!isAdmin && (
              <p className="mt-2 text-center text-xs text-pf-text-muted">
                Apenas admins podem gerenciar o plano
              </p>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-pf-text-muted">
        Pagamentos processados com segurança pelo Stripe. Cancele a qualquer momento.
      </p>
    </div>
  )
}
