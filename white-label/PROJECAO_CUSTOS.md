# Projeção de Custos por Volume de Leads

Estimativa de custos mensais e acumulativos baseada na quantidade de leads
recebidos por mês. Usar como referência para precificar implantações white-label.

---

## Premissas do Cálculo

| Variável | Valor assumido |
|---|---|
| Mensagens por lead (conversa completa) | ~10 mensagens do agente IA |
| Tamanho médio de cada mensagem (tokens) | ~500 tokens entrada + 300 saída |
| Áudios recebidos por lead | ~1 áudio de 30s em média |
| Tamanho médio de registro no banco | ~5KB por lead (perfil + atividades) |
| Tamanho médio de mídia (fotos/áudios) | ~200KB por lead no storage |
| E-mails transacionais por mês | ~10% dos leads (convites de membros, etc.) |
| Câmbio USD → BRL | R$ 5,00 |

---

## Projeção Mensal por Faixa de Leads

### 50 leads/mês — Negócio pequeno iniciando

| Serviço | Consumo | Custo |
|---|---|---|
| Vercel | Mínimo | Grátis |
| Supabase banco | +0,25MB/mês | Grátis |
| Supabase storage | +10MB/mês | Grátis |
| Resend | ~5 e-mails/mês | Grátis |
| Railway (Baileys) | Mínimo | Grátis |
| Anthropic (IA) | ~500 mensagens | ~R$ 8 |
| OpenAI (Whisper) | ~25 min áudio | ~R$ 1 |
| **Total mensal** | | **~R$ 9/mês** |

---

### 200 leads/mês — Negócio em crescimento

| Serviço | Consumo | Custo |
|---|---|---|
| Vercel | Baixo | Grátis |
| Supabase banco | +1MB/mês | Grátis |
| Supabase storage | +40MB/mês | Grátis |
| Resend | ~20 e-mails/mês | Grátis |
| Railway (Baileys) | Baixo | Grátis |
| Anthropic (IA) | ~2.000 mensagens | ~R$ 30 |
| OpenAI (Whisper) | ~100 min áudio | ~R$ 3 |
| **Total mensal** | | **~R$ 33/mês** |

---

### 500 leads/mês — Negócio estabelecido

| Serviço | Consumo | Custo |
|---|---|---|
| Vercel | Moderado | Grátis |
| Supabase banco | +2,5MB/mês | Grátis |
| Supabase storage | +100MB/mês | Grátis |
| Resend | ~50 e-mails/mês | Grátis |
| Railway (Baileys) | Moderado | Grátis |
| Anthropic (IA) | ~5.000 mensagens | ~R$ 75 |
| OpenAI (Whisper) | ~250 min áudio | ~R$ 8 |
| **Total mensal** | | **~R$ 83/mês** |

---

### 1.000 leads/mês — Operação grande

| Serviço | Consumo | Custo |
|---|---|---|
| Vercel | Alto | Grátis (ou ~R$ 100 Pro) |
| Supabase banco | +5MB/mês | Grátis |
| Supabase storage | +200MB/mês | Grátis |
| Resend | ~100 e-mails/mês | Grátis |
| Railway (Baileys) | Alto | ~R$ 25 |
| Anthropic (IA) | ~10.000 mensagens | ~R$ 150 |
| OpenAI (Whisper) | ~500 min áudio | ~R$ 15 |
| **Total mensal** | | **~R$ 190/mês** |

---

## Projeção Acumulativa — Supabase (não zera)

O banco de dados cresce continuamente. Estimativa de quando atinge o limite gratuito (500MB):

| Leads/mês | Crescimento banco | Atinge 500MB em | Atinge 1GB storage em |
|---|---|---|---|
| 50 | ~0,25MB/mês | ~166 meses (13 anos) | ~4 anos |
| 200 | ~1MB/mês | ~41 meses (3,4 anos) | ~1 ano |
| 500 | ~2,5MB/mês | ~16 meses | ~5 meses |
| 1.000 | ~5MB/mês | ~8 meses | ~2,5 meses |

> **Atenção:** Para clientes com 500+ leads/mês, planejar upgrade do Supabase (~$25/mês)
> antes de atingir o limite para evitar interrupção do serviço.

---

## Custo Total Estimado por Ano (todos os serviços)

| Volume | Custo IA/mês | Outros fixos/mês | **Total/ano** |
|---|---|---|---|
| 50 leads/mês | R$ 9 | R$ 0 | **~R$ 108/ano** |
| 200 leads/mês | R$ 33 | R$ 0 | **~R$ 396/ano** |
| 500 leads/mês | R$ 83 | R$ 0–125* | **~R$ 996–2.496/ano** |
| 1.000 leads/mês | R$ 190 | R$ 125–225* | **~R$ 3.780–4.980/ano** |

*Inclui Supabase Pro ($25) e/ou Vercel Pro ($20) quando necessário.

---

## Recomendação de Precificação White-label

Sugerido cobrar do cliente uma taxa de implantação + mensalidade de manutenção
que cubra os custos de infraestrutura com margem:

| Porte do cliente | Custo infra/mês | Sugestão de mensalidade |
|---|---|---|
| Pequeno (até 200 leads) | ~R$ 33 | R$ 200–400/mês |
| Médio (até 500 leads) | ~R$ 83 | R$ 500–800/mês |
| Grande (até 1.000 leads) | ~R$ 190 | R$ 1.000–1.500/mês |

> Margem sugerida de 5x a 10x sobre o custo de infraestrutura para cobrir
> suporte, manutenção, atualizações e lucro.
