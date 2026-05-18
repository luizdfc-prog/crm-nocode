"use client"

import { useTransition } from "react"
import { Lock, Loader2, Zap } from "lucide-react"
import { createCheckoutSession } from "@/app/actions/stripe"
import type { WorkspacePlan } from "@/types"

interface UpgradeOverlayProps {
  feature: string
  requiredPlan: WorkspacePlan
  requiredPlanLabel: string
  isAdmin: boolean
}

export function UpgradeOverlay({ feature, requiredPlan, requiredPlanLabel, isAdmin }: UpgradeOverlayProps) {
  const [pending, startTransition] = useTransition()

  return (
    <div className="relative flex min-h-[300px] flex-col items-center justify-center gap-5 rounded-xl border border-dashed border-pf-border bg-pf-surface p-8 text-center">
      <div className="flex size-14 items-center justify-center rounded-full border border-pf-border bg-pf-surface-2">
        <Lock className="size-6 text-pf-text-muted" />
      </div>

      <div>
        <p className="font-heading text-lg font-bold text-pf-text">{feature}</p>
        <p className="mt-1 text-sm text-pf-text-sec">
          Disponível a partir do plano{" "}
          <span className="font-semibold text-pf-accent">{requiredPlanLabel}</span>
        </p>
      </div>

      {isAdmin ? (
        <button
          onClick={() => startTransition(() => createCheckoutSession(requiredPlan))}
          disabled={pending}
          className="flex h-10 items-center gap-2 rounded-lg bg-pf-accent px-6 text-sm font-semibold text-pf-bg transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
          {pending ? "Redirecionando..." : `Fazer upgrade para ${requiredPlanLabel}`}
        </button>
      ) : (
        <p className="text-xs text-pf-text-muted">
          Solicite ao admin do workspace para fazer upgrade.
        </p>
      )}
    </div>
  )
}
