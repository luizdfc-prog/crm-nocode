export const metadata = {
  title: "Política de Privacidade — LeadLoop",
  description: "Política de privacidade do LeadLoop e integração com WhatsApp Business API.",
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0C0C0E] text-[#E8E8E8] py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "Syne, sans-serif" }}>
          Política de Privacidade
        </h1>
        <p className="text-[#CAFF33] text-sm font-semibold mb-1">LeadLoop — Esteira Inteligente de Lead</p>
        <p className="text-[#8A8A8F] text-sm mb-10">Última atualização: 15 de maio de 2026</p>

        <section className="flex flex-col gap-8 text-sm leading-relaxed text-[#8A8A8F]">
          <div>
            <h2 className="text-base font-semibold text-[#E8E8E8] mb-2">1. Quem somos</h2>
            <p>
              O LeadLoop é um produto da <strong className="text-[#E8E8E8]">Engenharia de IA</strong>, empresa brasileira
              especializada em automação de vendas com inteligência artificial. Nosso aplicativo conecta-se à
              WhatsApp Business API oficial da Meta para receber e enviar mensagens em nome dos nossos clientes.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#E8E8E8] mb-2">2. Dados coletados</h2>
            <p>Coletamos apenas os dados necessários para o funcionamento do serviço:</p>
            <ul className="list-disc list-inside mt-2 flex flex-col gap-1">
              <li>Número de telefone e nome do contato que envia mensagens</li>
              <li>Conteúdo das mensagens recebidas via WhatsApp</li>
              <li>Dados de acesso à conta Meta/WhatsApp Business fornecidos pelo próprio usuário</li>
              <li>Informações de uso da plataforma (logs de acesso, ações realizadas)</li>
            </ul>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#E8E8E8] mb-2">3. Como usamos os dados</h2>
            <ul className="list-disc list-inside flex flex-col gap-1">
              <li>Exibir conversas e leads no painel do CRM</li>
              <li>Acionar o agente de IA para responder automaticamente</li>
              <li>Registrar histórico de atividades e movimentações no pipeline</li>
              <li>Enviar notificações de follow-up configuradas pelo usuário</li>
            </ul>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#E8E8E8] mb-2">4. Compartilhamento de dados</h2>
            <p>
              Não vendemos, alugamos ou compartilhamos dados pessoais com terceiros para fins comerciais.
              Os dados são compartilhados apenas com provedores de infraestrutura necessários para o
              funcionamento do serviço (Supabase, Vercel, Anthropic para IA), todos com políticas de
              privacidade próprias e adequadas à LGPD.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#E8E8E8] mb-2">5. Integração com WhatsApp / Meta</h2>
            <p>
              Nossa integração utiliza exclusivamente a <strong className="text-[#E8E8E8]">WhatsApp Business API oficial da Meta</strong>.
              Os tokens de acesso fornecidos pelos clientes são armazenados de forma segura e utilizados
              apenas para envio e recebimento de mensagens autorizadas pelo próprio cliente.
              Não acessamos conversas pessoais nem dados fora do escopo autorizado.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#E8E8E8] mb-2">6. Retenção e exclusão</h2>
            <p>
              Os dados são retidos enquanto a conta estiver ativa. O cliente pode solicitar a exclusão
              completa de seus dados a qualquer momento pelo e-mail abaixo. Dados de conversas são
              excluídos em até 30 dias após a solicitação.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#E8E8E8] mb-2">7. Segurança</h2>
            <p>
              Utilizamos criptografia em trânsito (HTTPS/TLS) e em repouso. O acesso ao banco de dados
              é protegido por Row Level Security (RLS), garantindo isolamento total entre os dados de
              diferentes clientes.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#E8E8E8] mb-2">8. Seus direitos (LGPD)</h2>
            <p>Você tem direito a acessar, corrigir, exportar ou excluir seus dados. Entre em contato:</p>
            <p className="mt-2">
              <strong className="text-[#E8E8E8]">E-mail:</strong>{" "}
              <a href="mailto:engenharia.ia26@gmail.com" className="text-[#CAFF33] hover:underline">
                engenharia.ia26@gmail.com
              </a>
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#E8E8E8] mb-2">9. Alterações</h2>
            <p>
              Esta política pode ser atualizada periodicamente. Notificaremos os usuários por e-mail
              em caso de alterações relevantes.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
