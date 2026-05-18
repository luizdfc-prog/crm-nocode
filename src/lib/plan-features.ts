import { PLAN_FEATURES, type WorkspacePlan } from "@/types"

export type PlanFeature = keyof typeof PLAN_FEATURES[WorkspacePlan]

// Mapeia planos legados (antes da migração Stripe de 2026-05) para o equivalente atual
const LEGACY_PLAN_MAP: Record<string, WorkspacePlan> = {
  free: "essencial",
  pro:  "pro_ia",
}

export function hasPlanFeature(plan: string, feature: PlanFeature): boolean {
  const normalized = LEGACY_PLAN_MAP[plan] ?? plan
  const features = PLAN_FEATURES[normalized as WorkspacePlan]
  if (!features) return false
  return features[feature]
}
