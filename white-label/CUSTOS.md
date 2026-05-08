# Custos — Z4P CRM (por instância)

Mapeamento de custos para a instância principal (Z4P / engenharia.app)
e para cada instância white-label implantada para um cliente.

---

## Resumo Rápido

> **Custo fixo mensal no início: R$ 0**
> O único custo real desde o dia 1 é a IA (Anthropic/OpenAI), que depende do volume de conversas.

---

## Serviços com Plano Gratuito

| Serviço | Uso | Limite gratuito | Custo |
|---|---|---|---|
| **Vercel** | Hospedagem do CRM | 100GB bandwidth, builds ilimitados | Grátis |
| **Supabase** | Banco de dados + Auth + Storage | 500MB banco, 1GB storage, 50k usuários | Grátis |
| **Resend** | E-mails transacionais (convites, boas-vindas) | 3.000 e-mails/mês, 100/dia | Grátis |
| **Railway** | Servidor Baileys (WhatsApp QR Code) | $5 de crédito/mês incluído | Grátis |

---

## Custos Variáveis (por uso)

| Serviço | O que cobra | Valor estimado |
|---|---|---|
| **Anthropic (Claude)** | Cada resposta do agente IA no WhatsApp | ~$0.003 por mensagem |
| **OpenAI (Whisper)** | Transcrição de áudios recebidos no WhatsApp | ~$0.006 por minuto de áudio |
| **Stripe** | Processamento de pagamentos dos planos | 4,99% + R$0,39 por transação |

### Estimativa de IA por volume de conversas

| Conversas/mês | Mensagens estimadas | Custo IA (aprox.) |
|---|---|---|
| 100 | ~500 mensagens | ~R$ 8/mês |
| 500 | ~2.500 mensagens | ~R$ 40/mês |
| 2.000 | ~10.000 mensagens | ~R$ 160/mês |

> Valores em dólar convertidos a R$5,00. Ajustar conforme câmbio atual.

---

## Quando os Planos Gratuitos Acabam

| Serviço | Gatilho | Próximo plano | Custo |
|---|---|---|---|
| **Supabase** | Banco > 500MB ou Storage > 1GB | Pro | $25/mês (~R$ 125) |
| **Vercel** | Uso comercial intenso ou analytics | Pro | $20/mês (~R$ 100) |
| **Resend** | > 3.000 e-mails/mês | Paid | $20/mês (~R$ 100) |
| **Railway** | > $5 de uso computacional/mês | Pay as you go | ~$5–20/mês |

---

## Custo por Instância White-label

Cada cliente implantado começa do zero nos planos gratuitos.
A estrutura de custos é idêntica à instância Z4P principal.

| Fase | Custo mensal estimado |
|---|---|
| **Início (poucos usuários)** | R$ 0 fixo + variável de IA |
| **Crescimento (centenas de leads)** | R$ 0–125 fixo + variável de IA |
| **Escala (milhares de leads)** | R$ 200–400 fixo + variável de IA |

---

## Observações

- **Stripe só cobra quando o cliente final paga** — sem movimento, sem custo
- **Railway pode ser compartilhado** entre instâncias se o volume for baixo (reduz custo por cliente)
- **Supabase Pro** vale a pena quando o banco crescer — adiciona backups diários e suporte
- **Domínio do cliente** não está listado acima — é responsabilidade do cliente (~R$ 40–80/ano)
