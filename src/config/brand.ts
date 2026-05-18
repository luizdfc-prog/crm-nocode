// Configuração de marca — lida via variáveis de ambiente.
// Em produção (Z4P) nenhuma variável é definida, então os defaults se aplicam.
// Em instâncias white-label, basta definir as vars no .env do cliente.

export const brand = {
  // Nome exibido na UI, e-mails, metadata e prompt do agente
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "Z4P",

  // E-mail remetente dos convites e notificações
  fromEmail: process.env.NEXT_PUBLIC_FROM_EMAIL ?? "noreply@send.engenharia.app",
  fromName: process.env.NEXT_PUBLIC_FROM_NAME ?? "Z4P",

  // Nome da empresa exibido no prompt do agente IA
  agentCompany: process.env.NEXT_PUBLIC_AGENT_COMPANY ?? "EngenharIA",

  // Descrição curta usada em metadata e e-mails
  description: process.env.NEXT_PUBLIC_APP_DESCRIPTION ?? "CRM com agente IA no WhatsApp para PMEs e times de vendas",
}
