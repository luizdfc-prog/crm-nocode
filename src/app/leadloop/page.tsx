import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'LeadLoop — Esteira Inteligente de Lead',
  description: 'Qualifica o lead. Libera o vendedor. Processo de vendas completo do anúncio ao fechamento, com rastreamento total do seu investimento.',
}

const benefits = [
  {
    icon: '🎯',
    title: 'Sabe de onde vem cada lead',
    description: 'Rastreamento automático de campanha, canal e anúncio. Saiba exatamente qual investimento está gerando venda de verdade — não só clique.',
  },
  {
    icon: '🗂️',
    title: 'Processo de vendas pronto',
    description: 'Pipeline visual com etapas claras. Nada se perde, nenhum lead esquecido. Do primeiro contato ao fechamento com histórico completo.',
  },
  {
    icon: '🛍️',
    title: 'Catálogo que qualifica antes do vendedor',
    description: 'Página pública com seus produtos. Quiz filtra quem tem interesse real, carrinho registra o pedido — o lead chega ao vendedor pronto para comprar.',
  },
  {
    icon: '⚡',
    title: 'Primeiro contato imediato',
    description: 'Agente IA responde no WhatsApp na hora — no momento em que o interesse é maior. Sem depender do vendedor estar disponível.',
  },
  {
    icon: '🔁',
    title: 'Follow-up que não deixa esfriar',
    description: 'Lead parou de responder? Sequência automática de mensagens retoma o contato no tempo certo. Sem precisar de planilha ou alguém lembrando.',
  },
  {
    icon: '📊',
    title: 'Clareza total para o gestor',
    description: 'Taxa de conversão, gargalos do funil, performance de campanha e ROI — tudo visível em tempo real. Você age antes de perder dinheiro.',
  },
  {
    icon: '🔀',
    title: 'Distribuição automática entre vendedores',
    description: 'Leads do catálogo distribuídos por peso configurável entre os vendedores. Cada um recebe no seu WhatsApp, de forma justa e rastreável.',
  },
  {
    icon: '📲',
    title: 'Múltiplos números, zero risco de bloqueio',
    description: 'Cada vendedor com seu próprio WhatsApp Business conectado via API oficial da Meta. Disparos seguros, sem app intermediário, sem risco de banimento.',
  },
  {
    icon: '🛒',
    title: 'Recupera quem abandona o carrinho',
    description: 'Visitante montou o pedido e foi embora? O sistema identifica e envia o carrinho salvo no WhatsApp. Venda recuperada sem nenhum esforço manual.',
  },
]

const steps = [
  { number: '01', title: 'Anúncio atrai', description: 'Lead clica no seu anúncio do Meta ou Google e chega ao seu catálogo.' },
  { number: '02', title: 'Catálogo qualifica', description: 'Lead vê seus produtos ou serviços, preços e detalhes. Já sabe o que quer.' },
  { number: '03', title: 'WhatsApp conecta', description: 'Lead inicia conversa com interesse real. Tudo registrado automaticamente no sistema.' },
  { number: '04', title: 'Vendedor fecha', description: 'Recebe o lead qualificado, com histórico completo. Foco total em fechar.' },
  { number: '05', title: 'Gestor enxerga tudo', description: 'Dashboard mostra origem, etapa, conversão e gaps do funil em tempo real.' },
]

export default function LeadLoopPage() {
  return (
    <div className="min-h-screen bg-[#0C0C0E] text-[#E8E8E8] font-sans">

      {/* Nav */}
      <nav className="border-b border-[#2A2A2E] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-heading font-800 text-xl tracking-tight text-[#E8E8E8]">
              Lead<span className="text-[#CAFF33]">L∞p</span>
            </span>
            <span className="hidden sm:inline text-xs text-[#555559] border border-[#2A2A2E] rounded-full px-2 py-0.5">
              by EngenhaIA
            </span>
          </div>
          <a
            href="https://wa.me/5534984089557?text=Ol%C3%A1%2C+quero+saber+mais+sobre+o+LeadLoop"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#CAFF33] text-[#0C0C0E] font-semibold text-sm px-4 py-2 rounded-lg hover:bg-[#b8e62e] transition-colors"
          >
            Falar com especialista
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#141416] border border-[#2A2A2E] rounded-full px-4 py-1.5 text-sm text-[#8A8A8F] mb-8">
            <span className="w-2 h-2 rounded-full bg-[#CAFF33] animate-pulse" />
            Esteira Inteligente de Lead
          </div>

          <h1 className="font-heading font-bold text-5xl md:text-7xl leading-tight tracking-tight mb-6">
            Lead<span className="text-[#CAFF33]">L∞p</span>
          </h1>

          <p className="text-2xl md:text-3xl font-heading text-[#E8E8E8] mb-4">
            Qualifica o lead.{' '}
            <span className="text-[#CAFF33]">Libera o vendedor.</span>
          </p>

          <p className="text-[#8A8A8F] text-lg max-w-2xl mx-auto mb-12 leading-relaxed">
            Processo de vendas completo para quem investe em anúncios. Do clique na campanha
            ao fechamento — com rastreamento total do seu investimento.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://wa.me/5534984089557?text=Ol%C3%A1%2C+quero+saber+mais+sobre+o+LeadLoop"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#CAFF33] text-[#0C0C0E] font-semibold text-base px-8 py-4 rounded-xl hover:bg-[#b8e62e] transition-colors"
            >
              Quero conhecer o LeadLoop
            </a>
            <a
              href="#como-funciona"
              className="border border-[#2A2A2E] text-[#E8E8E8] font-semibold text-base px-8 py-4 rounded-xl hover:bg-[#141416] transition-colors"
            >
              Ver como funciona
            </a>
          </div>
        </div>
      </section>

      {/* Dor */}
      <section className="px-6 py-16 bg-[#141416] border-y border-[#2A2A2E]">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[#8A8A8F] text-sm uppercase tracking-widest mb-6 font-mono">
            Você reconhece esse cenário?
          </p>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            {[
              { emoji: '💸', text: 'Investe em anúncio todo mês mas não consegue provar qual campanha gerou venda de verdade' },
              { emoji: '📱', text: 'Lead chega no WhatsApp, vendedor atende no improviso, sem histórico, sem processo — e perde a venda' },
              { emoji: '🔍', text: 'Não sabe onde o lead some. Entra no funil, para em alguma etapa e desaparece sem motivo claro' },
            ].map((item, i) => (
              <div key={i} className="bg-[#0C0C0E] border border-[#2A2A2E] rounded-xl p-5">
                <span className="text-2xl mb-3 block">{item.emoji}</span>
                <p className="text-[#8A8A8F] text-sm leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
          <p className="text-[#E8E8E8] text-lg mt-10 font-heading">
            O LeadLoop resolve isso. <span className="text-[#CAFF33]">Organização, controle e clareza — do anúncio ao fechamento.</span>
          </p>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="px-6 py-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#8A8A8F] text-sm uppercase tracking-widest mb-3 font-mono">Como funciona</p>
            <h2 className="font-heading font-bold text-3xl md:text-4xl">
              Do anúncio ao fechamento,{' '}
              <span className="text-[#CAFF33]">sem perder o fio</span>
            </h2>
          </div>

          <div className="relative">
            {/* linha vertical */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-[#2A2A2E] hidden md:block" />

            <div className="space-y-8">
              {steps.map((step) => (
                <div key={step.number} className="flex gap-6 md:pl-16 relative">
                  <div className="absolute left-0 top-1 hidden md:flex w-12 h-12 rounded-full bg-[#141416] border border-[#2A2A2E] items-center justify-center flex-shrink-0">
                    <span className="font-mono text-xs text-[#CAFF33]">{step.number}</span>
                  </div>
                  <div className="bg-[#141416] border border-[#2A2A2E] rounded-xl p-5 flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-xs text-[#CAFF33] md:hidden">{step.number}</span>
                      <h3 className="font-heading font-bold text-lg">{step.title}</h3>
                    </div>
                    <p className="text-[#8A8A8F] text-sm leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="px-6 py-24 bg-[#141416] border-y border-[#2A2A2E]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#8A8A8F] text-sm uppercase tracking-widest mb-3 font-mono">O que você ganha</p>
            <h2 className="font-heading font-bold text-3xl md:text-4xl">
              Tudo numa plataforma só —{' '}
              <span className="text-[#CAFF33]">sem gambiarras</span>
            </h2>
            <p className="text-[#8A8A8F] text-base mt-4 max-w-xl mx-auto">
              Organização, controle e transparência para crescer sem queimar dinheiro — e saber exatamente o que melhorar nas campanhas, em tempo real.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {benefits.map((benefit, i) => (
              <div
                key={i}
                className="bg-[#0C0C0E] border border-[#2A2A2E] rounded-xl p-6 hover:border-[#CAFF33]/30 transition-colors"
              >
                <span className="text-3xl mb-4 block">{benefit.icon}</span>
                <h3 className="font-heading font-bold text-base mb-2">{benefit.title}</h3>
                <p className="text-[#8A8A8F] text-sm leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Para quem é */}
      <section className="px-6 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[#8A8A8F] text-sm uppercase tracking-widest mb-3 font-mono">Para quem é</p>
          <h2 className="font-heading font-bold text-3xl md:text-4xl mb-12">
            Feito para quem{' '}
            <span className="text-[#CAFF33]">investe em anúncios</span>
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { emoji: '🏪', label: 'Comércio local' },
              { emoji: '🏥', label: 'Clínicas e estéticas' },
              { emoji: '🏗️', label: 'Construtoras e imobiliárias' },
              { emoji: '📚', label: 'Cursos e serviços' },
            ].map((item, i) => (
              <div key={i} className="bg-[#141416] border border-[#2A2A2E] rounded-xl p-5">
                <span className="text-3xl mb-3 block">{item.emoji}</span>
                <p className="text-sm font-semibold">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="px-6 py-24 bg-[#141416] border-t border-[#2A2A2E]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-heading font-bold text-3xl md:text-5xl mb-4 leading-tight">
            Chega de perder lead{' '}
            <span className="text-[#CAFF33]">por falta de processo.</span>
          </h2>
          <p className="text-[#8A8A8F] text-lg mb-10">
            Fale com um especialista da EngenhaIA e veja como o LeadLoop se encaixa no seu processo de vendas em menos de 20 minutos.
          </p>
          <a
            href="https://wa.me/5534984089557?text=Ol%C3%A1%2C+quero+saber+mais+sobre+o+LeadLoop"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-[#CAFF33] text-[#0C0C0E] font-semibold text-lg px-10 py-4 rounded-xl hover:bg-[#b8e62e] transition-colors"
          >
            Quero conhecer o LeadLoop
          </a>
          <p className="text-[#555559] text-sm mt-6">
            Sem compromisso. Conversa rápida de 20 minutos.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-[#2A2A2E]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[#555559] text-sm">
          <span>
            <span className="text-[#E8E8E8] font-heading font-bold">Lead<span className="text-[#CAFF33]">L∞p</span></span>
            {' '}by EngenhaIA
          </span>
          <span>Especialistas em soluções com IA para pequenas e médias empresas</span>
        </div>
      </footer>

    </div>
  )
}
