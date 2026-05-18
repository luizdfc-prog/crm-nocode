const VITRINE_FEATURES = [
  {
    icon: "🛍️",
    title: "Substituí o site",
    description: "Quem não tem site tem uma presença profissional na web em minutos. Link único, domínio próprio opcional — sem precisar de agência ou desenvolvedor.",
  },
  {
    icon: "🧩",
    title: "Qualifica antes de chegar no vendedor",
    description: "Quiz interativo filtra quem tem interesse real. Só quem passa chega até o WhatsApp — o vendedor foca em fechar, não em explicar o básico.",
  },
  {
    icon: "🛒",
    title: "Carrinho sem complexidade de e-commerce",
    description: "O lead monta o pedido, escolhe os produtos e finaliza pelo WhatsApp. Toda a praticidade do e-commerce, sem a estrutura — e com zero taxa de plataforma.",
  },
  {
    icon: "📊",
    title: "Rastreamento de campanha embutido",
    description: "Pixels Meta e Google, UTM automático, taxa de conversão por produto. Você sabe qual anúncio trouxe qual venda — sem precisar de Google Tag Manager.",
  },
  {
    icon: "🔀",
    title: "Distribui leads entre vendedores",
    description: "Botão do WhatsApp redireciona automaticamente para o próximo vendedor no rodízio. Cada lead vai para o responsável certo, sem decisão manual.",
  },
  {
    icon: "🔁",
    title: "Recupera carrinho abandonado",
    description: "Lead saiu sem finalizar? O sistema envia o carrinho salvo no WhatsApp e traz ele de volta. Venda que seria perdida, fechada sem esforço.",
  },
]

export function VitrineSection() {
  return (
    <section className="py-24 px-6 bg-[#141416] border-y border-[#2A2A2E]">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="max-w-3xl mb-16">
          <p className="font-mono text-xs font-medium mb-3 uppercase tracking-widest" style={{ color: "#CAFF33" }}>
            Vitrine Inteligente
          </p>
          <h2 className="font-heading font-bold leading-tight mb-5" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", color: "#E8E8E8" }}>
            Mais que catálogo.<br />
            <span style={{ color: "#CAFF33" }}>Mais que landing page. Mais que e-commerce.</span>
          </h2>
          <p className="text-base leading-relaxed mb-6" style={{ color: "#8A8A8F" }}>
            Quem não tem site ganha presença profissional na web em minutos. Quem já tem, ganha uma página de vendas que qualifica, converte e registra — tudo num link compartilhável, sem custo de desenvolvimento.
          </p>

          {/* Comparativo rápido */}
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            {[
              { label: "Landing page", desc: "Apresenta, mas não qualifica nem registra pedido" },
              { label: "E-commerce", desc: "Registra pedido, mas exige alto investimento e operação" },
              { label: "Vitrine Inteligente", desc: "Qualifica, registra, distribui e rastreia — em um link", highlight: true },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl p-4 border"
                style={{
                  background: item.highlight ? "rgba(202,255,51,0.05)" : "#0C0C0E",
                  borderColor: item.highlight ? "rgba(202,255,51,0.25)" : "#2A2A2E",
                }}
              >
                <p className="font-heading font-bold text-sm mb-1" style={{ color: item.highlight ? "#CAFF33" : "#E8E8E8" }}>
                  {item.highlight && <span className="mr-1">✦</span>}{item.label}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: item.highlight ? "#8A8A8F" : "#555559" }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Grid de funcionalidades */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px rounded-2xl overflow-hidden" style={{ background: "#2A2A2E" }}>
          {VITRINE_FEATURES.map((feat) => (
            <div key={feat.title} className="p-6 flex flex-col gap-3" style={{ background: "#0C0C0E" }}>
              <span className="text-2xl">{feat.icon}</span>
              <div>
                <h3 className="font-heading font-bold text-base mb-1.5" style={{ color: "#E8E8E8" }}>
                  {feat.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#8A8A8F" }}>
                  {feat.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Rodapé da seção */}
        <p className="text-center text-sm mt-8" style={{ color: "#555559" }}>
          Incluso em todos os planos a partir do{" "}
          <span style={{ color: "#CAFF33" }}>Catálogo</span>.
          Nenhuma configuração técnica necessária.
        </p>
      </div>
    </section>
  )
}
