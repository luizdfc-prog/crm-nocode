import Link from "next/link";

const FREE_FEATURES = [
  "Até 2 colaboradores",
  "Até 50 leads",
  "Pipeline Kanban",
  "Timeline de atividades",
  "1 workspace",
  "Suporte por e-mail",
];

const PRO_FEATURES = [
  "Colaboradores ilimitados",
  "Leads ilimitados",
  "Pipeline Kanban",
  "Timeline de atividades",
  "Múltiplos workspaces",
  "Métricas e relatórios",
  "Convites por e-mail",
  "Suporte prioritário",
];

function CheckIcon({ muted = false }: { muted?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5">
      <circle cx="8" cy="8" r="7" fill={muted ? "rgba(202,255,51,0.1)" : "rgba(202,255,51,0.15)"} />
      <path
        d="M5 8l2.5 2.5L11 5.5"
        stroke={muted ? "#CAFF33" : "#CAFF33"}
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
      <div className="max-w-4xl mx-auto">
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
            Comece grátis e faça upgrade quando precisar de mais.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Free */}
          <div
            className="rounded-2xl p-8 flex flex-col"
            style={{
              background: "#141416",
              border: "1px solid #2A2A2E",
            }}
          >
            <div className="mb-6">
              <p
                className="font-mono text-xs uppercase tracking-widest mb-3"
                style={{ color: "#8A8A8F" }}
              >
                Grátis
              </p>
              <div className="flex items-baseline gap-1">
                <span
                  className="font-heading font-bold"
                  style={{ fontSize: "2.8rem", color: "#E8E8E8", lineHeight: 1 }}
                >
                  R$0
                </span>
                <span className="text-sm" style={{ color: "#555559" }}>
                  / sempre
                </span>
              </div>
              <p className="text-sm mt-2" style={{ color: "#8A8A8F" }}>
                Para freelancers e times pequenos começando.
              </p>
            </div>

            <ul className="flex flex-col gap-3 mb-8 flex-1">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm" style={{ color: "#8A8A8F" }}>
                  <CheckIcon muted />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="/signup"
              className="w-full py-3 rounded-xl text-sm font-semibold text-center transition-all duration-200 hover:border-[#555559]"
              style={{
                border: "1px solid #2A2A2E",
                color: "#E8E8E8",
                background: "transparent",
              }}
            >
              Criar conta grátis
            </Link>
          </div>

          {/* Pro */}
          <div
            className="rounded-2xl p-8 flex flex-col relative overflow-hidden"
            style={{
              background: "#141416",
              border: "1px solid rgba(202,255,51,0.35)",
            }}
          >
            {/* Glow top */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent, rgba(202,255,51,0.6), transparent)" }}
            />

            {/* Badge */}
            <div className="absolute top-5 right-5">
              <span
                className="font-mono text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
                style={{ background: "rgba(202,255,51,0.12)", color: "#CAFF33", border: "1px solid rgba(202,255,51,0.25)" }}
              >
                Popular
              </span>
            </div>

            <div className="mb-6">
              <p
                className="font-mono text-xs uppercase tracking-widest mb-3"
                style={{ color: "#CAFF33" }}
              >
                Pro
              </p>
              <div className="flex items-baseline gap-1">
                <span
                  className="font-heading font-bold"
                  style={{ fontSize: "2.8rem", color: "#E8E8E8", lineHeight: 1 }}
                >
                  R$49
                </span>
                <span className="text-sm" style={{ color: "#555559" }}>
                  / mês
                </span>
              </div>
              <p className="text-sm mt-2" style={{ color: "#8A8A8F" }}>
                Para times que precisam escalar sem limites.
              </p>
            </div>

            <ul className="flex flex-col gap-3 mb-8 flex-1">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm" style={{ color: "#E8E8E8" }}>
                  <CheckIcon />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="/signup"
              className="w-full py-3 rounded-xl text-sm font-semibold text-center transition-all duration-200 hover:opacity-90 active:scale-95"
              style={{ background: "#CAFF33", color: "#0C0C0E" }}
            >
              Começar com Pro
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
