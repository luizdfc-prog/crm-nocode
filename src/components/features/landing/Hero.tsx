import Link from "next/link";

const STATS = [
  { value: "+47%", label: "conversão de leads" },
  { value: "3.2×", label: "leads qualificados" },
  { value: "−62%", label: "ciclo de venda" },
  { value: "1200+", label: "times ativos" },
];

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-20 overflow-hidden">
      {/* Background grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(202,255,51,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(202,255,51,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Radial glow center */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 40%, rgba(202,255,51,0.07) 0%, transparent 70%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto text-center">

        {/* Badge */}
        <div
          className="hero-animate hero-animate-1 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-medium mb-8"
          style={{
            border: "1px solid rgba(202,255,51,0.25)",
            background: "rgba(202,255,51,0.06)",
            color: "#CAFF33",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#CAFF33" }} />
          CRM para times que fecham negócio de verdade
        </div>

        {/* Headline */}
        <h1
          className="hero-animate hero-animate-2 font-heading font-extrabold leading-[1.05] tracking-tight mb-6"
          style={{
            fontSize: "clamp(2.6rem, 7vw, 5.5rem)",
            color: "#E8E8E8",
          }}
        >
          Seu pipeline de vendas,{" "}
          <span style={{ color: "#CAFF33" }}>sob controle</span>.
        </h1>

        {/* Subheadline */}
        <p
          className="hero-animate hero-animate-3 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto mb-10"
          style={{ color: "#8A8A8F" }}
        >
          Z4P é o CRM com agente IA no WhatsApp que PMEs e times de vendas precisam
          para organizar leads, acompanhar negócios e fechar mais — sem
          complicação.
        </p>

        {/* CTAs */}
        <div className="hero-animate hero-animate-4 flex flex-col sm:flex-row gap-3 justify-center mb-16">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90 active:scale-95 group"
            style={{ background: "#CAFF33", color: "#0C0C0E" }}
          >
            Começar grátis
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            >
              <path
                d="M3 8h10M9 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200"
            style={{
              border: "1px solid #2A2A2E",
              color: "#E8E8E8",
              background: "transparent",
            }}
          >
            Já tenho conta
          </Link>
        </div>

        {/* Stats */}
        <div
          className="hero-animate hero-animate-5 grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden"
          style={{ background: "#2A2A2E" }}
        >
          {STATS.map((stat) => (
            <div
              key={stat.value}
              className="flex flex-col items-center justify-center py-6 px-3 gap-1"
              style={{ background: "#141416" }}
            >
              <span
                className="font-heading font-bold text-2xl md:text-3xl"
                style={{ color: "#CAFF33" }}
              >
                {stat.value}
              </span>
              <span
                className="text-xs text-center leading-snug"
                style={{ color: "#8A8A8F" }}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
