import { PLAN_FEATURES, type WorkspacePlan } from "@/types"

export type PlanFeature = keyof typeof PLAN_FEATURES[WorkspacePlan]

export function hasPlanFeature(plan: string, feature: PlanFeature): boolean {
  const features = PLAN_FEATURES[plan as WorkspacePlan]
  if (!features) return false
  return features[feature]
}
