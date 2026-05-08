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

## Pendente / Backlog

- Botão de exclusão de lead na página `/leads` (já implementado — revisar se está visível no UI)
- Painel lateral no mobile (layout duas colunas some em telas pequenas)
- Menu "Conversas" não responsivo no mobile — única seção que não se adapta a telas pequenas
