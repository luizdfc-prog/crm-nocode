# Melhorias de UX — Z4P CRM

Histórico de ajustes de usabilidade e bugs corrigidos. Usar como referência no deploy para produção.

---

## Concluído

### Chat / Conversas

- Player de áudio com botão verde sólido e visível
- Cursor mãozinha em todos os elementos clicáveis (`globals.css`)
- Ctrl+V para colar imagens/screenshots diretamente no campo de mensagem
- Botões do header da conversa em verde (`#CAFF33`) com `style` inline (CSS variables não funcionam no Tailwind JIT)
- Cards vermelhos (`border-l + bg`) para conversas com `needs_reply = true`
- Botão "Respondido" vermelho no header do chat
- Atualização automática da lista de conversas a cada 5 segundos (polling com flag anti-overlap)
- Roteamento Baileys vs Meta API no `sendMessage` — verifica `phone_number_id.startsWith("baileys:")`
- Deduplicação de conversas — remove filtro `status = "open"`, reabre conversa fechada em vez de criar nova
- Preview da última mensagem no card (colunas `last_message_content` / `last_message_direction` na tabela `conversations`)
- Filtro de grupos (`@g.us`), newsletters (`@newsletter`) e mensagens de sistema no webhook Baileys
- Exclusão de conversa com modal de confirmação (admin only)
- Botão de exclusão na lista lateral e no header do chat — ambos abrem modal
- Exclusão em cascata: deletar conversa remove mensagens + lead + atividades do lead
- Exclusão em cascata reversa: `deleteLead` remove atividades + mensagens + conversas vinculadas

### Painel lateral do Chat

- Painel permanente à direita quando conversa tem lead vinculado (substitui overlay flutuante)
- Abas **Perfil** e **Atividades** em verde no painel lateral
- Aba Perfil: dados do lead, editar perfil (LeadForm), ver página completa, adicionar ao pipeline
- Aba Atividades: `ActivityForm` + `ActivityTimeline` inline, sem sair da tela
- Nome do lead editável inline no topo do painel (clique no nome → input → Enter/Escape/blur salva)
- Alteração de nome reflete em tempo real na lista de conversas e no card de Leads

### Layout / Colunas

- Coluna da lista de conversas com fundo claro (`#E8E8E8`) e texto escuro para contraste
- Divisores arrastáveis entre lista↔chat e chat↔painel lateral (redimensionamento livre)
  - Lista: mín. 200px, máx. 520px, padrão 320px
  - Painel: mín. 220px, máx. 480px, padrão 288px
- Cursor `col-resize` e highlight verde ao hover nos divisores

### Leads

- Abas "Atividades" e "WhatsApp" no card do lead em verde com opacidade (sempre visíveis)
- Seção "Etapa Atual" no perfil do lead — mostra apenas a etapa mais recente no pipeline (sem histórico)

### Baileys / WhatsApp

- Sessão Baileys persistida na tabela `baileys_auth` do Supabase via fetch REST direto (sem SDK — evita erro WebSocket Node.js 20)
- Envio de resposta do agente usando JID original `@lid` preservado ponta a ponta — não reconstrói para `@s.whatsapp.net`
- `formatJid` no servidor Baileys corrigida: se o JID já contém `@`, usa direto sem modificar
- Mensagens duplicadas eliminadas: webhook processa apenas tipo `notify` (novas mensagens); `append` (histórico) ignorado
- Envio do agente chama Railway diretamente (`BAILEYS_SERVER_URL/send/text`) — não usa proxy interno da Vercel

---

- Indicador "digitando..." no chat — bubble verde animado (3 pontos) aparece quando IA está processando, some ao receber resposta outbound
- Notificação sonora para novas mensagens — tom gerado via Web Audio API (sem arquivo externo), toca quando chega conversa nova com `needs_reply`

### Pipeline

- Botão de lixeira no `DealCard` corrigido — z-index da área de drag (`z-10`) sobrepunha o botão de delete (`z-30`); agora aparece corretamente no hover

### Mídia nas Etapas de Follow-up

- Cada etapa de follow-up pode ter uma mídia opcional (imagem, áudio ou vídeo)
- Upload por clique ou arrastar na própria aba Follow-up
- Preview de imagem após upload + campo de legenda (imagem/vídeo) ou sem legenda (áudio)
- Cron envia texto primeiro (se houver) e mídia logo em seguida via Baileys `/send/media`
- Arquivo salvo em `followup/{workspace_id}/` no bucket `whatsapp-media`
- Tooltip explicando tipos aceitos e comportamento em cada campo de mídia

### Follow-up Automático (Configurações)

- Aba "Follow-up" adicionada nas Configurações (acesso admin)
- 4 etapas fixas espelhando exatamente as colunas do pipeline do Agente IA: Aguardando Resposta, Follow-up 01, Follow-up 02, Follow-up 03
- Cada etapa tem campo de delay em horas e textarea de mensagem editável
- Campo "Tempo de silêncio para iniciar" — horas em Qualificando antes de mover para Aguardando Resposta
- Toggle global para ativar/desativar o sistema
- Fluxo resumido no rodapé da aba (Qualificando → Xh → etapas → Fechado Perdido)
- Config salva em `agent_config.follow_up` (JSONB) no Supabase

### Biblioteca de Mídias do Agente IA

- Seção "Biblioteca de Mídias" adicionada na aba "Agente IA" das Configurações
- Admin cadastra imagens, áudios e vídeos (até 16 MB, máx. 20 por workspace)
- Cada mídia tem nome e instrução de quando o agente deve enviá-la
- O agente decide sozinho o momento certo via marcador `[ENVIAR_MIDIA:id]` na resposta
- Webhook detecta o marcador, envia a mídia via Baileys e remove o marcador da mensagem visível
- Arquivo salvo no bucket `whatsapp-media` do Supabase Storage em `agent-media/{workspace_id}/`
- Tour guiado de 4 passos (O que é / Como funciona / Formatos aceitos / Como começar) aparece automaticamente na primeira visita; botão "Ver tutorial" para reabrir depois
- Tooltips contextuais em cada campo (nome e instrução de envio)

### Distribuição de Leads entre Pipelines (Agente IA)

- Seção "Distribuição de Leads" na aba "Agente IA" das Configurações
- Toggle para ativar round-robin ponderado
- Admin marca quais pipelines de vendas recebem leads transferidos pelo agente
- Campo de % por pipeline com validação (soma deve ser 100%)
- Botão "Distribuir igualmente" auto-balanceia os pesos
- Algoritmo de déficit garante distribuição proporcional ao longo do tempo
- Config salva em `agent_config.routing` (JSONB); contadores em `lead_routing_counters`

### Dashboard — Campos Personalizados por Contexto

- **Pipeline Ativo** exibe apenas campos de leads com deals em etapas abertas (`novo_lead`, `contato_realizado`, `proposta_enviada`, `negociacao`)
- **Relatório de Vendas** exibe apenas campos de leads com deals encerrados (`fechado_ganho` ou `fechado_perdido`)
- Campos do tipo **Texto** agora aparecem como lista rankeada (posição, valor, barra de progresso) em vez de donut/barras
- Valores idênticos em campos de texto são agrupados automaticamente (case-insensitive, trim) — ex: "Jardim Karaiba" e "jardim karaiba" viram uma entrada
- Lista exibe até 15 entradas; indica quantos valores únicos adicionais existem
- Mesmo comportamento na aba Pipeline Ativo e no Relatório de Vendas

### Campos Personalizados — Obrigatoriedade por Etapa do Pipeline

- Admin pode marcar um campo como obrigatório para uma etapa específica de um pipeline
- Configuração disponível no formulário de criação e edição de campos (Settings → Campos)
- Seletor de pipeline + etapa; suporte a múltiplas regras por campo
- Badge laranja no card do campo indica em quantas etapas é obrigatório
- Ao arrastar um deal para uma etapa com campo obrigatório não preenchido, modal de bloqueio aparece
- Modal lista os campos pendentes e oferece link direto para a página do lead para preenchimento
- Deal não é movido até os campos serem preenchidos
- Migration `025_required_fields.sql`: coluna `required_for jsonb DEFAULT '[]'` na tabela `lead_field_definitions`

### Painel Admin — Melhorias

- Filtro de calendário (de/até) na aba **Negócio** do painel admin (`/admin`)
- Monitoramento da API Anthropic movido para aba **Infraestrutura** (junto com Railway/Supabase)
- Campo de saldo manual da Anthropic: admin informa o crédito disponível após cada recarga
- Barra de progresso de tokens com alerta visual (verde → laranja → vermelho conforme consumo)
- Status Railway unificado: consulta diretamente o endpoint `/status` do Railway em vez de inferir pelo banco
- Botão "Excluir todos" para limpar usuários órfãos (sem workspace) em massa
- Saldo Anthropic persistido na tabela `usage_logs` com `event_type = 'manual_balance_usd'`

### Biblioteca de Mídias do Agente IA — Múltiplos Arquivos por Grupo

- Cada item da biblioteca agora é um **grupo** que suporta múltiplos arquivos (imagens, áudios ou vídeos)
- Botão "+ Adicionar arquivo" dentro de cada grupo
- Backward compatible: itens antigos (arquivo único) continuam funcionando via `normalizeMedia()`
- Webhook envia todos os arquivos do grupo sequencialmente quando o agente aciona o grupo
- Counter atualizado: "X grupos · Y arquivos cadastrados"

### Catálogo Público (`/c/[slug]`)

- Rota pública sem login (`src/app/c/[slug]/page.tsx` + `src/app/c/layout.tsx`)
- Página mobile-first estilo delivery app: banner, chips de categoria, grid de produtos 2 colunas
- Banner em três modos: imagem única, carrossel automático (4s com dots), vídeo muted/loop
- Botão flutuante "Falar no WhatsApp" + botão "+ detalhes" por produto card
- Migrations: `026_catalog.sql`, `027_catalog_banner.sql`, `028_catalog_tracking.sql`
- Bucket `catalog-images` no Supabase Storage; `remotePatterns` configurado no `next.config.ts`
- Custom dropdown escuro para seleção de categoria (substitui `<select>` nativo — fundo branco no Windows)
- Sticky save bar via `saveRef` pattern — botão salvar sempre visível sem scroll

### Rastreamento do Catálogo

- Eventos nativos: `page_view` (mount), `product_view` (hover), `whatsapp_click` (botão)
- `CatalogTrackingSection`: cards de métricas, BarChart diário com filtro 7/30/90d, ranking top produtos
- Pixels externos configuráveis pelo painel: Meta Pixel, GTM, GA4, TikTok Pixel
- UTM padrão configurável (utm_source/medium/campaign) — adicionados nos links WhatsApp do catálogo

### UTM de Campanha → Campos do Lead

- URL de campanha `/c/slug?utm_source=instagram&utm_campaign=verao` é lida ao montar a página
- Tags embutidas automaticamente na mensagem WhatsApp: `[utm_source:x][utm_medium:y][utm_campaign:z]`
- Webhook `whatsapp-qr/route.ts` extrai as tags (`extractUtmTags`) e chama `saveUtmFields`
- `saveUtmFields` cria os campos `UTM Source`, `UTM Medium`, `UTM Campaign` no workspace automaticamente se não existirem (tipo `text`, `lead_field_definitions`)
- Valores salvos em `lead_field_values` — aparecem na seção de campos personalizados do lead e no dashboard

### Catálogo — Melhorias de UX e Configuração

- Banner aceita GIF animado — usa `<img>` nativo quando URL termina em `.gif` (preserva animação; `next/image` converte e perde o loop)
- Botão por produto renomeado de "Pedir" para "+ detalhes"
- Textos dos botões WhatsApp configuráveis pelo painel (seção "Texto dos botões WhatsApp" na aba Rastreamento):
  - `cta_message` — botão flutuante e header ("Olá! Vi seu catálogo e tenho interesse.")
  - `cta_product_message` — botão por produto, com placeholder `{produto}` substituído pelo nome real; preview ao vivo
  - Migration `029_catalog_cta_message.sql`
- Card informativo fixo no topo da aba Campos (Settings) explicando UTMs de campanha — sempre visível, sem interferir nos campos do cliente

### Follow-up Automático — Redesenho completo (2026-05-13)

- Etapa "Aguardando Resposta" removida do pipeline do Agente IA — migration `031_remove_aguardando_resposta.sql`
- Qualificando vai direto para Follow-up 01 após `silence_hours` sem resposta
- Lead que responde em qualquer etapa de follow-up volta automaticamente para Qualificando (webhook)
- Cron corrigido de `0 0 * * *` (1x/dia meia-noite) para `*/30 * * * *` (a cada 30 min)
- `FollowUpTab`: toggle e fluxo resumido atualizados para refletir novo caminho

### Follow-up — Até 5 Etapas com Ativação Individual (2026-05-13)

- Toggle global removido — cada etapa (Follow-up 01 a 05) tem seu próprio toggle ativo/inativo
- Regra sequencial: não é possível ativar a etapa 3 sem que 2 e 1 estejam ativas; desativar uma etapa desativa todas as seguintes
- Ao salvar, as colunas do pipeline são sincronizadas automaticamente: etapas ativadas são criadas, desativadas são removidas (deals movidos para Qualificando antes)
- Dashboard e funil exibem apenas etapas ativas
- Migration `032_followup_5_stages.sql`: cria FU04/FU05 no banco; migra JSONB para adicionar `enabled: true` nas steps existentes
- `FollowUpTab`: accordeon por etapa (expandir/recolher), delay de cada etapa visível no header colapsado

### Logs de Movimentação de Etapa + Mensagens de Sistema no Chat (2026-05-13)

- Tabela `deal_stage_logs`: registra toda movimentação entre etapas (workspace, deal, pipeline, from/to stage, moved_by, lead, created_at) — migration `033_deal_stage_logs.sql`
- `moved_by`: `"cron"` (follow-up automático), `"webhook"` (lead respondeu), `"user"` (vendedor)
- Para movimentações manuais, grava o **nome do usuário** que moveu
- Mensagem de sistema aparece no histórico da conversa (tipo `"system"`, renderizado centralizado no chat):
  - `"Movido automaticamente: Qualificando → Follow-up 01"` (cron)
  - `"Lead respondeu — retornou para: Qualificando"` (webhook)
  - `"Lucas moveu: Proposta Enviada → Fechado Ganho"` (usuário)
- Cobre **todos os pipelines** (agente, vendas, custom) e todos os que forem criados no futuro
- Pontos de registro: `reorderDeals` (drag-and-drop), `updateDeal` (card), cron, webhook

### Dashboard — Eficiência de Follow-ups com Dados Reais e Filtro de Período (2026-05-13)

- `followUpEfficiency` reescrito para usar `deal_stage_logs` reais em vez de estimativa proporcional
- Métrica correta: `leadsResponderam / entradas` (quantos passaram pela etapa vs quantos responderam)
- Campo `"N aguardando agora"` mostra deals parados na etapa no momento
- Filtro de período no widget: **7 / 30 / 90 / 365 dias / Todo período** — atualiza sem reload via server action
- `getFunnelStats(periodDays?)`: parâmetro opcional de período aplicado às queries de logs

### Dashboard — Aba Catálogo (Funil de Conversão)

- Nova aba **Catálogo** no Dashboard ao lado de "Pipeline Ativo" e "Relatório de Vendas"
- Componente `CatalogFunnelWidget.tsx` com dois painéis:
  - **Funil de conversão** — Visitas → Visualizaram produto → Clicaram WhatsApp, com taxa % entre cada etapa (verde/laranja/vermelho por limiar) e taxa global visita→WhatsApp no rodapé
  - **Conversão por campanha** — tabela com cada `utm_campaign` detectada: visitas, cliques WhatsApp, taxa %, barra de progresso colorida
  - Tráfego sem UTM agrupado como "(direto)"
- Filtro de período 7d / 30d / 90d com atualização sem reload
- Action `getCatalogFunnelStats` em `src/actions/catalogTracking.ts`
- Dados carregados no servidor em `dashboard/page.tsx` via `Promise.all`

### Pipeline — Filtros de Busca

- Campo de busca textual (nome, lead, telefone) + painel expansível com filtros de período, etapa, responsável e toggle "Apenas Retornos"
- Badge contador de filtros ativos; botão "Limpar" aparece quando há filtro ativo
- Componente `PipelineFilters.tsx` com `applyPipelineFilters` utilitário usado no `PipelineClient`
- Filtros resetam automaticamente ao trocar de pipeline

### Leads — Filtro de Período

- Dropdown "Qualquer período / Hoje / Esta semana / Este mês / Este trimestre" adicionado ao `LeadFilters`
- Utilitário `getPeriodStart` exportado de `LeadFilters.tsx`

### Pipeline — Correção de Duplicação de Cards

- Cards só são duplicados ao mover de Agente IA → Transferido (comportamento correto de cópia para pipeline de vendas); todos os outros movimentos apenas reposicionam
- Bug corrigido: `.single()` na busca de `existingDeal` retornava `null` quando havia mais de um resultado, caindo no bloco `else { INSERT }` → trocado para `.maybeSingle()` + early return
- Etapas `fechado_ganho` e `fechado_perdido` excluídas da busca do deal existente (evita duplicar após retorno de lead)

### Pipeline — Encerramento Automático de Conversa

- Ao mover um deal para `fechado_ganho` ou `fechado_perdido`, a conversa do lead vinculado é automaticamente encerrada (`status: "closed"`, `ai_active: false`)
- Implementado ao final da action `reorderDeals` em `src/actions/deals.ts`

### Pipeline — Badge "Retorno"

- Quando um lead retorna após deal encerrado, novo card é criado com `is_return: true`
- Badge vermelho "RETORNO" aparece no canto superior esquerdo do `DealCard`
- Título do card recebe `pt-4` quando `is_return` para não sobrepor o badge
- Migration `030_deal_is_return.sql`: `ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS is_return boolean NOT NULL DEFAULT false`

### Dashboard — Aba Funis de Conversão (redesenhado em 2026-05-13)

- Nova aba **Funis** no Dashboard com ícone `GitMerge`
- Componente `PipelineFunnelWidget.tsx`: card unificado para **todos** os tipos de pipeline (agent, sales, custom)
- Card do Agente IA com 3 seções: **Visão Geral** (atendidos vs transferidos), **Funil de Qualificação** (sem follow-ups), **Eficiência dos Follow-ups** (taxa de retorno por etapa)
- Pipelines de Vendas/Custom: visão geral (primeira etapa vs última), etapas do funil, follow-ups só aparecem se o pipeline tiver etapas com "follow" no nome
- Taxa de conversão entre etapas: verde ≥50%, laranja ≥25%, vermelho <25%
- Badges diferenciados por tipo: azul (Agente IA), verde (Vendas), laranja (Custom)
- Migration `030_deal_is_return.sql` necessária para eficiência de follow-ups (`is_return` boolean)
- Action `getFunnelStats` em `src/actions/deals.ts` — `agentOverview`, `agentCoreFunnel`, `followUpEfficiency` calculados para todos os tipos

### Chat — Telefone LID não exibido no Painel Lateral (corrigido 2026-05-13)

- Campo "Telefone" exibia o LID numérico (`36262509588574`, 14 dígitos) como se fosse número real
- Correção em `ChatWindow.tsx`: LID detectado por `phoneDigits >= 14` OU `phoneDigits === pnDigits` (phone igual ao phone_number da conversa)
- `phone_number` da conversa só é tratado como real se ≤ 13 dígitos e diferente do `lead.phone`
- Painel exibe "Aguardando número" + "ID WhatsApp" para contatos @lid

### Pipeline — Formulário de Lead Unificado (2026-05-13)

- `DealDetailPanel`: aba **Lead** agora exibe formulário completo (nome, email, telefone, empresa, cargo, status, responsável + campos customizados editáveis)
- Salva via `updateLead` + `upsertFieldValues` com feedback de sucesso/erro inline
- Campos pré-preenchidos com dados do lead vinculado ao deal
- Mesma experiência de edição nos 3 lugares: Conversas, Leads e Pipeline

### Leads — Busca por Telefone via Conversa (2026-05-13)

- Leads vindos via WhatsApp com @lid têm `lead.phone = null`; telefone real fica em `conversations.phone_number`
- `getLeads` agora inclui `conversations(phone_number)` no select
- `LeadsClient` busca tanto `lead.phone` quanto `conversations[0].phone_number` (dígitos) no useMemo
- Busca server-side (`getLeads`) também inclui `phone` no `ilike` do Supabase

### Baileys — preloadLidMap corrigido (2026-05-13)

- `preloadLidMap` estava carregando LIDs (14 dígitos) do banco como se fossem números reais após rollback
- Filtro ajustado: só mapeia `phone_number` com ≤ 13 dígitos (números brasileiros reais têm máx. 13; LIDs têm 14-15)
- Impede corrupção do mapa `pushName→phone` após ciclos de crash/reconexão

---

## Pendente / Backlog

- Botão de exclusão de lead na página `/leads` (já implementado — revisar se está visível no UI)
- Painel lateral no mobile (layout duas colunas some em telas pequenas)
- Menu "Conversas" não responsivo no mobile — única seção que não se adapta a telas pequenas
- Chat flutuante com IA integrado ao catálogo público (Plano Scale — não implementado)
- Integração Google Calendar para verticais de serviço (agendamento via catálogo)
