"use client"

import { useTransition } from "react"
import { Zap, Check, Loader2, ExternalLink } from "lucide-react"
import { createCheckoutSession, createPortalSession } from "@/app/actions/stripe"
import type { WorkspaceRow } from "@/types/supabase"
import type { WorkspacePlan } from "@/types"

interface PlanTabProps {
  workspace: WorkspaceRow
  currentUserRole: "admin" | "member"
  upgradeSuccess?: boolean
}

interface PlanConfig {
  key: WorkspacePlan
  label: string
  price: string
  priceNote: string
  leadsLimit: string
  description: string
  features: string[]
  highlight?: boolean
}

const PLANS: PlanConfig[] = [
  {
    key: "free",
    label: "Free",
    price: "R$0",
    priceNote: "sempre",
    leadsLimit: "50 leads/mês",
    description: "Para começar a organizar seus contatos.",
    features: ["50 leads por mês", "Até 2 membros", "Pipeline Kanban", "Atividades e timeline"],
  },
  {
    key: "starter",
    label: "Starter",
    price: "R$49",
    priceNote: "mês",
    leadsLimit: "300 leads/mês",
    description: "Para freelancers e pequenos times.",
    features: ["300 leads por mês", "Membros ilimitados", "Pipeline Kanban", "Atividades e timeline", "Agente IA no WhatsApp"],
  },
  {
    key: "pro",
    label: "Pro",
    price: "R$149",
    priceNote: "mês",
    leadsLimit: "1.000 leads/mês",
    description: "Para times que precisam escalar.",
    features: ["1.000 leads por mês", "Membros ilimitados", "Pipeline Kanban", "Atividades e timeline", "Agente IA no WhatsApp", "Suporte prioritário"],
    highlight: true,
  },
  {
    key: "scale",
    label: "Scale",
    price: "R$299",
    priceNote: "mês",
    leadsLimit: "Leads ilimitados",
    description: "Para operações de alto volume.",
    features: ["Leads ilimitados", "Membros ilimitados", "Pipeline Kanban", "Atividades e timeline", "Agente IA no WhatsApp", "Suporte prioritário"],
  },
]

export function PlanTab({ workspace, currentUserRole, upgradeSuccess }: PlanTabProps) {
  const currentPlan = (workspace.plan ?? "free") as WorkspacePlan
  const isAdmin = currentUserRole === "admin"
  const isPaid = currentPlan !== "free"

  const [checkoutPending, startCheckout] = useTransition()
  const [portalPending, startPortal] = useTransition()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="font-heading text-base font-bold text-pf-text">Plano & Cobrança</h3>
        <p className="mt-0.5 text-sm text-pf-text-muted">Gerencie sua assinatura do Z4P</p>
      </div>

      {upgradeSuccess && (
        <div className="flex items-center gap-3 rounded-xl border border-pf-positive/30 bg-pf-positive/10 px-4 py-3">
          <Zap className="size-4 shrink-0 text-pf-positive" />
          <p className="text-sm font-medium text-pf-positive">
            Plano ativado com sucesso! Aproveite.
          </p>
        </div>
      )}

      {/* Status atual */}
      <div className="flex items-center justify-between rounded-xl border border-pf-border bg-pf-surface-2 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-pf-text-muted">Plano atual</p>
          <p className="mt-0.5 font-heading text-2xl font-bold text-pf-text">
            {PLANS.find((p) => p.key === currentPlan)?.label ?? currentPlan}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-pf-text-sec">
            {PLANS.find((p) => p.key === currentPlan)?.leadsLimit}
          </span>
          {isPaid ? (
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
      </div>

      {/* Grid de planos */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const isCurrent = plan.key === currentPlan
          const isPaidPlan = plan.key !== "free"

          return (
            <div
              key={plan.key}
              className={`relative flex flex-col rounded-xl border p-4 ${
                isCurrent
                  ? "border-pf-accent bg-pf-accent/5"
                  : plan.highlight
                  ? "border-pf-accent/30 bg-pf-surface"
                  : "border-pf-border bg-pf-surface"
              }`}
            >
              {plan.highlight && !isCurrent && (
                <span className="absolute right-3 top-3 rounded-full bg-pf-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pf-accent">
                  Popular
                </span>
              )}

              <div className="mb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-pf-text-muted">{plan.label}</p>
                <p className="mt-1 font-heading text-2xl font-extrabold text-pf-text">
                  {plan.price}
                  <span className="text-sm font-normal text-pf-text-muted">/{plan.priceNote}</span>
                </p>
                <p className="mt-1 text-xs font-medium text-pf-accent">{plan.leadsLimit}</p>
              </div>

              <ul className="mb-4 flex flex-1 flex-col gap-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-pf-text-sec">
                    <Check className="mt-0.5 size-3 shrink-0 text-pf-positive" />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="flex flex-col gap-2">
                  <p className="text-center text-xs font-semibold text-pf-accent">Plano atual</p>
                  {isPaid && (
                    <button
                      onClick={() => isAdmin && startPortal(() => createPortalSession())}
                      disabled={!isAdmin || portalPending}
                      className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-pf-border text-xs font-semibold text-pf-text-sec transition-colors hover:border-pf-accent/40 hover:text-pf-accent disabled:opacity-50"
                    >
                      {portalPending ? <Loader2 className="size-3 animate-spin" /> : <ExternalLink className="size-3" />}
                      Gerenciar
                    </button>
                  )}
                </div>
              ) : isPaidPlan ? (
                <button
                  onClick={() => {
                    if (!isAdmin) return
                    startCheckout(() => createCheckoutSession(plan.key as "starter" | "pro" | "scale"))
                  }}
                  disabled={!isAdmin || checkoutPending}
                  title={!isAdmin ? "Apenas admins podem fazer upgrade" : undefined}
                  className={`flex h-8 w-full items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${
                    plan.highlight
                      ? "bg-pf-accent text-pf-bg"
                      : "border border-pf-border bg-pf-surface-2 text-pf-text"
                  }`}
                >
                  {checkoutPending ? <Loader2 className="size-3 animate-spin" /> : null}
                  {checkoutPending ? "Redirecionando..." : "Assinar"}
                </button>
              ) : null}
            </div>
          )
        })}
      </div>

      {!isAdmin && (
        <p className="text-xs text-pf-text-muted">Apenas admins podem gerenciar o plano.</p>
      )}

      <p className="text-xs text-pf-text-muted">
        Pagamentos processados com segurança pelo Stripe. Cancele a qualquer momento.
      </p>
    </div>
  )
}
