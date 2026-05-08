# Painel Admin — Instância White-label

Painel de monitoramento de infraestrutura para cada instância de cliente.
Diferente do painel admin da Z4P (que tem visão de negócio/MRR), este foca
exclusivamente em saúde técnica e custos operacionais.

---

## Acesso

- Rota: `/admin`
- Restrito ao e-mail do administrador técnico (configurável via env var `ADMIN_EMAIL`)
- Senha própria via `ADMIN_PASSWORD` (não usa Supabase Auth)

---

## Seções do Painel

### 1. Visão Geral (cards no topo)
- Total de workspaces ativos
- Total de leads no sistema
- Total de mensagens processadas pelo agente
- Uptime do servidor Baileys (Railway)

### 2. Custos de IA — Barra de Progresso
Barra visual mostrando o consumo mensal de IA em relação a um limite configurável.

**Exemplo visual:**
```
Custo IA — Maio 2026
[████████░░░░░░░░░░░░] R$ 42 de R$ 100
Faltam R$ 58 para atingir o limite de alerta
```

- Limite configurável via env var `AI_COST_ALERT_BRL` (padrão: R$ 100)
- Barra muda de cor conforme proximidade:
  - Verde: 0–60% do limite
  - Amarelo: 60–85%
  - Vermelho: 85–100%
- Exibe também: custo do mês anterior para comparação
- Dados vêm da tabela `usage_logs` (já existe no banco)

### 3. Storage — Supabase
- Uso atual do banco (MB) com barra de progresso até 500MB
- Uso atual do storage (MB) com barra de progresso até 1GB
- Botão "Ver arquivos" abre painel do Supabase direto

### 4. Servidor Baileys (Railway)
- Status: Conectado / Desconectado
- Número WhatsApp conectado
- Última mensagem recebida (timestamp)
- Botão para reconectar / ver QR Code

### 5. Logs Recentes
- Últimas 20 chamadas ao agente IA (timestamp, workspace, tokens, custo)
- Filtro por workspace
- Erros recentes do webhook WhatsApp

---

## Variáveis de Ambiente Necessárias

```bash
ADMIN_EMAIL=admin@dominio-cliente.com.br
ADMIN_PASSWORD=senha-forte-aqui
AI_COST_ALERT_BRL=100
```

---

## Status de Implementação

- [ ] Criar rota `/admin` com autenticação por senha
- [ ] Card de visão geral
- [ ] Barra de progresso de custo IA (lendo `usage_logs`)
- [ ] Barra de storage Supabase
- [ ] Status do Baileys
- [ ] Logs recentes

> Implementar quando for montar a primeira instância white-label para um cliente.
> A estrutura de dados (`usage_logs`) já existe — é só construir a interface.
