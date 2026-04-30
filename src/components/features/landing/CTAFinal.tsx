import Link from "next/link";

export function CTAFinal() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <div
          className="relative rounded-3xl px-6 sm:px-12 py-16 md:py-20 text-center overflow-hidden"
          style={{
            background: "#141416",
            border: "1px solid #2A2A2E",
          }}
        >
          {/* Corner accents */}
          <div
            className="pointer-events-none absolute top-0 left-0 w-48 h-48"
            style={{
              background:
                "radial-gradient(circle at top left, rgba(202,255,51,0.08) 0%, transparent 65%)",
            }}
          />
          <div
            className="pointer-events-none absolute bottom-0 right-0 w-48 h-48"
            style={{
              background:
                "radial-gradient(circle at bottom right, rgba(202,255,51,0.08) 0%, transparent 65%)",
            }}
          />

          <p
            className="font-mono text-xs font-medium mb-4 uppercase tracking-widest"
            style={{ color: "#CAFF33" }}
          >
            Comece hoje
          </p>

          <h2
            className="font-heading font-bold leading-tight mb-4"
            style={{ fontSize: "clamp(1.6rem, 4vw, 2.6rem)", color: "#E8E8E8" }}
          >
            Seu pipeline organizado em menos de 5 minutos.
          </h2>

          <p
            className="text-base mb-10 max-w-md mx-auto"
            style={{ color: "#8A8A8F" }}
          >
            Crie sua conta grátis, importe seus leads e comece a fechar
            negócios com mais clareza e velocidade.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90 active:scale-95"
              style={{ background: "#CAFF33", color: "#0C0C0E" }}
            >
              Criar conta grátis
            </Link>
            <Link
              href="/login"
              className="landing-link inline-flex items-center justify-center px-8 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200"
              style={{
                border: "1px solid #2A2A2E",
                color: "#8A8A8F",
              }}
            >
              Já tenho conta
            </Link>
          </div>

          <p className="text-xs mt-6" style={{ color: "#555559" }}>
            Sem cartão de crédito · Plano grátis para sempre
          </p>
        </div>
      </div>
    </section>
  );
}
