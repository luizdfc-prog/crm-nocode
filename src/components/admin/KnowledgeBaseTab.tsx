"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Clock, Zap, Database, Wifi, Server, CreditCard, Mail } from "lucide-react"

interface Solution {
  text: string
  type: "free" | "paid" | "config"
}

interface KBEntry {
  id: string
  category: string
  icon: React.ElementType
  symptom: string
  causes: string[]
  solutions: Solution[]
  urgency: "low" | "medium" | "high"
  affectedService: string
}

const ENTRIES: KBEntry[] = [
  {
    id: "cold-start",
    category: "Performance",
    icon: Zap,
    symptom: "Sistema lento ao abrir pela primeira vez ou após inatividade",
    causes: [
      "Vercel Hobby mantém funções \"adormecidas\" após inatividade",
      "Primeira requisição acorda a função — demora 2–5 segundos",
      "Afeta todas as páginas dinâmicas: dashboard, leads, pipeline, conversas",
    ],
    solutions: [
      { text: "Upgrade para Vercel Pro ($20/mês) — elimina cold starts completamente", type: "paid" },
      { text: "Orientar clientes que o primeiro acesso do dia pode ser mais lento (comportamento normal do plano)", type: "free" },
    ],
    urgency: "medium",
    affectedService: "Vercel",
  },
  {
    id: "supabase-pause",
    category: "Banco de dados",
    icon: Database,
    symptom: "Sistema completamente parado, tela branca ou erro de conexão por 15–30 segundos",
    causes: [
      "Supabase Free pausa o banco automaticamente após 7 dias sem atividade",
      "Reativação automática demora 15–30 segundos na primeira requisição",
      "Ocorre principalmente em workspaces de teste ou clientes inativos",
    ],
    solutions: [
      { text: "Cron de ping ativo — roda a cada 5 dias para manter o banco acordado (já implementado)", type: "free" },
      { text: "Upgrade para Supabase Pro ($25/mês) — desativa a pausa automática", type: "paid" },
      { text: "Se já ocorreu: aguardar 30s e recarregar a página — resolve sozinho", type: "free" },
    ],
    urgency: "high",
    affectedService: "Supabase",
  },
  {
    id: "whatsapp-delay",
    category: "WhatsApp",
    icon: Wifi,
    symptom: "Mensagens WhatsApp atrasadas, chegando em lote ou com demora",
    causes: [
      "Baileys (Railway) reconecta periodicamente ao WhatsApp (código 440)",
      "Durante reconexão (~30s), mensagens ficam represadas no WhatsApp",
      "Ao reconectar, todas chegam de uma vez — parece lentidão",
    ],
    solutions: [
      { text: "Comportamento normal do protocolo — informar o cliente que é temporário", type: "free" },
      { text: "Verificar logs do Railway: se reconexões forem muito frequentes (>5x/dia), investigar estabilidade da VPS", type: "config" },
      { text: "Upgrade do Railway para Pro ($20/mês) melhora estabilidade da infra", type: "paid" },
    ],
    urgency: "low",
    affectedService: "Railway / Baileys",
  },
  {
    id: "whatsapp-disconnected",
    category: "WhatsApp",
    icon: Wifi,
    symptom: "WhatsApp desconectado — agente parou de responder completamente",
    causes: [
      "QR Code expirou e precisou ser re-escaneado",
      "WhatsApp Web foi desconectado pelo celular (configurações > aparelhos conectados)",
      "Servidor Baileys reiniciou sem sessão salva",
    ],
    solutions: [
      { text: "Ir em Configurações → WhatsApp → escanear QR Code novamente", type: "free" },
      { text: "Verificar no celular: WhatsApp → Aparelhos conectados → confirmar que está ativo", type: "free" },
      { text: "Verificar logs do Railway para erros de sessão", type: "config" },
    ],
    urgency: "high",
    affectedService: "Railway / Baileys",
  },
  {
    id: "ai-not-responding",
    category: "Agente IA",
    icon: Zap,
    symptom: "Agente de IA parou de responder às mensagens",
    causes: [
      "Horário de atendimento configurado — agente só responde no horário definido",
      "Conversa marcada como \"assumida por vendedor\" — IA desativada naquela conversa",
      "GOOGLE_API_KEY inválida ou com saldo zerado",
      "Regras de qualificação muito restritivas filtrando todas as mensagens",
    ],
    solutions: [
      { text: "Verificar horário de atendimento em Configurações → Agente", type: "free" },
      { text: "Na conversa: verificar se IA está ativa (botão de ativar IA visível)", type: "free" },
      { text: "Verificar Google AI Studio — saldo e status da API key", type: "config" },
      { text: "Testar manualmente: enviar mensagem de teste fora do horário restrito", type: "free" },
    ],
    urgency: "high",
    affectedService: "Google Gemini",
  },
  {
    id: "audio-not-transcribed",
    category: "Agente IA",
    icon: Zap,
    symptom: "Agente não entende áudios enviados pelo cliente",
    causes: [
      "OPENAI_API_KEY não configurada na Vercel",
      "Servidor Baileys desatualizado — versão anterior não enviava mídia em base64",
      "Formato de áudio não suportado pelo Whisper",
    ],
    solutions: [
      { text: "Verificar OPENAI_API_KEY nas variáveis de ambiente da Vercel", type: "config" },
      { text: "Confirmar que o Railway está rodando a versão mais recente do Baileys (commit após 07/05/2026)", type: "config" },
      { text: "Verificar painel OpenAI — saldo e status", type: "config" },
    ],
    urgency: "medium",
    affectedService: "OpenAI Whisper",
  },
  {
    id: "payment-failed",
    category: "Pagamentos",
    icon: CreditCard,
    symptom: "Cliente não consegue assinar ou pagamento recusado",
    causes: [
      "Webhook do Stripe não processado — plano não atualizado após pagamento",
      "STRIPE_WEBHOOK_SECRET incorreto na Vercel",
      "Cartão recusado pelo banco do cliente",
    ],
    solutions: [
      { text: "Verificar Stripe Dashboard → Webhooks → eventos recentes para erros", type: "config" },
      { text: "Reenviar evento manualmente pelo painel do Stripe se webhook falhou", type: "config" },
      { text: "Verificar variável STRIPE_WEBHOOK_SECRET na Vercel — deve coincidir com o endpoint cadastrado no Stripe", type: "config" },
    ],
    urgency: "high",
    affectedService: "Stripe",
  },
  {
    id: "invite-not-received",
    category: "Colaboradores",
    icon: Mail,
    symptom: "Convite de colaborador não chegou por e-mail",
    causes: [
      "RESEND_API_KEY não configurada ou inválida",
      "E-mail caiu no spam",
      "Domínio de envio não verificado no Resend",
    ],
    solutions: [
      { text: "Verificar painel Resend → Emails → status do envio", type: "config" },
      { text: "Orientar cliente a verificar pasta de spam", type: "free" },
      { text: "Reenviar convite pelo painel — Configurações → Membros", type: "free" },
      { text: "Verificar RESEND_API_KEY nas variáveis de ambiente da Vercel", type: "config" },
    ],
    urgency: "low",
    affectedService: "Resend",
  },
  {
    id: "slow-queries",
    category: "Performance",
    icon: Database,
    symptom: "Sistema lento de forma consistente, não só no primeiro acesso",
    causes: [
      "Volume alto de mensagens/leads sem índices suficientes",
      "Queries complexas em workspaces com muitos dados",
      "Plano Supabase Free com recursos limitados de CPU",
    ],
    solutions: [
      { text: "Analisar query lenta com EXPLAIN ANALYZE no Supabase SQL Editor", type: "free" },
      { text: "Upgrade Supabase Pro — mais CPU e RAM dedicados ($25/mês)", type: "paid" },
      { text: "Implementar paginação nas listagens grandes (leads, mensagens)", type: "free" },
    ],
    urgency: "medium",
    affectedService: "Supabase",
  },
]

const URGENCY_CONFIG = {
  high: { label: "Alta", color: "#FF4757", bg: "rgba(255,71,87,0.1)", border: "rgba(255,71,87,0.3)" },
  medium: { label: "Média", color: "#FF6B35", bg: "rgba(255,107,53,0.1)", border: "rgba(255,107,53,0.3)" },
  low: { label: "Baixa", color: "#8A8A8F", bg: "rgba(138,138,143,0.1)", border: "rgba(138,138,143,0.2)" },
}

const SOLUTION_CONFIG = {
  free: { label: "Gratuito", color: "#2ED573" },
  paid: { label: "Requer upgrade", color: "#FF6B35" },
  config: { label: "Configuração", color: "#5B7FFF" },
}

const CATEGORIES = ["Todos", ...Array.from(new Set(ENTRIES.map((e) => e.category)))]

function KBCard({ entry }: { entry: KBEntry }) {
  const [open, setOpen] = useState(false)
  const urgency = URGENCY_CONFIG[entry.urgency]
  const Icon = entry.icon

  return (
    <div
      className="rounded-xl border transition-all cursor-pointer"
      style={{ borderColor: open ? urgency.border : "#2A2A2E", backgroundColor: open ? urgency.bg : "#141416" }}
      onClick={() => setOpen((v) => !v)}
    >
      <div className="px-4 py-3.5 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border mt-0.5" style={{ borderColor: "#2A2A2E", backgroundColor: "#0C0C0E" }}>
            <Icon className="size-3.5" style={{ color: "#8A8A8F" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[10px] font-medium rounded-full px-2 py-0.5 border" style={{ color: urgency.color, borderColor: urgency.border, backgroundColor: urgency.bg }}>
                {urgency.label} prioridade
              </span>
              <span className="text-[10px]" style={{ color: "#555559" }}>{entry.category} · {entry.affectedService}</span>
            </div>
            <p className="text-sm font-medium leading-snug" style={{ color: "#E8E8E8" }}>{entry.symptom}</p>
          </div>
        </div>
        <div className="shrink-0 mt-0.5">
          {open
            ? <ChevronUp className="size-4" style={{ color: "#555559" }} />
            : <ChevronDown className="size-4" style={{ color: "#555559" }} />
          }
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-4 border-t" style={{ borderColor: "#2A2A2E" }}>
          {/* Causas */}
          <div className="pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: "#555559" }}>Possíveis causas</p>
            <ul className="flex flex-col gap-1.5">
              {entry.causes.map((c, i) => (
                <li key={i} className="flex items-start gap-2">
                  <AlertTriangle className="size-3 shrink-0 mt-0.5" style={{ color: urgency.color }} />
                  <span className="text-xs" style={{ color: "#8A8A8F" }}>{c}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Soluções */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: "#555559" }}>Soluções</p>
            <ul className="flex flex-col gap-2">
              {entry.solutions.map((s, i) => {
                const sc = SOLUTION_CONFIG[s.type]
                return (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="size-3 shrink-0 mt-0.5" style={{ color: sc.color }} />
                    <div className="flex-1">
                      <span className="text-xs" style={{ color: "#E8E8E8" }}>{s.text}</span>
                      <span className="ml-2 text-[10px] font-medium" style={{ color: sc.color }}>({sc.label})</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

export function KnowledgeBaseTab() {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("Todos")

  const filtered = ENTRIES.filter((e) => {
    const matchCat = category === "Todos" || e.category === category
    const q = search.toLowerCase()
    const matchSearch = !q || e.symptom.toLowerCase().includes(q) || e.affectedService.toLowerCase().includes(q) || e.causes.some((c) => c.toLowerCase().includes(q))
    return matchCat && matchSearch
  })

  const highCount = ENTRIES.filter((e) => e.urgency === "high").length

  return (
    <div className="flex flex-col gap-6">
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Problemas documentados", value: ENTRIES.length, color: "#E8E8E8" },
          { label: "Alta prioridade", value: highCount, color: "#FF4757" },
          { label: "Categorias", value: CATEGORIES.length - 1, color: "#8A8A8F" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border p-4" style={{ borderColor: "#2A2A2E", backgroundColor: "#141416" }}>
            <p className="text-xs mb-1" style={{ color: "#555559" }}>{label}</p>
            <p className="text-2xl font-bold font-[Syne]" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Buscar por sintoma, serviço ou causa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 h-9 rounded-lg border px-3 text-sm outline-none"
          style={{ borderColor: "#2A2A2E", backgroundColor: "#141416", color: "#E8E8E8" }}
        />
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={(e) => { e.stopPropagation(); setCategory(cat) }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
              style={{
                backgroundColor: category === cat ? "#CAFF33" : "transparent",
                color: category === cat ? "#0C0C0E" : "#8A8A8F",
                borderColor: category === cat ? "#CAFF33" : "#2A2A2E",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-sm" style={{ color: "#555559" }}>Nenhum resultado encontrado</div>
        ) : (
          filtered
            .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.urgency] - { high: 0, medium: 1, low: 2 }[b.urgency]))
            .map((entry) => <KBCard key={entry.id} entry={entry} />)
        )}
      </div>

      {/* Legenda */}
      <div className="rounded-xl border p-4" style={{ borderColor: "#2A2A2E", backgroundColor: "#141416" }}>
        <p className="text-[10px] font-semibold uppercase tracking-wide mb-3" style={{ color: "#555559" }}>Legenda de soluções</p>
        <div className="flex flex-wrap gap-4">
          {Object.entries(SOLUTION_CONFIG).map(([, { label, color }]) => (
            <div key={label} className="flex items-center gap-1.5">
              <CheckCircle className="size-3" style={{ color }} />
              <span className="text-xs" style={{ color: "#8A8A8F" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
