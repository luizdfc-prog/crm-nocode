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
      "Funil de vendas visual com drag-and-drop. Cada deal em seu estágio certo, nada perdido, nenhuma oportunidade esquecida. Do primeiro contato ao fechamento.",
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
      "Atende, qualifica e encaminha leads 24h por dia via WhatsApp — sem nenhum humano envolvido até o momento certo. Zero perda por demora no primeiro contato.",
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
    title: "Vitrine Inteligente",
    description:
      "Presença na web em minutos. Quiz de qualificação, carrinho, rastreamento UTM e pixels Meta/Google. O lead chega ao vendedor já sabendo o que quer.",
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
      "Visitante montou o carrinho e saiu? O sistema detecta o abandono e dispara uma mensagem no WhatsApp com os itens salvos — recuperando vendas que você perderia.",
    badge: "Pro IA",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M3 16l5-5 4 3 5-7 3 2" stroke="#CAFF33" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="1" y="1" width="20" height="20" rx="3" stroke="#CAFF33" strokeWidth="1.4" strokeOpacity="0.3"/>
      </svg>
    ),
    title: "Performance em tempo real",
    description:
      "Taxa de conversão, valor do pipeline, funil por etapa, analytics de catálogo e ROI por campanha — tudo em um dashboard. Você vê onde trava e age antes de perder.",
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
      "Lead parou de responder? Sequência de até 5 mensagens disparada automaticamente no tempo certo — sem depender do vendedor lembrar de dar retorno.",
    badge: "Pro IA",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="7" cy="11" r="3" stroke="#CAFF33" strokeWidth="1.4"/>
        <circle cx="17" cy="6" r="3" stroke="#CAFF33" strokeWidth="1.4"/>
        <circle cx="17" cy="16" r="3" stroke="#CAFF33" strokeWidth="1.4"/>
        <path d="M10 9.5l4-2.5M10 12.5l4 2.5" stroke="#CAFF33" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
    title: "Distribuição Inteligente de Leads",
    description:
      "Distribui leads automaticamente entre vendedores por peso configurável. Cada um recebe no seu WhatsApp, sem depender do Agente IA. Justo, rastreável e sem conflito.",
    badge: null,
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="2" y="6" width="8" height="5" rx="1.5" stroke="#CAFF33" strokeWidth="1.4"/>
        <rect x="12" y="11" width="8" height="5" rx="1.5" stroke="#CAFF33" strokeWidth="1.4" strokeOpacity="0.6"/>
        <path d="M6 11v2M16 6v3" stroke="#CAFF33" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.5"/>
        <path d="M3 18.5h16" stroke="#CAFF33" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.3"/>
        <circle cx="6" cy="18.5" r="1.2" fill="#CAFF33"/>
        <circle cx="16" cy="18.5" r="1.2" fill="#CAFF33" fillOpacity="0.5"/>
      </svg>
    ),
    title: "Múltiplos WhatsApp Business",
    description:
      "Conecte um número por vendedor via API oficial da Meta. Zero risco de bloqueio, disparos seguros e cada conversa entrando direto no pipeline do responsável.",
    badge: null,
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
      "Campos personalizados, filtros avançados, importação CSV, timeline de atividades e busca instantânea. Controle total sobre cada lead, do primeiro toque ao pós-venda.",
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
      "Cada lead chega com a campanha de origem identificada — canal, anúncio ou parceiro. Saiba qual investimento está gerando venda real, sem planilha, sem chute.",
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
            Tudo que falta no seu<br />processo de vendas
          </h2>
          <p className="text-base leading-relaxed" style={{ color: "#8A8A8F" }}>
            CRM, catálogo, IA e distribuição de leads em uma só plataforma. Menos ferramentas, mais controle, resultado visível desde o primeiro dia.
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
          {/* preenche células vazias na última linha para não mostrar o background do grid */}
          {Array.from({ length: (3 - (FEATURES.length % 3)) % 3 }).map((_, i) => (
            <div key={`empty-${i}`} style={{ background: "#141416" }} />
          ))}
        </div>
      </div>
    </section>
  );
}
