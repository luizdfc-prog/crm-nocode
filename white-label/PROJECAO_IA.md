# Projeção de Custos — Agente IA

Cálculo baseado nos modelos reais usados no sistema:
- **Agente de texto:** Claude Haiku 4.5 (Anthropic)
- **Transcrição de áudio:** Whisper-1 (OpenAI)

---

## Tabela de Preços dos Modelos

| Modelo | Tipo | Preço |
|---|---|---|
| Claude Haiku 4.5 | Input (tokens enviados) | $0.80 / 1M tokens |
| Claude Haiku 4.5 | Output (tokens gerados) | $4.00 / 1M tokens |
| Whisper-1 | Transcrição de áudio | $0.006 / minuto |

> Claude Haiku é o modelo mais econômico da Anthropic — foi escolhido justamente para manter o custo baixo.

---

## Como funciona por mensagem

Cada vez que um lead manda uma mensagem, o sistema:
1. Envia o **histórico completo da conversa + system prompt** para o Claude (input)
2. Recebe a resposta do agente (output)
3. Se for áudio, transcreve com Whisper antes de enviar ao Claude

### Estimativa por mensagem trocada

| Elemento | Tokens / Duração | Custo |
|---|---|---|
| System prompt (instruções do agente) | ~800 tokens | fixo por chamada |
| Histórico da conversa (cresce com o tempo) | ~200–1.500 tokens | cresce por mensagem |
| Mensagem do lead | ~50–100 tokens | variável |
| Resposta do agente (output) | ~100–300 tokens | variável |
| **Média por chamada ao Claude** | ~1.500 input / 200 output | **~$0.0009** (~R$ 0,0045) |

---

## Projeção por 1.000 Leads

### Premissas
- Média de **8 trocas de mensagem** por conversa até qualificar ou encerrar
- **30% dos leads** mandam pelo menos 1 áudio (duração média: 20 segundos)
- Câmbio: R$ 5,00 por dólar

### Cálculo

| Item | Volume | Custo USD | Custo BRL |
|---|---|---|---|
| Chamadas ao Claude (1.000 leads × 8 mensagens) | 8.000 chamadas | $7.20 | ~R$ 36 |
| Transcrição Whisper (300 áudios × 20s = 100 min) | 100 minutos | $0.60 | ~R$ 3 |
| **Total por 1.000 leads** | | **~$7.80** | **~R$ 39** |

> **Custo médio por lead: ~R$ 0,039** (menos de 4 centavos)

---

## Projeção por Volume Mensal

| Leads/mês | Chamadas IA | Áudios | Custo IA/mês | Custo Whisper/mês | **Total/mês** |
|---|---|---|---|---|---|
| 50 | 400 | 15 | ~R$ 1,80 | ~R$ 0,15 | **~R$ 2** |
| 200 | 1.600 | 60 | ~R$ 7,20 | ~R$ 0,60 | **~R$ 8** |
| 500 | 4.000 | 150 | ~R$ 18,00 | ~R$ 1,50 | **~R$ 20** |
| 1.000 | 8.000 | 300 | ~R$ 36,00 | ~R$ 3,00 | **~R$ 39** |
| 2.000 | 16.000 | 600 | ~R$ 72,00 | ~R$ 6,00 | **~R$ 78** |
| 5.000 | 40.000 | 1.500 | ~R$ 180,00 | ~R$ 15,00 | **~R$ 195** |

---

## Fator de Variação

O custo real pode ser **maior ou menor** dependendo de:

| Fator | Impacto no custo |
|---|---|
| Conversa longa (lead engajado, muitas mensagens) | Aumenta — histórico maior = mais tokens |
| Prompt do agente muito detalhado | Aumenta — mais tokens de input por chamada |
| Lead que responde 1-2 mensagens e some | Diminui — poucas chamadas |
| Muitos áudios longos (>1 min) | Aumenta o Whisper |
| Base de conhecimento extensa nas configurações | Aumenta — adicionada ao system prompt |

---

## Comparativo com Concorrentes

| Solução | Custo por 1.000 leads atendidos |
|---|---|
| **Z4P com Claude Haiku** | **~R$ 39** |
| GPT-4o mini (OpenAI) | ~R$ 50 |
| GPT-4o (OpenAI) | ~R$ 400+ |
| Plataformas prontas (Manychat, etc.) | R$ 150–500/mês fixo |

> Claude Haiku foi a escolha certa — entrega qualidade suficiente para atendimento de vendas
> com o menor custo por token do mercado.

---

## Alertas Recomendados (por instância white-label)

Configurar no painel da Anthropic (console.anthropic.com):

| Gatilho | Ação sugerida |
|---|---|
| Gasto > $10/mês | Notificação por e-mail — revisar volume |
| Gasto > $30/mês | Revisar se prompt está muito longo |
| Gasto > $50/mês | Avaliar upgrade de plano com o cliente |
