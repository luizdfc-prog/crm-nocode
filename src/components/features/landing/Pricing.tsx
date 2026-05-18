import Link from "next/link";

interface PlanItem {
  key: string;
  label: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
}

const PLANS: PlanItem[] = [
  {
    key: "essencial",
    label: "Essencial",
    price: "R$79",
    period: "mês",
    description: "CRM completo com WhatsApp para pequenos times.",
    features: [
      "CRM + Pipeline Kanban",
      "WhatsApp QR Code",
      "+R$29/membro adicional",
      "Leads ilimitados",
      "Atividades e timeline",
      "Importação/exportação CSV",
    ],
  },
  {
    key: "catalogo",
    label: "Catálogo",
    price: "R$129",
    period: "mês",
    description: "Essencial + vitrine pública para seus produtos.",
    features: [
      "Tudo do Essencial",
      "Catálogo público",
      "Quiz de qualificação",
      "Recuperador de carrinho",
      "Analytics de catálogo",
      "Rastreamento UTM + Pixels",
    ],
    highlight: true,
    badge: "Popular",
  },
  {
    key: "pro_ia",
    label: "Pro IA",
    price: "R$199",
    period: "mês",
    description: "Agente IA que qualifica e responde leads — até 300/mês.",
    features: [
      "Tudo do Catálogo",
      "Agente IA no WhatsApp",
      "Follow-up automático",
      "Recuperador via WhatsApp",
      "Até 300 leads/mês",
      "Roteamento por pipeline",
    ],
  },
  {
    key: "scale_ia",
    label: "Scale IA",
    price: "R$349",
    period: "mês",
    description: "Pro IA sem limites de leads para operações de alto volume.",
    features: [
      "Tudo do Pro IA",
      "Leads ilimitados",
      "Suporte prioritário",
    ],
  },
];

// Tabela de comparação
const COMPARISON_ROWS: { label: string; values: (boolean | string)[] }[] = [
  { label: "CRM + Pipeline Kanban",           values: [true,  true,  true,  true]  },
  { label: "WhatsApp QR Code",                values: [true,  true,  true,  true]  },
  { label: "+R$29/membro adicional",           values: [true,  true,  true,  true]  },
  { label: "Leads ilimitados",                values: [true,  true,  "300/mês", true] },
  { label: "Importação/exportação CSV",       values: [true,  true,  true,  true]  },
  { label: "Catálogo público",                values: [false, true,  true,  true]  },
  { label: "Quiz de qualificação",            values: [false, true,  true,  true]  },
  { label: "Recuperador de carrinho (banner)",values: [false, true,  true,  true]  },
  { label: "Analytics de catálogo",           values: [false, true,  true,  true]  },
  { label: "Agente IA no WhatsApp",           values: [false, false, true,  true]  },
  { label: "Follow-up automático",            values: [false, false, true,  true]  },
  { label: "Recuperador via WhatsApp",        values: [false, false, true,  true]  },
  { label: "Suporte prioritário",             values: [false, false, false, true]  },
  { label: "Usuário adicional",               values: ["+R$29/usuário", "+R$29/usuário", "+R$29/usuário", "+R$29/usuário"] },
];

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5">
      <circle cx="8" cy="8" r="7" fill="rgba(202,255,51,0.12)" />
      <path d="M5 8l2.5 2.5L11 5.5" stroke="#CAFF33" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5">
      <circle cx="8" cy="8" r="7" fill="rgba(255,71,87,0.08)" />
      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#555559" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <p className="font-mono text-xs font-medium mb-3 uppercase tracking-widest" style={{ color: "#CAFF33" }}>
            Preços
          </p>
          <h2
            className="font-heading font-bold leading-tight mb-4"
            style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", color: "#E8E8E8" }}
          >
            Simples. Sem surpresas.
          </h2>
          <p className="text-base" style={{ color: "#8A8A8F" }}>
            1 usuário incluso em todos os planos. Usuários adicionais por +R$29/mês cada.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className="rounded-2xl p-6 flex flex-col relative overflow-hidden"
              style={{
                background: "#141416",
                border: plan.highlight ? "1px solid rgba(202,255,51,0.35)" : "1px solid #2A2A2E",
              }}
            >
              {plan.highlight && (
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-px"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(202,255,51,0.6), transparent)" }}
                />
              )}

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

              <div className="mb-5">
                <p
                  className="font-mono text-xs uppercase tracking-widest mb-2"
                  style={{ color: plan.highlight ? "#CAFF33" : "#8A8A8F" }}
                >
                  {plan.label}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="font-heading font-bold" style={{ fontSize: "2rem", color: "#E8E8E8", lineHeight: 1 }}>
                    {plan.price}
                  </span>
                  <span className="text-xs" style={{ color: "#555559" }}>/{plan.period}</span>
                </div>
                <p className="text-xs mt-1" style={{ color: "#555559" }}>{plan.description}</p>
              </div>

              <ul className="flex flex-col gap-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs" style={{ color: plan.highlight ? "#E8E8E8" : "#8A8A8F" }}>
                    <CheckIcon />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-all duration-200 block"
                style={
                  plan.highlight
                    ? { background: "#CAFF33", color: "#0C0C0E" }
                    : { border: "1px solid #2A2A2E", color: "#E8E8E8", background: "transparent" }
                }
              >
                Começar com {plan.label}
              </Link>
            </div>
          ))}
        </div>

        {/* Tabela de comparação */}
        <div>
          <p className="text-center text-sm font-semibold mb-6" style={{ color: "#8A8A8F" }}>
            Comparação completa
          </p>

          <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid #2A2A2E" }}>
            <table className="w-full text-sm" style={{ background: "#141416" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #2A2A2E" }}>
                  <th className="text-left px-5 py-4 font-medium" style={{ color: "#555559", width: "36%" }}>
                    Funcionalidade
                  </th>
                  {PLANS.map((plan) => (
                    <th key={plan.key} className="px-4 py-4 text-center font-semibold" style={{ color: plan.highlight ? "#CAFF33" : "#E8E8E8" }}>
                      {plan.label}
                      <span className="block text-xs font-normal mt-0.5" style={{ color: "#555559" }}>{plan.price}/mês</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr
                    key={row.label}
                    style={{
                      borderBottom: i < COMPARISON_ROWS.length - 1 ? "1px solid #1A1A1E" : "none",
                      background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                    }}
                  >
                    <td className="px-5 py-3 text-xs" style={{ color: "#8A8A8F" }}>{row.label}</td>
                    {row.values.map((val, j) => (
                      <td key={j} className="px-4 py-3 text-center">
                        {val === true ? (
                          <div className="flex justify-center">
                            <CheckIcon />
                          </div>
                        ) : val === false ? (
                          <div className="flex justify-center">
                            <XIcon />
                          </div>
                        ) : (
                          <span className="text-xs font-medium" style={{ color: "#CAFF33" }}>{val}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Nota de rodapé */}
        <p className="text-center text-xs mt-6" style={{ color: "#555559" }}>
          Pagamentos processados com segurança pelo Stripe. Cancele a qualquer momento.
        </p>
      </div>
    </section>
  );
}
