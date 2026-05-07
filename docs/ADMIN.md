# Painel Administrativo — EngenharIA

Documentação interna do painel de monitoramento da plataforma Z4P CRM.

---

## Acesso

- **URL**: `engenharia.app/admin`
- **Login**: e-mail `@engenharia.app` + senha cadastrada no Supabase Auth
- **Proteção**: dupla camada — middleware bloqueia não autenticados + server component verifica domínio do e-mail

---

## Abas do painel

### 1. Negócio
Visão de receita e crescimento da plataforma.

| Card | O que mede |
|---|---|
| Workspaces ativos | Total de workspaces cadastrados, com contagem de pagantes |
| Total de leads | Soma de todos os leads em todos os workspaces |
| MRR estimado | Receita mensal recorrente baseada nos planos ativos (R$) |
| Custo IA (mês) | Soma do custo de Claude + Whisper no mês atual, com margem estimada |

- **Gráfico de crescimento** — novos workspaces criados nos últimos 6 meses
- **Tabela de workspaces** — clique em uma linha para expandir e ver consumo detalhado: tokens Claude, minutos Whisper, mensagens WhatsApp, custo em USD e BRL

### 2. Infraestrutura
Visão de saúde técnica da plataforma.

- **Cards de serviço** com status (verde/laranja/vermelho), descrição, detalhe e link direto para o painel de cada serviço
- **Barras de capacidade** para serviços com limite mensurável:
  - Railway Hobby — mensagens processadas (30d) / 10.000
  - Supabase Free — usuários auth / 50.000
  - Anthropic Claude — custo IA do mês em BRL / R$200
- Cores: verde < 80%, laranja 80–95%, vermelho ≥ 95%
- **Tabela de conexões WhatsApp** por workspace (conectado / sem conversas)
- **Volume de mensagens** nos últimos 30 dias

### 3. Base de Conhecimento
Problemas comuns documentados com causas e soluções classificadas.

- 9 problemas documentados (cold start, Supabase pausado, WhatsApp desconectado, IA parada, áudio não transcrito, pagamento falhando, convite não chegou, queries lentas)
- Filtro por categoria e busca por texto
- Soluções classificadas em: **Gratuito**, **Requer upgrade**, **Configuração**
- Ordenação automática por prioridade (Alta → Média → Baixa)

---

## Tabela `usage_logs`

Registra cada evento de consumo da plataforma em tempo real.

```sql
usage_logs (
  id            uuid,
  workspace_id  uuid,        -- FK para workspaces
  event_type    text,        -- 'ai_tokens' | 'whisper_minutes' | 'whatsapp_message'
  input_tokens  integer,     -- tokens de entrada Claude (ai_tokens)
  output_tokens integer,     -- tokens de saída Claude (ai_tokens)
  audio_seconds integer,     -- segundos de áudio (whisper_minutes)
  message_direction text,    -- 'inbound' | 'outbound' (whatsapp_message)
  cost_usd      numeric,     -- custo calculado no momento do registro
  created_at    timestamptz
)
```

**Acesso**: apenas via `service_role` (RLS ativo). O painel admin usa `SUPABASE_SERVICE_ROLE_KEY`.

### Consultas úteis

```sql
-- Custo total do mês por workspace
select workspace_id, sum(cost_usd) as custo_usd
from usage_logs
where created_at >= date_trunc('month', now())
group by workspace_id
order by custo_usd desc;

-- Volume de tokens Claude por workspace no mês
select workspace_id,
  sum(input_tokens) as tokens_entrada,
  sum(output_tokens) as tokens_saida
from usage_logs
where event_type = 'ai_tokens'
  and created_at >= date_trunc('month', now())
group by workspace_id;

-- Minutos de áudio transcritos no mês
select workspace_id,
  round(sum(audio_seconds) / 60.0, 1) as minutos
from usage_logs
where event_type = 'whisper_minutes'
  and created_at >= date_trunc('month', now())
group by workspace_id;
```

---

## Tabela de preços (referência de custo)

| Serviço | Preço |
|---|---|
| Claude Haiku 4.5 — entrada | $0.0008 / 1.000 tokens |
| Claude Haiku 4.5 — saída | $0.004 / 1.000 tokens |
| OpenAI Whisper | $0.006 / minuto de áudio |
| Conversão USD → BRL | R$ 5,70 (fixo no código) |

> Para ajustar a taxa de câmbio: `src/components/admin/AdminDashboardClient.tsx`, função `fmtBrl`.

---

## MRR por plano

| Plano | USD/mês |
|---|---|
| Free | $0 |
| Starter | $9 |
| Pro | $27 |
| Scale | $55 |

> Para ajustar: `src/actions/admin.ts`, constante `PLAN_MRR_USD`.

---

## Limites de capacidade configurados

| Serviço | Plano atual | Limite monitorado | Alerta em |
|---|---|---|---|
| Vercel | Hobby (gratuito) | — | Ver painel externo |
| Railway | Hobby ($5/mês) | 10.000 msgs/30d | 70% |
| Supabase | Free | 50.000 usuários auth | 80% |
| Anthropic Claude | Pay-as-you-go | R$200/mês | 80% |
| Resend | Free (3.000/mês) | — | Ver painel externo |
| Stripe | — | Sem limite fixo | — |

> Para ajustar limites: `src/actions/admin.ts`, variáveis `RAILWAY_MSG_LIMIT`, `AI_LIMIT_BRL`.

---

## Cron de ping — manutenção automática

Rota `/api/cron/ping` agendada via `vercel.json` para rodar às 9h a cada 5 dias.

**Objetivo**: evitar que o Supabase Free pause o banco automaticamente após 7 dias sem atividade.

**Agendamento**: `0 9 */5 * *` (todo dia 1, 6, 11, 16, 21, 26, 31 do mês às 9h UTC)

**Autenticação**: header `Authorization: Bearer {CRON_SECRET}` — variável configurada na Vercel.

---

## Processamento de mídia WhatsApp

| Tipo | Processamento |
|---|---|
| Áudio | Transcrição via OpenAI Whisper → texto enviado ao agente |
| Imagem | Enviada como data URI ao Claude (visão multimodal) |
| Vídeo | Usa legenda/caption do WhatsApp como contexto |

Fluxo:
1. Baileys server baixa a mídia binária
2. Converte para base64 e inclui no payload do webhook
3. Webhook Vercel converte base64 → Buffer
4. Processa conforme o tipo e chama o agente

---

## Arquivos do painel admin

```
src/
  actions/admin.ts                     # lógica de agregação — negócio + infra
  app/admin/
    page.tsx                           # server component (guard + dados)
    login/page.tsx                     # página de login admin
  app/api/cron/ping/route.ts           # cron de ping para manter Supabase ativo
  components/admin/
    AdminDashboardClient.tsx           # UI com as 3 abas
    KnowledgeBaseTab.tsx               # base de conhecimento (problemas/soluções)
  lib/supabase/service.ts              # cliente Supabase com service role
supabase/migrations/
  018_usage_logs.sql                   # criação da tabela usage_logs
vercel.json                            # agendamento do cron
```

---

## Variáveis de ambiente necessárias

```bash
SUPABASE_SERVICE_ROLE_KEY=   # leitura dos usage_logs e dados admin
OPENAI_API_KEY=              # transcrição de áudio (Whisper)
ANTHROPIC_API_KEY=           # agente de qualificação de leads
CRON_SECRET=                 # autenticação do cron de ping
```
