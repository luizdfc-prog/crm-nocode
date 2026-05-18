import type { DistributorConfig, WhatsAppAccount } from "@/types"

// Rodízio ponderado determinístico
// Monta sequência proporcional aos pesos e avança a partir do último pipeline usado
export function pickNextPipeline(
  config: DistributorConfig,
  accounts: WhatsAppAccount[],
  lastPipelineId: string | null
): string | null {
  if (!config.enabled || config.pipelines.length === 0) return null

  const activePipelineIds = new Set(
    accounts
      .filter((a) => a.active_in_routing && a.pipeline_id)
      .map((a) => a.pipeline_id!)
  )

  const eligible = config.pipelines.filter((p) => activePipelineIds.has(p.pipeline_id))
  if (eligible.length === 0) return null
  if (eligible.length === 1) return eligible[0].pipeline_id

  const sequence: string[] = []
  for (const p of eligible) {
    for (let i = 0; i < p.weight; i++) {
      sequence.push(p.pipeline_id)
    }
  }

  const lastIdx = lastPipelineId ? sequence.lastIndexOf(lastPipelineId) : -1
  const nextIdx = (lastIdx + 1) % sequence.length
  return sequence[nextIdx]
}
