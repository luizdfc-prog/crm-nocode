# PipeFlow CRM — Plano de Implementação

> Roadmap técnico por milestones. Cada aula = uma unidade entregável e commitável.

---

## Status Geral

| Milestone | Status |
|---|---|
| M0 — Fundação do Projeto | ✅ Concluído |
| M1 — Landing Page | ✅ Concluído |
| M2 — Supabase Core | 🔄 Em andamento |
| M3 — Autenticação | ⬜ Pendente |
| M4 — Leads & Contatos | ⬜ Pendente |
| M5 — Pipeline Kanban | ⬜ Pendente |
| M6 — Atividades & Timeline | ⬜ Pendente |
| M7 — Dashboard de Métricas | ⬜ Pendente |
| M8 — Multi-empresa & Convites | ⬜ Pendente |
| M9 — Stripe & Monetização | ⬜ Pendente |
| M10 — Polimento & Deploy | ⬜ Pendente |

---

## M0 — Fundação do Projeto ✅

- [x] Next.js 14 com App Router + TypeScript strict
- [x] Tailwind CSS + shadcn/ui configurados
- [x] Paleta de cores customizada (CSS variables em `globals.css`)
- [x] Fontes: Syne, DM Sans, IBM Plex Mono
- [x] ESLint configurado
- [x] Estrutura de pastas conforme CLAUDE.md

---

## M1 — Landing Page ✅

- [x] Hero section com headline e CTA
- [x] Seção de funcionalidades
- [x] Seção de planos/preços (Free vs Pro)
- [x] CTA final
- [x] Layout responsivo e on-brand

---

## M2 — Supabase Core 🔄

> Branch: `feat/supabase-core`

### Aula 3.1 — Setup Supabase & Chaves ← VOCÊ ESTÁ AQUI

- [ ] Instalar `@supabase/supabase-js` e `@supabase/ssr`
- [ ] Criar `src/lib/supabase/client.ts` — `createBrowserClient`
- [ ] Criar `src/lib/supabase/server.ts` — `createServerClient` (cookies)
- [ ] Criar `src/types/env.d.ts` — tipagem de `process.env`
- [ ] Configurar `.env.local` com as variáveis do Supabase
- [ ] Validar conexão com um health-check simples

### Aula 3.2 — Schema & Migrations

- [ ] Criar migration: tabela `workspaces`
- [ ] Criar migration: tabela `profiles` (extensão de `auth.users`)
- [ ] Criar migration: tabela `workspace_members` (N:N)
- [ ] Criar migration: tabela `leads`
- [ ] Criar migration: tabela `deals`
- [ ] Criar migration: tabela `activities`
- [ ] RLS ativo em todas as tabelas
- [ ] Gerar tipos TypeScript: `src/types/database.ts`

### Aula 3.3 — Row Level Security (RLS)

- [ ] Políticas RLS para `workspaces`
- [ ] Políticas RLS para `workspace_members`
- [ ] Políticas RLS para `leads` (isolamento por `workspace_id`)
- [ ] Políticas RLS para `deals`
- [ ] Políticas RLS para `activities`
- [ ] Testar isolamento entre workspaces diferentes

---

## M3 — Autenticação

> Branch: `feat/auth`

- [ ] Página `/login` — form com Supabase Auth
- [ ] Página `/signup` — cadastro + criação de workspace inicial
- [ ] `middleware.ts` — proteção das rotas `(dashboard)`
- [ ] Redirecionamento pós-login para `/dashboard`
- [ ] Logout no header/sidebar
- [ ] Página `/invite/[token]` — aceitar convite de workspace

---

## M4 — Leads & Contatos

> Branch: `feat/leads`

- [ ] Listagem `/leads` com busca e filtros (status, responsável, data)
- [ ] `LeadCard` component
- [ ] Formulário de criação/edição de lead (`LeadForm`)
- [ ] Página de detalhe `/leads/[id]`
- [ ] API Route `POST /api/leads` com validação Zod
- [ ] API Route `PATCH /api/leads/[id]`
- [ ] API Route `DELETE /api/leads/[id]`
- [ ] Hook `useLeads`
- [ ] Verificar limite de 50 leads no plano Free

---

## M5 — Pipeline Kanban

> Branch: `feat/pipeline`

- [ ] Layout Kanban com colunas por etapa
- [ ] `KanbanBoard`, `KanbanColumn`, `DealCard` components
- [ ] Drag-and-drop com `@dnd-kit`
- [ ] Persistência da posição no banco ao soltar card
- [ ] Formulário de criação de deal vinculado a lead
- [ ] API Route `PATCH /api/deals/[id]/stage`
- [ ] Hook `usePipeline`

---

## M6 — Atividades & Timeline

> Branch: `feat/activities`

- [ ] `LeadTimeline` component na página de detalhe
- [ ] Formulário de registro de atividade (ligação, e-mail, reunião, nota)
- [ ] Página `/activities` — timeline geral do workspace
- [ ] API Route `POST /api/activities`
- [ ] Hook `useActivities`

---

## M7 — Dashboard de Métricas

> Branch: `feat/dashboard`  
> *(UI parcialmente implementada — conectar com dados reais)*

- [ ] `MetricCard` com dados reais do Supabase
- [ ] `FunnelChart` (Recharts) com dados do pipeline
- [ ] `DealsList` — negócios com prazo próximo do usuário logado
- [ ] Queries otimizadas (aggregation no banco, não no client)

---

## M8 — Multi-empresa & Convites

> Branch: `feat/workspace`

- [ ] `WorkspaceSwitcher` no sidebar
- [ ] Criar novo workspace
- [ ] `InviteModal` — convidar colaborador por e-mail
- [ ] API Route `POST /api/invites` — gera token + envia e-mail (Resend)
- [ ] API Route `GET /api/invites/[token]` — valida convite
- [ ] Página `/invite/[token]` — aceitar e ingressar no workspace
- [ ] Verificar limite de 2 colaboradores no plano Free

---

## M9 — Stripe & Monetização

> Branch: `feat/stripe`

- [ ] Página `/settings` — plano atual + botão de upgrade
- [ ] Checkout Session para Plano Pro (R$49/mês)
- [ ] Webhook `POST /api/webhooks/stripe` — ativar/desativar plano
- [ ] Customer Portal do Stripe para gerenciar assinatura
- [ ] Atualizar `workspaces.plan` via webhook

---

## M10 — Polimento & Deploy

> Branch: `feat/polish` → merge em `main`

- [ ] Loading states e Skeletons nas listagens
- [ ] Error boundaries e páginas de erro (`error.tsx`, `not-found.tsx`)
- [ ] Toasts de feedback (shadcn/ui Sonner)
- [ ] SEO: `metadata` nas páginas públicas
- [ ] Variáveis de ambiente configuradas na Vercel
- [ ] Deploy em produção + domínio
- [ ] Smoke tests pós-deploy

---

## Convenções de Branch

```
feat/<milestone>   → nova funcionalidade
fix/<descricao>    → correção de bug
chore/<descricao>  → infra, deps, config
```

Cada milestone é mergeado em `main` via PR após revisão.
