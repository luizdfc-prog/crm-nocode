import { Building2, Users, CreditCard } from "lucide-react"

const SECTIONS = [
  {
    icon: Building2,
    title: "Workspace",
    description: "Nome, logo e configurações gerais do workspace",
  },
  {
    icon: Users,
    title: "Membros",
    description: "Convidar colaboradores e gerenciar permissões",
  },
  {
    icon: CreditCard,
    title: "Plano & Cobrança",
    description: "Upgrade para Pro, histórico de pagamentos",
  },
]

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-xl font-bold text-pf-text">Configurações</h2>
        <p className="mt-0.5 text-sm text-pf-text-muted">
          Gerencie o workspace e assinaturas
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {SECTIONS.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="flex cursor-pointer items-center gap-4 rounded-xl border border-pf-border bg-pf-surface p-5 transition-colors hover:bg-pf-surface-2"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-pf-border bg-pf-surface-2">
              <Icon className="size-5 text-pf-text-muted" />
            </div>
            <div>
              <p className="text-sm font-medium text-pf-text">{title}</p>
              <p className="mt-0.5 text-xs text-pf-text-muted">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
