const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="1" y="3" width="4" height="16" rx="1.5" fill="#CAFF33" fillOpacity="0.15" stroke="#CAFF33" strokeWidth="1.4"/>
        <rect x="9" y="7" width="4" height="12" rx="1.5" fill="#CAFF33" fillOpacity="0.15" stroke="#CAFF33" strokeWidth="1.4"/>
        <rect x="17" y="1" width="4" height="20" rx="1.5" fill="#CAFF33" fillOpacity="0.15" stroke="#CAFF33" strokeWidth="1.4"/>
      </svg>
    ),
    title: "Pipeline Kanban",
    description:
      "Visualize negócios em cada etapa com drag-and-drop. Mova cards entre colunas e acompanhe o funil em tempo real.",
    badge: null,
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="4" stroke="#CAFF33" strokeWidth="1.4"/>
        <path d="M11 2v2M11 18v2M2 11h2M18 11h2" stroke="#CAFF33" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M5 5l1.5 1.5M15.5 15.5L17 17M17 5l-1.5 1.5M6.5 15.5L5 17" stroke="#CAFF33" strokeWidth="1.3" strokeLinecap="round"/>
        <circle cx="11" cy="11" r="1.5" fill="#CAFF33"/>
      </svg>
    ),
    title: "Agente IA no WhatsApp",
    description:
      "Seu vendedor que nunca dorme. Qualifica leads, tira dúvidas e apresenta produtos 24h por dia — transferindo para o time humano só quem tem potencial real.",
    badge: "Pro IA",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="2" y="5" width="18" height="13" rx="2" stroke="#CAFF33" strokeWidth="1.4"/>
        <path d="M6 9h5M6 12h3" stroke="#CAFF33" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="15" cy="10.5" r="2.5" stroke="#CAFF33" strokeWidth="1.2"/>
        <path d="M15 13v3" stroke="#CAFF33" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M6 3v2M16 3v2" stroke="#CAFF33" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
    title: "Catálogo Público",
    description:
      "Crie uma vitrine online dos seus produtos com link compartilhável. Quiz de qualificação, carrinho, rastreamento UTM e pixels Meta/Google inclusos.",
    badge: "Catálogo",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M4 4h14a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" stroke="#CAFF33" strokeWidth="1.4"/>
        <path d="M7 18h8M11 14v4" stroke="#CAFF33" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M7 8.5l2.5 2.5L15 7" stroke="#CAFF33" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Recuperador de Carrinho",
    description:
      "Banner automático para visitantes que abandonaram o carrinho. No Pro IA, envia mensagem via WhatsApp com o carrinho salvo para fechar a venda.",
    badge: "Catálogo",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M3 16l5-5 4 3 5-7 3 2" stroke="#CAFF33" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="1" y="1" width="20" height="20" rx="3" stroke="#CAFF33" strokeWidth="1.4" strokeOpacity="0.3"/>
      </svg>
    ),
    title: "Métricas em tempo real",
    description:
      "Dashboard com taxa de conversão, valor do pipeline, funil de leads, analytics de catálogo e gráficos de campos personalizados — tudo calculado automaticamente.",
    badge: null,
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="8" r="4" stroke="#CAFF33" strokeWidth="1.4"/>
        <path d="M3 19c0-3.314 3.582-6 8-6s8 2.686 8 6" stroke="#CAFF33" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="18" cy="6" r="2.5" fill="#CAFF33" fillOpacity="0.2" stroke="#CAFF33" strokeWidth="1.2"/>
        <path d="M20.5 10c1.5.8 2.5 2.2 2.5 3.8" stroke="#CAFF33" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
    title: "Multi-empresa",
    description:
      "Gerencie vários workspaces em uma conta. Convide colaboradores, defina papéis e permissões granulares por pipeline e mantenha tudo isolado por empresa.",
    badge: null,
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 2L13.5 8h6l-5 3.5 2 6L11 14l-5.5 3.5 2-6L2 8h6L11 2z" stroke="#CAFF33" strokeWidth="1.4" strokeLinejoin="round" fill="#CAFF33" fillOpacity="0.1"/>
      </svg>
    ),
    title: "Follow-up Automático",
    description:
      "Configure até 5 etapas de follow-up com delay configurável. O agente retoma conversas inativas e empurra leads para a próxima etapa sem intervenção humana.",
    badge: "Pro IA",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="3" width="7" height="7" rx="2" stroke="#CAFF33" strokeWidth="1.4"/>
        <rect x="12" y="3" width="7" height="7" rx="2" stroke="#CAFF33" strokeWidth="1.4" strokeOpacity="0.5"/>
        <rect x="3" y="12" width="7" height="7" rx="2" stroke="#CAFF33" strokeWidth="1.4" strokeOpacity="0.5"/>
        <rect x="12" y="12" width="7" height="7" rx="2" stroke="#CAFF33" strokeWidth="1.4"/>
      </svg>
    ),
    title: "Gestão de leads",
    description:
      "Campos personalizados, filtros avançados, importação CSV, timeline de atividades e busca instantânea. Tudo que você precisa para nunca perder um lead.",
    badge: null,
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M4 17l4-4 3 3 3-4 4 4" stroke="#CAFF33" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="7" cy="7" r="3" stroke="#CAFF33" strokeWidth="1.4"/>
        <path d="M18 4v6M15 7h6" stroke="#CAFF33" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    title: "Origem automática do lead",
    description:
      "Links rastreados para WhatsApp identificam de qual campanha, parceiro ou canal cada lead veio — sem formulários extras, só com o primeiro contato.",
    badge: null,
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="max-w-xl mb-16">
          <p
            className="font-mono text-xs font-medium mb-3 uppercase tracking-widest"
            style={{ color: "#CAFF33" }}
          >
            Funcionalidades
          </p>
          <h2
            className="font-heading font-bold leading-tight mb-4"
            style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", color: "#E8E8E8" }}
          >
            CRM + Catálogo + Agente IA
          </h2>
          <p className="text-base leading-relaxed" style={{ color: "#8A8A8F" }}>
            Tudo que você precisa para capturar, qualificar e fechar leads — sem precisar de dez ferramentas diferentes.
          </p>
        </div>

        {/* Grid */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px rounded-2xl overflow-hidden"
          style={{ background: "#2A2A2E" }}
        >
          {FEATURES.map((feat) => (
            <div
              key={feat.title}
              className="feature-card p-7 flex flex-col gap-4 transition-colors duration-200"
              style={{ background: "#141416" }}
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "rgba(202,255,51,0.07)",
                    border: "1px solid rgba(202,255,51,0.15)",
                  }}
                >
                  {feat.icon}
                </div>
                {feat.badge && (
                  <span
                    className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0"
                    style={{ background: "rgba(202,255,51,0.08)", color: "#CAFF33", border: "1px solid rgba(202,255,51,0.18)" }}
                  >
                    {feat.badge}
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg mb-2" style={{ color: "#E8E8E8" }}>
                  {feat.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#8A8A8F" }}>
                  {feat.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
