import { Zap, Check, Users, Database } from "lucide-react"
import type { WorkspaceRow } from "@/types/supabase"

interface PlanTabProps {
  workspace: WorkspaceRow
}

const FREE_FEATURES = [
  "Até 50 leads",
  "Até 2 membros",
  "Pipeline Kanban",
  "Atividades e timeline",
]

const PRO_FEATURES = [
  "Leads ilimitados",
  "Membros ilimitados",
  "Pipeline Kanban",
  "Atividades e timeline",
  "Suporte prioritário",
]

export function PlanTab({ workspace }: PlanTabProps) {
  const isPro = workspace.plan === "pro"

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="font-heading text-base font-bold text-pf-text">
          Plano & Cobrança
        </h3>
        <p className="mt-0.5 text-sm text-pf-text-muted">
          Gerencie sua assinatura do PipeFlow
        </p>
      </div>

      {/* Status atual */}
      <div className="rounded-xl border border-pf-border bg-pf-surface-2 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-pf-text-muted">
              Plano atual
            </p>
            <p className="mt-1 font-heading text-2xl font-bold text-pf-text">
              {isPro ? "Pro" : "Free"}
            </p>
          </div>
          {isPro ? (
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

        {isPro && (
          <div className="mt-4 flex gap-4 border-t border-pf-border pt-4">
            <div className="flex items-center gap-2 text-sm text-pf-text-sec">
              <Users className="size-4 text-pf-text-muted" />
              Membros ilimitados
            </div>
            <div className="flex items-center gap-2 text-sm text-pf-text-sec">
              <Database className="size-4 text-pf-text-muted" />
              Leads ilimitados
            </div>
          </div>
        )}
      </div>

      {/* Cards de plano */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Free */}
        <div
          className={`rounded-xl border p-5 ${
            !isPro
              ? "border-pf-accent bg-pf-accent/5"
              : "border-pf-border bg-pf-surface"
          }`}
        >
          <div className="mb-4">
            <p className="font-heading text-base font-bold text-pf-text">Free</p>
            <p className="mt-1 font-heading text-3xl font-extrabold text-pf-text">
              R$0
              <span className="text-base font-normal text-pf-text-muted">
                /mês
              </span>
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-pf-text-sec">
                <Check className="size-4 shrink-0 text-pf-positive" />
                {f}
              </li>
            ))}
          </ul>
          {!isPro && (
            <p className="mt-4 text-xs font-medium text-pf-accent">
              Plano atual
            </p>
          )}
        </div>

        {/* Pro */}
        <div
          className={`rounded-xl border p-5 ${
            isPro
              ? "border-pf-accent bg-pf-accent/5"
              : "border-pf-border bg-pf-surface"
          }`}
        >
          <div className="mb-4">
            <p className="font-heading text-base font-bold text-pf-text">Pro</p>
            <p className="mt-1 font-heading text-3xl font-extrabold text-pf-text">
              R$49
              <span className="text-base font-normal text-pf-text-muted">
                /mês
              </span>
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-pf-text-sec">
                <Check className="size-4 shrink-0 text-pf-positive" />
                {f}
              </li>
            ))}
          </ul>
          {isPro ? (
            <button
              disabled
              className="mt-4 flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-pf-accent/20 text-sm font-semibold text-pf-accent opacity-60"
            >
              Gerenciar assinatura
            </button>
          ) : (
            <button
              disabled
              title="Disponível em breve — integração Stripe no M11"
              className="mt-4 flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-pf-accent text-sm font-semibold text-pf-bg opacity-80 hover:opacity-100"
            >
              <Zap className="size-4" />
              Fazer upgrade
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-pf-text-muted">
        Pagamentos via Stripe — disponível na próxima etapa do projeto.
      </p>
    </div>
  )
}
