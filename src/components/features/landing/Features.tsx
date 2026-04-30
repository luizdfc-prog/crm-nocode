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
      "Gerencie vários workspaces em uma conta. Convide colaboradores, defina papéis e mantenha tudo isolado por empresa.",
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
      "Dashboard com taxa de conversão, valor do pipeline, leads por etapa e atividades recentes — tudo calculado automaticamente.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="2" y="5" width="18" height="14" rx="2.5" stroke="#CAFF33" strokeWidth="1.4"/>
        <path d="M7 5V3.5a1.5 1.5 0 0 1 3 0V5M12 5V3.5a1.5 1.5 0 0 1 3 0V5" stroke="#CAFF33" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="11" cy="13" r="2.5" stroke="#CAFF33" strokeWidth="1.3"/>
        <path d="M11 10.5v-.5M11 16v-.5M8.5 13h-.5M14 13h-.5" stroke="#CAFF33" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
    title: "Segurança por design",
    description:
      "Row Level Security no PostgreSQL garante isolamento total entre workspaces. Nenhum dado vaza entre empresas.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 2L13.5 8h6l-5 3.5 2 6L11 14l-5.5 3.5 2-6L2 8h6L11 2z" stroke="#CAFF33" strokeWidth="1.4" strokeLinejoin="round" fill="#CAFF33" fillOpacity="0.1"/>
      </svg>
    ),
    title: "Timeline de atividades",
    description:
      "Registre ligações, e-mails, reuniões e notas em cada lead. Histórico completo para nunca perder o contexto de uma negociação.",
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
      "Cadastre, filtre e acompanhe leads com campos completos — empresa, cargo, status, responsável. Busca instantânea na listagem.",
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
            Tudo que seu time de vendas precisa
          </h2>
          <p className="text-base leading-relaxed" style={{ color: "#8A8A8F" }}>
            Sem excesso, sem falta. PipeFlow entrega o essencial para fechar mais negócios com menos esforço.
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
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: "rgba(202,255,51,0.07)",
                  border: "1px solid rgba(202,255,51,0.15)",
                }}
              >
                {feat.icon}
              </div>
              <div>
                <h3
                  className="font-heading font-bold text-lg mb-2"
                  style={{ color: "#E8E8E8" }}
                >
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
