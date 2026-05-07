# Painel Administrativo — EngenharIA

Documentação interna do painel de monitoramento da plataforma Z4P CRM.

---

## Acesso

- **URL**: `engenharia.app/admin`
- **Login**: e-mail `@engenharia.app` + senha cadastrada no Supabase Auth
- **Proteção**: dupla camada — middleware bloqueia não autenticados + server component verifica domínio do e-mail

---

## O que o painel mostra

### Cards de resumo (topo)
| Card | O que mede |
|---|---|
| Workspaces ativos | Total de workspaces cadastrados, com contagem de pagantes |
| Total de leads | Soma de todos os leads em todos os workspaces |
| MRR estimado | Receita mensal recorrente baseada nos planos ativos (R$) |
| Custo IA (mês) | Soma do custo de Claude + Whisper no mês atual, com margem estimada |

### Gráfico de crescimento
Novos workspaces criados nos últimos 6 meses. Barra verde = mês atual.

### Tabela de workspaces
Cada linha é um workspace. Clique na linha para expandir e ver o consumo detalhado do mês:
- **Tokens Claude** — input e output separados, custo em USD e BRL
- **Áudio Whisper** — minutos transcritos e custo
- **Mensagens WhatsApp** — volume no mês atual
- **Custo total** — soma IA + Whisper em USD e BRL

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

Valores aproximados em USD usados no cálculo do MRR:

| Plano | USD/mês |
|---|---|
| Free | $0 |
| Starter | $9 |
| Pro | $27 |
| Scale | $55 |

> Para ajustar: `src/actions/admin.ts`, constante `PLAN_MRR_USD`.

---

## Processamento de mídia WhatsApp

O agente de IA processa três tipos de mídia recebidos pelo WhatsApp:

| Tipo | Processamento |
|---|---|
| Áudio | Transcrição via OpenAI Whisper → texto enviado ao agente |
| Imagem | Enviada como data URI ao Claude (visão multimodal) |
| Vídeo | Usa legenda/caption do WhatsApp como contexto |

O fluxo é:
1. Baileys server baixa a mídia binária
2. Converte para base64 e inclui no payload do webhook
3. Webhook Vercel converte base64 → Buffer
4. Processa conforme o tipo e chama o agente

---

## Arquivos do painel admin

```
src/
  actions/admin.ts                     # lógica de agregação de dados
  app/admin/
    page.tsx                           # server component (guard + dados)
    login/page.tsx                     # página de login admin
  components/admin/
    AdminDashboardClient.tsx           # UI completa do painel
  lib/supabase/service.ts              # cliente Supabase com service role
supabase/migrations/
  018_usage_logs.sql                   # criação da tabela usage_logs
```

---

## Variáveis de ambiente necessárias

```bash
SUPABASE_SERVICE_ROLE_KEY=   # obrigatório para leitura dos usage_logs e dados admin
OPENAI_API_KEY=              # obrigatório para transcrição de áudio (Whisper)
```
