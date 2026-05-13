# Z4P — Roadmap do Produto

> Documento vivo. Atualizar conforme decisões e validações.
> Contexto completo em memória: `project_roadmap_catalogo.md`

---

## Situação Atual (Mai/2026)

- CRM base em produção (leads, pipeline, atividades, métricas)
- Múltiplos pipelines com etapas customizáveis
- Agente IA configurável por workspace ✅
- Planos Free/Pro com Stripe
- Convites de membros por e-mail
- Marca Z4P aplicada
- **WhatsApp via Baileys (QR Code) integrado** — recebe/envia mensagens, agente IA responde automaticamente ✅
- **Sessão Baileys persistida no Supabase** — sobrevive a restarts no Railway, sem precisar reler QR ✅
- **Envio de resposta funcionando para JID @lid** — formato interno do WhatsApp preservado ponta a ponta ✅
- **Sem duplicatas de mensagem** — apenas tipo `notify` processado (histórico `append` ignorado) ✅
- **Painel de conversa completo** — abas Perfil/Atividades, edição inline, redimensionável ✅
- **Pipeline com detalhe full-screen** — formulário + atividades + WhatsApp por negócio ✅
- **Cores de mensagem diferenciadas** — IA (verde) vs vendedor humano (branco) ✅
- **Cards vermelhos** em Conversas e Pipeline quando lead aguarda resposta ✅
- **Etapa Atual no painel** — mostra apenas a etapa mais recente do lead no pipeline (não histórico) ✅

- **Funil de conversão unificado no Dashboard** — card igual para todos os pipelines: visão geral, funil sem follow-ups, eficiência por etapa de follow-up ✅
- **Formulário de lead unificado** — mesma experiência de edição em Conversas, Leads e Pipeline ✅
- **Busca de leads por telefone** — inclui `conversations.phone_number` para leads @lid sem número real ✅
- **LID numérico não exibido como telefone** — detecção por comprimento ≥14 dígitos ✅
- **preloadLidMap corrigido** — não carrega LIDs como números reais após rollback ✅

**Bloqueadores ativos:**
- Domínio customizado (DNS pendente) → desbloqueia e-mails Resend

---

## Fase 1 — Validação (atual)

**Objetivo:** Produto rodando de ponta a ponta com clientes reais.

- [ ] Configurar domínio customizado na Vercel
- [ ] Verificar domínio no Resend (e-mails de convite funcionando)
- [ ] Atualizar `NEXT_PUBLIC_APP_URL` e `from` dos e-mails para o domínio real
- [x] Escolher API WhatsApp → Baileys (QR Code, sem API oficial)
- [x] Integrar WhatsApp ao agente IA (receber e enviar mensagens)
- [x] Conectar agente a um modelo de IA (Claude via Anthropic API)
- [x] Agente movimenta pipeline em tempo real durante conversa
- [ ] Smoke test completo com cliente real

---

## Fase 2 — Catálogo

**Objetivo:** Página pública por workspace para apresentar produtos ou serviços.

- [ ] Tabela `products` no banco (nome, descrição, preço, fotos, categoria, duração)
- [ ] URL pública por workspace: `z4p.app/catalogo/[slug]`
- [ ] Dois modos: **Produtos** (venda) e **Serviços** (agendamento)
- [ ] Layout mobile-first, sem login necessário
- [ ] Painel no CRM para o dono gerenciar o catálogo

---

## Fase 3 — Chat Flutuante com Agente IA

**Objetivo:** Agente atendendo visitantes do catálogo em tempo real, sem precisar do WhatsApp.

- [ ] Botão flutuante no catálogo (canto inferior direito)
- [ ] Chat nativo embutido — estilo iMessage, mobile-first
- [ ] Agente conhece o contexto do produto/serviço que o visitante está vendo
- [ ] Agente cria lead e movimenta pipeline durante a conversa (sem intervenção humana)
- [ ] WhatsApp acionado apenas quando necessário:
  - Confirmação de agendamento
  - Follow-up automático
  - Transferência para humano
- [ ] Captura obrigatória de nome + WhatsApp antes de encerrar conversa

---

## Fase 4 — Follow-up Automático ✅

**Objetivo:** Nenhum lead some sem receber follow-up.

- [x] Cron a cada 30 min verifica deals parados além do tempo configurado
- [x] Até 5 etapas de follow-up ativáveis individualmente em sequência (FU01–FU05)
- [x] Qualificando → FU01 direto após `silence_hours` sem resposta
- [x] Lead que responde em qualquer etapa volta para Qualificando automaticamente
- [x] Após última etapa sem resposta → Fechado Perdido automático
- [x] Mensagem + mídia opcional (imagem/áudio/vídeo) por etapa
- [x] Etapas ativas controlam colunas do pipeline e métricas do dashboard
- [x] Logs de movimentação com nome do usuário/sistema no histórico da conversa
- [x] Dashboard com filtro de período para medir conversão real por etapa de follow-up

---

## Fase 5 — Google Calendar (verticais de serviço)

**Objetivo:** Agendamento automático para dentistas, clínicas, estéticas, etc.

- [ ] Integração OAuth2 com Google Calendar
- [ ] Agente consulta slots disponíveis em tempo real durante a conversa
- [ ] Agente cria evento no Google Calendar do profissional
- [ ] Lead entra no pipeline como "Agendado"
- [ ] Confirmação automática no WhatsApp do cliente
- [ ] Lembrete automático (ex: 1 dia antes)

---

## Fase 6 — Rastreamento e Analytics

**Objetivo:** Dono saber de onde vêm os leads e qual campanha converte.

### UTM Tracking
- [ ] Captura automática de parâmetros UTM na URL do catálogo
- [ ] Campos no lead: Origem, Mídia, Campanha, Anúncio, Plataforma, Data de entrada
- [ ] Relatório de origem no CRM: leads e conversões por canal

### Pixels e Tags
- [ ] Painel no Z4P para o dono colar IDs (sem mexer em código):
  - Meta Pixel
  - Google Tag Manager
  - TikTok Pixel
  - Hotjar / Microsoft Clarity
- [ ] Eventos customizados disparados automaticamente:
  - `produto_visualizado`
  - `chat_iniciado`
  - `lead_capturado`
  - `agendamento_confirmado`

---

## Fase 7 — Inteligência Comercial

**Objetivo:** Relatórios que ajudam o dono a tomar decisão com dado real.

- [ ] Produtos/serviços mais acessados
- [ ] Produtos/serviços mais perguntados ao agente
- [ ] Taxa de conversão por produto/serviço
- [ ] Custo por lead por canal (entrada manual ou integração futura)
- [ ] Relatório de performance do agente (atendimentos, qualificados, transferidos)
- [ ] Dashboard comparativo: Meta Ads vs Google Ads vs TikTok vs Orgânico

---

## Planos (visão futura)

| Recurso | Free | Pro |
|---|---|---|
| CRM base | ✅ | ✅ |
| Pipeline múltiplos | ❌ | ✅ |
| Catálogo | ✅ (1) | ✅ ilimitado |
| Chat + Agente IA | ❌ | ✅ |
| Follow-up automático | ❌ | ✅ |
| Google Calendar | ❌ | ✅ |
| UTM Tracking | ❌ | ✅ |
| Pixels / GTM | ❌ | ✅ |
| Relatórios avançados | ❌ | ✅ |

---

## Verticais-alvo

- **Vendas** — times comerciais, freelancers, agências
- **Serviços com agendamento** — dentistas, clínicas estéticas, personal trainers, advogados, contadores
- **Infoprodutos** — lançamentos, cursos, mentorias

---

> Próxima ação: smoke test completo com cliente real → finalizar domínio customizado → iniciar Fase 2 (Catálogo).
