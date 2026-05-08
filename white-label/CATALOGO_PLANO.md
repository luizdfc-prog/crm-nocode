# Catálogo + Chat Flutuante — Plano Topo de Linha

Documentação da visão do produto para o plano mais completo do Z4P.
**Status: Planejado — não implementado.**

---

## Visão Geral

O plano topo de linha integra três produtos em um:
1. **CRM** — pipeline, leads, atividades
2. **Agente IA** — atendimento 24h, qualificação, follow-up
3. **Catálogo público** — vitrine de produtos/serviços com chat flutuante

Tudo conectado em tempo real, sem intervenção humana até o momento certo.

---

## Fluxo Completo do Lead

```
Cliente acessa o catálogo público
        ↓
Vê produtos/serviços → abre chat flutuante
        ↓
Agente IA inicia atendimento no chat (24h)
        ↓
Agente coleta nome + WhatsApp de forma natural
        ↓
Lead criado automaticamente no CRM
Lead entra no pipeline do Agente IA
        ↓
Conversa continua no chat do catálogo
        ↓
Se necessário (confirmação, follow-up, lead sumiu):
→ Agente migra conversa para WhatsApp
        ↓
Agente continua qualificando via WhatsApp
Atualiza etapas do pipeline em tempo real
        ↓
Lead qualificado → [TRANSFERIR_PARA_VENDEDOR]
Vendedor humano assume a conversa
```

---

## Estrutura de URLs (estilo e-commerce)

```
/catalogo/[slug]                  ← home — grade de todos os produtos/serviços
/catalogo/[slug]/[produto-slug]   ← página individual do produto/serviço
```

**Exemplo:**
```
engenharia.app/catalogo/clinica-beleza
engenharia.app/catalogo/clinica-beleza/limpeza-de-pele
engenharia.app/catalogo/clinica-beleza/botox
```

### Como o cliente usa nas campanhas
- **Campanha geral** → link da home do catálogo
- **Campanha de produto específico** → link direto da página do produto
- O agente IA abre já sabendo qual produto o cliente estava vendo
- UTM capturado automaticamente da URL

### Página Home do Catálogo
- Grade de produtos/serviços com foto, nome e preço
- Filtro por categoria
- Chat flutuante no canto inferior direito

### Página Individual do Produto/Serviço
- Galeria de fotos
- Descrição completa
- Preço
- Botão **"Falar sobre este produto"** — abre o chat flutuante já contextualizado (não há carrinho nem checkout)
- Chat flutuante já contextualizado com aquele produto específico
- Link próprio para campanhas diretas

> **Importante:** não há carrinho, pagamento ou checkout no catálogo.
> A conversão acontece inteiramente via conversa — agente IA conduz,
> qualifica e transfere para um vendedor humano que fecha a venda pelo WhatsApp.

---

## Configurações do Catálogo (aba nas Settings)

A aba "Catálogo" aparece apenas nos planos que incluem este recurso.
Ao tentar acessar em planos inferiores → exibe tela de upgrade.

### O que o admin configura:
- **URL pública** do catálogo (`z4p.app/catalogo/[slug]` ou domínio próprio)
- **Tipo:** Produtos (e-commerce leve) ou Serviços (com agendamento)
- **Logo e cores** da vitrine
- **Produtos/Serviços:** nome, descrição, preço, fotos, categoria
- **Chat flutuante:** ativar/desativar, mensagem de abertura
- **Pixels e rastreamento:** Meta Pixel, Google Tag Manager, GA4, TikTok Pixel
- **UTM:** captura automática de parâmetros de campanha

---

## Estrutura de Planos (valores a definir)

| Plano | Inclui | Preço |
|---|---|---|
| Free | CRM básico, 2 membros, 50 leads | Grátis |
| Starter | CRM completo | A definir |
| Pro | CRM + Agente IA + WhatsApp | A definir |
| **Scale** | CRM + Agente IA + WhatsApp + **Catálogo + Chat flutuante** | A definir |

> Valores serão definidos antes da implementação.

---

## Chat Flutuante — Comportamento

- Presente em **todas as páginas** do catálogo (home + cada produto/serviço)
- Fixo no canto inferior direito, sempre visível
- **Histórico preservado** durante toda a navegação — a conversa não reinicia ao trocar de página
- O agente se adapta ao contexto da página atual:
  - **Na home** → conversa geral, pergunta o que o cliente procura
  - **Na página de produto** → já sabe qual produto é, contextualiza a conversa em torno daquele item
- Lead pode navegar livremente entre produtos sem perder o fio da conversa

---

## Comportamento do Agente no Catálogo

- Conhece o contexto do produto/serviço que o cliente está vendo
- Inicia conversa de forma natural (não parece formulário)
- Coleta nome + WhatsApp antes de encerrar
- Cria lead no CRM automaticamente
- Move etapas do pipeline conforme a conversa evolui
- Migra para WhatsApp quando necessário:
  - Confirmação de agendamento
  - Lead sumiu do chat → follow-up via WhatsApp
  - Cliente pede para continuar pelo WhatsApp
  - Vendedor quer assumir o atendimento
- Muitos atendimentos se resolvem 100% no chat sem precisar do WhatsApp

---

## Tarefas de Implementação (futuro)

- [ ] Tabela `products` no banco (nome, descrição, preço, fotos, categoria, duração)
- [ ] Página pública `/catalogo/[slug]` — mobile-first
- [ ] Chat flutuante com agente IA embutido
- [ ] Integração agente chat → CRM (criar lead, mover pipeline)
- [ ] Migração chat → WhatsApp quando necessário
- [ ] Aba "Catálogo" nas Settings (bloqueada por plano)
- [ ] Tela de upgrade ao tentar acessar sem o plano correto
- [ ] Configuração de pixels e UTM pelo painel
- [ ] Novo plano "Scale" no Stripe com price ID
- [ ] Lógica de desbloqueio de features por plano

---

## Notas

- O agente do catálogo usa o mesmo motor do agente WhatsApp (Claude Haiku)
- O contexto do produto é injetado no system prompt em tempo real
- A migração chat → WhatsApp acontece de forma transparente para o lead
- O vendedor humano vê toda a conversa (chat + WhatsApp) no CRM
