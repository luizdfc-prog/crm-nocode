// Constantes e helpers das etapas do pipeline do Agente IA.
// Separado das actions para não violar a regra "use server" (não exportar não-async).

import type { FollowUpConfig } from "@/types"

export const FOLLOWUP_STAGES = [
  "Follow-up 01",
  "Follow-up 02",
  "Follow-up 03",
  "Follow-up 04",
  "Follow-up 05",
] as const

export type FollowUpStageName = typeof FOLLOWUP_STAGES[number]

export function defaultFollowUpConfig(): FollowUpConfig {
  return {
    silence_hours: 2,
    steps: [
      { stage: "Follow-up 01", enabled: true,  delay_hours: 4,  message: "Olá! Tudo bem? Ainda posso te ajudar com alguma dúvida? 😊" },
      { stage: "Follow-up 02", enabled: true,  delay_hours: 8,  message: "Ei, percebi que você não respondeu ainda. Fico por aqui caso precise! 👋" },
      { stage: "Follow-up 03", enabled: false, delay_hours: 24, message: "" },
      { stage: "Follow-up 04", enabled: false, delay_hours: 48, message: "" },
      { stage: "Follow-up 05", enabled: false, delay_hours: 72, message: "" },
    ],
  }
}

export const AGENT_STAGE_NAMES = {
  ATENDIMENTO_INICIADO: "Atendimento Iniciado",
  QUALIFICANDO:         "Qualificando",
  FOLLOWUP_01:          "Follow-up 01",
  FOLLOWUP_02:          "Follow-up 02",
  FOLLOWUP_03:          "Follow-up 03",
  FOLLOWUP_04:          "Follow-up 04",
  FOLLOWUP_05:          "Follow-up 05",
  TRANSFERIDO:          "Transferido",
  FECHADO_PERDIDO:      "Fechado Perdido",
} as const

export const FIXED_AGENT_STAGES = [
  { name: AGENT_STAGE_NAMES.ATENDIMENTO_INICIADO, color: "#5B7FFF", position: 0 },
  { name: AGENT_STAGE_NAMES.QUALIFICANDO,         color: "#CAFF33", position: 1 },
  { name: AGENT_STAGE_NAMES.TRANSFERIDO,          color: "#2ED573", position: 98 },
  { name: AGENT_STAGE_NAMES.FECHADO_PERDIDO,      color: "#FF4757", position: 99 },
] as const

// Alias para compatibilidade — pipeline.ts usa DEFAULT_AGENT_STAGES
// Inclui as etapas de follow-up ativas por default (FU01 e FU02)
export const DEFAULT_AGENT_STAGES = [
  ...FIXED_AGENT_STAGES,
  { name: AGENT_STAGE_NAMES.FOLLOWUP_01, color: "#FF6B35", position: 2 },
  { name: AGENT_STAGE_NAMES.FOLLOWUP_02, color: "#FF6B35", position: 3 },
  { name: AGENT_STAGE_NAMES.FOLLOWUP_03, color: "#FF6B35", position: 4 },
  { name: AGENT_STAGE_NAMES.FOLLOWUP_04, color: "#FF6B35", position: 6 },
  { name: AGENT_STAGE_NAMES.FOLLOWUP_05, color: "#FF6B35", position: 7 },
] as const
