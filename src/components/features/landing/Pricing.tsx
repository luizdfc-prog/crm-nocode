import Link from "next/link";

interface PlanItem {
  key: string;
  label: string;
  price: string;
  period: string;
  leadsLimit: string;
  description: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
}

const PLANS: PlanItem[] = [
  {
    key: "free",
    label: "Free",
    price: "R$0",
    period: "sempre",
    leadsLimit: "50 leads/mês",
    description: "Para começar a organizar seus contatos.",
    features: ["50 leads por mês", "Até 2 membros", "Pipeline Kanban", "Atividades e timeline"],
  },
  {
    key: "starter",
    label: "Starter",
    price: "R$49",
    period: "mês",
    leadsLimit: "300 leads/mês",
    description: "Para freelancers e pequenos times.",
    features: ["300 leads por mês", "Membros ilimitados", "Pipeline Kanban", "Atividades e timeline", "Agente IA no WhatsApp"],
  },
  {
    key: "pro",
    label: "Pro",
    price: "R$149",
    period: "mês",
    leadsLimit: "1.000 leads/mês",
    description: "Para times que precisam escalar.",
    features: ["1.000 leads por mês", "Membros ilimitados", "Pipeline Kanban", "Atividades e timeline", "Agente IA no WhatsApp", "Suporte prioritário"],
    highlight: true,
    badge: "Popular",
  },
  {
    key: "scale",
    label: "Scale",
    price: "R$299",
    period: "mês",
    leadsLimit: "Leads ilimitados",
    description: "Para operações de alto volume.",
    features: ["Leads ilimitados", "Membros ilimitados", "Pipeline Kanban", "Atividades e timeline", "Agente IA no WhatsApp", "Suporte prioritário"],
  },
];

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5">
      <circle cx="8" cy="8" r="7" fill="rgba(202,255,51,0.12)" />
      <path
        d="M5 8l2.5 2.5L11 5.5"
        stroke="#CAFF33"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p
            className="font-mono text-xs font-medium mb-3 uppercase tracking-widest"
            style={{ color: "#CAFF33" }}
          >
            Preços
          </p>
          <h2
            className="font-heading font-bold leading-tight mb-4"
            style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", color: "#E8E8E8" }}
          >
            Simples. Sem surpresas.
          </h2>
          <p className="text-base" style={{ color: "#8A8A8F" }}>
            Comece grátis e faça upgrade conforme sua operação cresce.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className="rounded-2xl p-6 flex flex-col relative overflow-hidden"
              style={{
                background: "#141416",
                border: plan.highlight
                  ? "1px solid rgba(202,255,51,0.35)"
                  : "1px solid #2A2A2E",
              }}
            >
              {/* Glow topo no plano em destaque */}
              {plan.highlight && (
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-px"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(202,255,51,0.6), transparent)" }}
                />
              )}

              {/* Badge */}
              {plan.badge && (
                <div className="absolute top-4 right-4">
                  <span
                    className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                    style={{ background: "rgba(202,255,51,0.12)", color: "#CAFF33", border: "1px solid rgba(202,255,51,0.25)" }}
                  >
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Cabeçalho */}
              <div className="mb-5">
                <p
                  className="font-mono text-xs uppercase tracking-widest mb-2"
                  style={{ color: plan.highlight ? "#CAFF33" : "#8A8A8F" }}
                >
                  {plan.label}
                </p>
                <div className="flex items-baseline gap-1">
                  <span
                    className="font-heading font-bold"
                    style={{ fontSize: "2rem", color: "#E8E8E8", lineHeight: 1 }}
                  >
                    {plan.price}
                  </span>
                  <span className="text-xs" style={{ color: "#555559" }}>
                    /{plan.period}
                  </span>
                </div>
                <p
                  className="text-xs font-semibold mt-1.5"
                  style={{ color: "#CAFF33" }}
                >
                  {plan.leadsLimit}
                </p>
                <p className="text-xs mt-1" style={{ color: "#555559" }}>
                  {plan.description}
                </p>
              </div>

              {/* Features */}
              <ul className="flex flex-col gap-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs" style={{ color: plan.highlight ? "#E8E8E8" : "#8A8A8F" }}>
                    <CheckIcon />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href="/signup"
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-all duration-200"
                style={
                  plan.highlight
                    ? { background: "#CAFF33", color: "#0C0C0E" }
                    : { border: "1px solid #2A2A2E", color: "#E8E8E8", background: "transparent" }
                }
              >
                {plan.key === "free" ? "Criar conta grátis" : `Começar com ${plan.label}`}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
