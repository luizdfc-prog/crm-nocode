"use client"

import { useState, useTransition } from "react"
import { Zap, Check, Loader2, ExternalLink, Plus, Minus, Users } from "lucide-react"
import { createCheckoutSession, createPortalSession, updateSeats } from "@/app/actions/stripe"
import type { WorkspaceRow } from "@/types/supabase"
import { PLAN_FEATURES, PLAN_LABELS, type WorkspacePlan } from "@/types"

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
  description: string
  features: string[]
  highlight?: boolean
}

const PLANS: PlanConfig[] = [
  {
    key: "essencial",
    label: "Essencial",
    price: "R$79",
    priceNote: "mês",
    description: "CRM completo com WhatsApp para pequenos times.",
    features: [
      "CRM + Pipeline Kanban",
      "WhatsApp QR Code",
      "Atividades e timeline",
      "+R$29/membro adicional",
      "Leads ilimitados",
    ],
  },
  {
    key: "catalogo",
    label: "Catálogo",
    price: "R$129",
    priceNote: "mês",
    description: "Essencial + vitrine pública para seus produtos.",
    features: [
      "Tudo do Essencial",
      "Catálogo público",
      "Recuperador de carrinho (banner)",
      "Analytics de catálogo",
      "Quiz de qualificação",
    ],
    highlight: true,
  },
  {
    key: "pro_ia",
    label: "Pro IA",
    price: "R$199",
    priceNote: "mês",
    description: "Agente IA que qualifica e responde leads — até 300/mês.",
    features: [
      "Tudo do Catálogo",
      "Agente IA no WhatsApp",
      "Recuperador de carrinho via WhatsApp",
      "Follow-up automático",
      "Até 300 leads/mês",
    ],
  },
  {
    key: "scale_ia",
    label: "Scale IA",
    price: "R$349",
    priceNote: "mês",
    description: "Pro IA sem limites de leads para operações de alto volume.",
    features: [
      "Tudo do Pro IA",
      "Leads ilimitados",
      "Suporte prioritário",
    ],
  },
]

export function PlanTab({ workspace, currentUserRole, upgradeSuccess }: PlanTabProps) {
  const currentPlan = (workspace.plan ?? "essencial") as WorkspacePlan
  const currentSeats = (workspace as WorkspaceRow & { seats?: number }).seats ?? 1
  const isAdmin = currentUserRole === "admin"
  const hasSubscription = !!workspace.stripe_subscription_id

  const [checkoutPending, startCheckout] = useTransition()
  const [portalPending, startPortal] = useTransition()
  const [seatsPending, startSeats] = useTransition()
  const [seatCount, setSeatCount] = useState(currentSeats)

  const seatsDirty = seatCount !== currentSeats

  function handleSeatsSave() {
    startSeats(async () => {
      await updateSeats(seatCount)
    })
  }

  const currentPlanConfig = PLANS.find((p) => p.key === currentPlan)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="font-heading text-base font-bold text-pf-text">Plano & Cobrança</h3>
        <p className="mt-0.5 text-sm text-pf-text-muted">Gerencie sua assinatura LeadLoop</p>
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
            {currentPlanConfig?.label ?? currentPlan}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasSubscription ? (
            <span className="flex items-center gap-1.5 rounded-full bg-pf-accent/15 px-3 py-1 text-xs font-semibold text-pf-accent">
              <Zap className="size-3" />
              Ativo
            </span>
          ) : (
            <span className="rounded-full border border-pf-border bg-pf-surface px-3 py-1 text-xs font-medium text-pf-text-muted">
              Sem assinatura
            </span>
          )}
        </div>
      </div>

      {/* Gerenciar seats */}
      {hasSubscription && (
        <div className="rounded-xl border border-pf-border bg-pf-surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <Users className="size-4 text-pf-text-sec" />
            <p className="text-sm font-semibold text-pf-text">Usuários</p>
            <span className="text-xs text-pf-text-muted">— R$29/usuário adicional</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSeatCount((v) => Math.max(1, v - 1))}
              disabled={!isAdmin || seatCount <= 1}
              className="flex size-8 items-center justify-center rounded-lg border border-pf-border bg-pf-surface-2 text-pf-text transition-colors hover:border-pf-accent/40 disabled:opacity-40"
            >
              <Minus className="size-3" />
            </button>
            <span className="w-16 text-center font-heading text-xl font-bold text-pf-text">
              {seatCount}
            </span>
            <button
              onClick={() => setSeatCount((v) => v + 1)}
              disabled={!isAdmin}
              className="flex size-8 items-center justify-center rounded-lg border border-pf-border bg-pf-surface-2 text-pf-text transition-colors hover:border-pf-accent/40 disabled:opacity-40"
            >
              <Plus className="size-3" />
            </button>
            {seatsDirty && (
              <button
                onClick={handleSeatsSave}
                disabled={seatsPending}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-pf-accent px-4 text-xs font-semibold text-pf-bg transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {seatsPending ? <Loader2 className="size-3 animate-spin" /> : null}
                {seatsPending ? "Salvando..." : "Salvar"}
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-pf-text-muted">
            Total: <span className="font-semibold text-pf-text">
              {currentPlanConfig ? `R$${parseInt(currentPlanConfig.price.replace("R$", "")) + Math.max(0, seatCount - 1) * 29}/mês` : "—"}
            </span>
          </p>
        </div>
      )}

      {/* Grid de planos */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const isCurrent = plan.key === currentPlan

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
                <p className="mt-1 text-xs text-pf-text-sec">{plan.description}</p>
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
                  {hasSubscription && (
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
              ) : (
                <button
                  onClick={() => {
                    if (!isAdmin) return
                    startCheckout(() => createCheckoutSession(plan.key))
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
              )}
            </div>
          )
        })}
      </div>

      {!isAdmin && (
        <p className="text-xs text-pf-text-muted">Apenas admins podem gerenciar o plano.</p>
      )}

      <p className="text-xs text-pf-text-muted">
        Pagamentos processados com segurança pelo Stripe. Cancele a qualquer momento.
        +R$29/mês por usuário adicional além do 1º incluso.
      </p>
    </div>
  )
}
