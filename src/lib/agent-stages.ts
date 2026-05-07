// Constantes e helpers das etapas do pipeline do Agente IA.
// Separado das actions para não violar a regra "use server" (não exportar não-async).

import type { FollowUpConfig } from "@/types"

export function defaultFollowUpConfig(): FollowUpConfig {
  return {
    enabled: true,
    silence_hours: 2,
    steps: [
      { stage: "Aguardando Resposta", delay_hours: 2,  message: "Olá! Tudo bem? Ainda posso te ajudar com alguma dúvida? 😊" },
      { stage: "Follow-up 01",        delay_hours: 4,  message: "Ei, percebi que você não respondeu ainda. Fico por aqui caso precise! 👋" },
      { stage: "Follow-up 02",        delay_hours: 8,  message: "Última tentativa de contato. Se mudar de ideia, é só chamar! 🙏" },
      { stage: "Follow-up 03",        delay_hours: 24, message: "" },
    ],
  }
}

export const AGENT_STAGE_NAMES = {
  ATENDIMENTO_INICIADO: "Atendimento Iniciado",
  QUALIFICANDO:         "Qualificando",
  AGUARDANDO_RESPOSTA:  "Aguardando Resposta",
  FOLLOWUP_01:          "Follow-up 01",
  FOLLOWUP_02:          "Follow-up 02",
  FOLLOWUP_03:          "Follow-up 03",
  TRANSFERIDO:          "Transferido",
  FECHADO_PERDIDO:      "Fechado Perdido",
} as const

export const DEFAULT_AGENT_STAGES = [
  { name: AGENT_STAGE_NAMES.ATENDIMENTO_INICIADO, color: "#5B7FFF", position: 0 },
  { name: AGENT_STAGE_NAMES.QUALIFICANDO,         color: "#CAFF33", position: 1 },
  { name: AGENT_STAGE_NAMES.AGUARDANDO_RESPOSTA,  color: "#FF6B35", position: 2 },
  { name: AGENT_STAGE_NAMES.FOLLOWUP_01,          color: "#FF6B35", position: 3 },
  { name: AGENT_STAGE_NAMES.FOLLOWUP_02,          color: "#FF6B35", position: 4 },
  { name: AGENT_STAGE_NAMES.FOLLOWUP_03,          color: "#FF6B35", position: 5 },
  { name: AGENT_STAGE_NAMES.TRANSFERIDO,          color: "#2ED573", position: 6 },
  { name: AGENT_STAGE_NAMES.FECHADO_PERDIDO,      color: "#FF4757", position: 7 },
] as const
