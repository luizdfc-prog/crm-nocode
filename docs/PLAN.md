# PipeFlow CRM — Plano de Execução

> Estratégia: **Interface primeiro, backend depois.**
> Cada milestone entrega algo visível e testável antes de conectar dados reais.
> PRD completo em [`docs/PRD.md`](PRD.md).

---

## Visão Geral dos Milestones

| # | Milestone | Branch | Foco |
|---|---|---|---|
| M0 | Setup & Scaffolding | `main` | Projeto, tema, estrutura |
| M1 | Landing Page | `feat/landing-page` | UI pública |
| M2 | Auth UI | `feat/auth-ui` | Telas de login/signup |
| M3 | Dashboard Shell | `feat/dashboard-shell` | Navegação e layout do app |
| M4 | Leads UI | `feat/leads-ui` | Listagem e detalhe de leads |
| M5 | Pipeline Kanban UI | `feat/pipeline-ui` | Kanban drag-and-drop visual |
| M6 | Dashboard Métricas UI | `feat/dashboard-ui` | Cards e gráfico de funil |
| M7 | Auth Backend | `feat/auth-backend` | Supabase Auth + DB schema base |
| M8 | Leads & Atividades Backend | `feat/leads-backend` | CRUD de leads e atividades |
| M9 | Pipeline Backend | `feat/pipeline-backend` | CRUD de deals + persistência DnD |
| M10 | Multi-workspace & Convites | `feat/multi-workspace` | Workspaces, membros, e-mail |
| M11 | Stripe & Monetização | `feat/stripe` | Checkout, webhook, limites |
| M12 | Deploy & Produção | `feat/deploy` | Vercel + Supabase produção |

---

## M0 — Setup & Scaffolding

**Branch:** `main`
**Objetivo:** Projeto Next.js configurado, tema visual aplicado, estrutura de pastas criada e primeiro commit no GitHub.

### Entregas

- [x] Criar projeto: `npx create-next-app@latest pipeflow-crm --typescript --tailwind --app --src-dir --import-alias "@/*"`
- [x] Instalar dependências base: `shadcn/ui`, `@dnd-kit/core`, `@dnd-kit/sortable`, `recharts`, `zod`, `@supabase/supabase-js`, `@supabase/ssr`
- [x] Configurar `tsconfig.json` com `strict: true` e path alias `@/`
- [x] Configurar tema shadcn/ui com a paleta PipeFlow (`globals.css` — CSS variables)
- [x] Adicionar fontes Google: Syne, DM Sans, IBM Plex Mono (`layout.tsx`)
- [x] Criar estrutura completa de pastas conforme `CLAUDE.md`
- [x] Criar `src/types/index.ts` com interfaces: `Lead`, `Deal`, `Activity`, `Workspace`, `Member`
- [x] Criar `src/types/env.d.ts` com tipagem de todas as variáveis de ambiente
- [x] Criar `.env.local` a partir do template do `CLAUDE.md`
- [x] Criar `.env.example` para documentação
- [x] Criar `.gitignore` adequado (incluindo `.env.local`)
- [x] Inicializar repositório Git e fazer push para GitHub

**Commit final:** `chore: setup inicial — Next.js 14, TypeScript, Tailwind, shadcn/ui, estrutura de pastas e tema PipeFlow`

---

## M1 — Landing Page

**Branch:** `feat/landing-page`
**Objetivo:** Página pública de apresentação do PipeFlow CRM, responsiva e fiel à identidade visual.

### Entregas

- [ ] `app/page.tsx` — root da landing page
- [ ] Componente `Navbar` — logo + link "Entrar" + botão "Começar grátis"
- [ ] Seção `Hero` — headline, subheadline, CTA principal e screenshot/mockup do app
- [ ] Seção `Features` — 4-6 cards com funcionalidades principais (Kanban, Multi-empresa, Métricas, Segurança)
- [ ] Seção `Pricing` — cards Free e Pro com lista de benefícios e CTA
- [ ] Seção `CTA Final` — chamada para ação antes do footer
- [ ] Componente `Footer` — logo, links, copyright
- [ ] Responsividade completa (mobile-first)
- [ ] Animações de entrada sutis (Tailwind `animate-`)

**Commit final:** `feat: landing page completa — hero, features, pricing e CTA`

---

## M2 — Auth UI

**Branch:** `feat/auth-ui`
**Objetivo:** Telas de login, cadastro e aceite de convite — layout e formulários sem backend real.

### Entregas

- [ ] `app/(auth)/layout.tsx` — layout centralizado para páginas de auth
- [ ] `app/(auth)/login/page.tsx` — formulário email + senha + link para signup
- [ ] `app/(auth)/signup/page.tsx` — formulário nome + email + senha + confirmação
- [ ] `app/(auth)/invite/[token]/page.tsx` — tela de aceite de convite com preview do workspace
- [ ] Componente `AuthCard` — wrapper visual dos formulários (logo, título, card)
- [ ] Validação de formulário client-side com Zod (sem submit real)
- [ ] Estados de loading e erro nos formulários
- [ ] Link de retorno entre login e signup

**Commit final:** `feat: auth UI — telas de login, signup e convite com validação`

---

## M3 — Dashboard Shell

**Branch:** `feat/dashboard-shell`
**Objetivo:** Estrutura completa do app autenticado — sidebar, header e todas as páginas como shells navegáveis.

### Entregas

- [ ] `app/(dashboard)/layout.tsx` — layout principal com sidebar + área de conteúdo
- [ ] Componente `Sidebar` — logo, navegação (Dashboard, Leads, Pipeline, Atividades, Configurações), avatar do usuário
- [ ] Componente `Header` — título da página atual + `WorkspaceSwitcher` (mock)
- [ ] Componente `WorkspaceSwitcher` — dropdown com workspaces mockados + "Criar novo"
- [ ] `app/(dashboard)/page.tsx` — shell do dashboard (placeholder)
- [ ] `app/(dashboard)/leads/page.tsx` — shell de leads (placeholder)
- [ ] `app/(dashboard)/leads/[id]/page.tsx` — shell de detalhe do lead (placeholder)
- [ ] `app/(dashboard)/pipeline/page.tsx` — shell do pipeline (placeholder)
- [ ] `app/(dashboard)/activities/page.tsx` — shell de atividades (placeholder)
- [ ] `app/(dashboard)/settings/page.tsx` — shell de configurações (placeholder)
- [ ] Navegação ativa destacada na sidebar (baseada em `usePathname`)
- [ ] Layout responsivo: sidebar colapsável em mobile

**Commit final:** `feat: dashboard shell — sidebar, header, workspace switcher e rotas do app`

---

## M4 — Leads UI

**Branch:** `feat/leads-ui`
**Objetivo:** Telas de leads completas com dados mockados — listagem, busca, formulário e detalhe com timeline.

### Entregas

- [ ] `MOCK_LEADS` — array de leads fictícios em `src/utils/mock-data.ts`
- [ ] `app/(dashboard)/leads/page.tsx` — listagem com busca e filtros
- [ ] Componente `LeadCard` — card de lead com nome, empresa, status e responsável
- [ ] Componente `LeadStatusBadge` — badge colorido por status (Novo, Contato, Proposta, Negociação, Ganho, Perdido)
- [ ] Componente `LeadSearchBar` — input de busca com ícone
- [ ] Componente `LeadFilters` — dropdowns de filtro por status e responsável
- [ ] Componente `LeadForm` — formulário completo em Sheet/Modal (nome, e-mail, telefone, empresa, cargo, status, responsável)
- [ ] Botão "Novo Lead" que abre `LeadForm`
- [ ] `app/(dashboard)/leads/[id]/page.tsx` — página de detalhe do lead
- [ ] Componente `LeadProfile` — dados completos do lead em sidebar lateral
- [ ] Componente `ActivityTimeline` — timeline cronológica com ícones por tipo (ligação, e-mail, reunião, nota)
- [ ] Componente `ActivityForm` — formulário inline para registrar nova atividade
- [ ] Estado local (useState) simulando criação e edição

**Commit final:** `feat: leads UI — listagem, filtros, formulário de lead e detalhe com timeline`

---

## M5 — Pipeline Kanban UI

**Branch:** `feat/pipeline-ui`
**Objetivo:** Kanban visual com drag-and-drop funcional usando dados mockados.

### Entregas

- [ ] `MOCK_DEALS` — deals fictícios distribuídos entre colunas em `src/utils/mock-data.ts`
- [ ] `app/(dashboard)/pipeline/page.tsx` — página do kanban
- [ ] Componente `KanbanBoard` — container das colunas com scroll horizontal
- [ ] Componente `KanbanColumn` — coluna com título da etapa, contador e total R$ dos deals
- [ ] Componente `DealCard` — card com título, valor (R$), lead vinculado, responsável e prazo
- [ ] Componente `DealForm` — formulário em Sheet para criar/editar deal (título, valor, lead, responsável, prazo)
- [ ] Integração `@dnd-kit` — drag-and-drop entre colunas com reordenação visual
- [ ] Estado local gerenciando posição dos cards entre colunas
- [ ] Botão "Novo Deal" por coluna
- [ ] Indicador visual de coluna ativa durante o drag
- [ ] Etapas: Novo Lead · Contato Realizado · Proposta Enviada · Negociação · Fechado Ganho · Fechado Perdido

**Commit final:** `feat: pipeline kanban UI — drag-and-drop entre etapas com @dnd-kit e dados mockados`

---

## M6 — Dashboard Métricas UI

**Branch:** `feat/dashboard-ui`
**Objetivo:** Dashboard com cards de métricas e gráfico de funil usando dados mockados.

### Entregas

- [ ] `app/(dashboard)/page.tsx` — dashboard completo
- [ ] Componente `MetricCard` — card reutilizável (título, valor, variação %, ícone)
- [ ] 4 cards: Total de Leads · Negócios Abertos · Valor do Pipeline (R$) · Taxa de Conversão
- [ ] Componente `FunnelChart` — gráfico de funil com Recharts (leads por etapa)
- [ ] Componente `UpcomingDeals` — lista de deals com prazo próximo (próximos 7 dias)
- [ ] Componente `RecentActivity` — últimas atividades registradas
- [ ] Dados calculados a partir de `MOCK_LEADS` e `MOCK_DEALS`
- [ ] Layout responsivo em grid

**Commit final:** `feat: dashboard UI — métricas, gráfico de funil e deals com prazo próximo`

---

## M7 — Auth Backend

**Branch:** `feat/auth-backend`
**Objetivo:** Supabase conectado, schema base criado, autenticação real funcionando com proteção de rotas.

### Entregas

- [ ] Configurar projeto Supabase e preencher `.env.local`
- [ ] `src/lib/supabase/client.ts` — `createBrowserClient`
- [ ] `src/lib/supabase/server.ts` — `createServerClient` com cookies Next.js
- [ ] `src/middleware.ts` — proteção de rotas: redirecionar não-autenticados para `/login`
- [ ] Migration SQL: tabela `profiles` (id, name, email, avatar_url, created_at)
- [ ] Migration SQL: tabela `workspaces` (id, name, plan, stripe_customer_id, stripe_subscription_id, created_at)
- [ ] Migration SQL: tabela `workspace_members` (id, workspace_id, profile_id, role, created_at)
- [ ] RLS em `profiles` — usuário só lê/edita o próprio perfil
- [ ] RLS em `workspaces` — acesso apenas para membros do workspace
- [ ] RLS em `workspace_members` — acesso apenas dentro do workspace
- [ ] Trigger SQL: criar `profile` automaticamente ao cadastrar novo usuário (Auth hook)
- [ ] `app/(auth)/login/page.tsx` — conectar formulário ao Supabase Auth
- [ ] `app/(auth)/signup/page.tsx` — conectar formulário ao Supabase Auth
- [ ] Logout funcional (botão na sidebar)
- [ ] `WorkspaceSwitcher` carregando workspaces reais do banco
- [ ] Fluxo de criação de primeiro workspace no onboarding pós-signup
- [ ] Gerar tipos TypeScript do banco: `src/types/database.ts`

**Commit final:** `feat: auth backend — Supabase Auth, schema base, RLS e rotas protegidas`

---

## M8 — Leads & Atividades Backend

**Branch:** `feat/leads-backend`
**Objetivo:** CRUD real de leads e atividades conectado ao Supabase, substituindo dados mockados.

### Entregas

- [ ] Migration SQL: tabela `leads` (id, workspace_id, name, email, phone, company, role, status, owner_id, created_at)
- [ ] Migration SQL: tabela `activities` (id, workspace_id, lead_id, type, description, author_id, activity_date, created_at)
- [ ] RLS em `leads` — isolamento por `workspace_id`
- [ ] RLS em `activities` — isolamento por `workspace_id`
- [ ] `app/api/leads/route.ts` — GET (listagem com filtros) e POST (criar lead)
- [ ] `app/api/leads/[id]/route.ts` — GET (detalhe), PATCH (editar), DELETE (remover)
- [ ] `app/api/activities/route.ts` — POST (criar atividade)
- [ ] `app/api/activities/[id]/route.ts` — DELETE (remover atividade)
- [ ] Validação Zod em todas as rotas
- [ ] `hooks/useLeads.ts` — hook de listagem com busca e filtros
- [ ] `hooks/useLead.ts` — hook de detalhe do lead + atividades
- [ ] Substituir `MOCK_LEADS` por dados reais nas páginas de leads
- [ ] Verificação de limite do plano Free (máx. 50 leads) antes de criar

**Commit final:** `feat: leads backend — CRUD real de leads e atividades com RLS e validação Zod`

---

## M9 — Pipeline Backend

**Branch:** `feat/pipeline-backend`
**Objetivo:** CRUD real de deals e persistência do drag-and-drop no Supabase.

### Entregas

- [ ] Migration SQL: tabela `deals` (id, workspace_id, title, value, stage, lead_id, owner_id, due_date, position, created_at)
- [ ] RLS em `deals` — isolamento por `workspace_id`
- [ ] `app/api/deals/route.ts` — GET (por stage) e POST (criar deal)
- [ ] `app/api/deals/[id]/route.ts` — GET, PATCH (editar + mover de stage), DELETE
- [ ] Validação Zod em todas as rotas
- [ ] `hooks/useDeals.ts` — hook de deals agrupados por stage
- [ ] Persistir mudança de stage ao soltar card no kanban (chamada PATCH)
- [ ] Persistir reordenação dentro da coluna (campo `position`)
- [ ] Substituir `MOCK_DEALS` por dados reais no kanban
- [ ] Substituir dados de funil mockados no `FunnelChart` por dados reais
- [ ] Substituir `UpcomingDeals` por dados reais

**Commit final:** `feat: pipeline backend — CRUD de deals, persistência de stage e posição no kanban`

---

## M10 — Multi-workspace & Convites

**Branch:** `feat/multi-workspace`
**Objetivo:** Fluxo completo de workspaces — criação, convite por e-mail, aceite e troca entre workspaces.

### Entregas

- [ ] Migration SQL: tabela `invites` (id, workspace_id, email, role, token, expires_at, accepted_at)
- [ ] RLS em `invites` — admin do workspace pode criar, qualquer pessoa pode ler pelo token
- [ ] `src/lib/resend/templates/InviteEmail.tsx` — template de e-mail de convite (React Email)
- [ ] `src/lib/resend/templates/WelcomeEmail.tsx` — e-mail de boas-vindas ao aceitar convite
- [ ] `app/api/invites/route.ts` — POST: criar convite + enviar e-mail via Resend
- [ ] `app/api/invites/[token]/route.ts` — GET: validar token · POST: aceitar convite
- [ ] `app/(auth)/invite/[token]/page.tsx` — conectar ao backend real
- [ ] `app/(dashboard)/settings/page.tsx` — página de configurações completa:
  - [ ] Aba "Workspace" — editar nome do workspace
  - [ ] Aba "Membros" — listar membros, alterar papéis, remover, convidar novos
  - [ ] Aba "Plano" — exibir plano atual e botão upgrade
- [ ] `WorkspaceSwitcher` — criar novo workspace e trocar entre workspaces ativos
- [ ] Proteção por papel: Membros não acessam configurações de workspace
- [ ] Verificação de limite do plano Free (máx. 2 membros) antes de convidar

**Commit final:** `feat: multi-workspace — criação, convites por e-mail (Resend), aceite e papéis Admin/Membro`

---

## M11 — Stripe & Monetização

**Branch:** `feat/stripe`
**Objetivo:** Checkout, webhook e Customer Portal integrados; limites de plano enforçados no servidor.

### Entregas

- [ ] `src/lib/stripe/client.ts` — instância do Stripe SDK com chave secreta
- [ ] `src/lib/stripe/webhooks.ts` — handlers para eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- [ ] `app/api/stripe/checkout/route.ts` — POST: criar sessão Stripe Checkout para plano Pro
- [ ] `app/api/stripe/portal/route.ts` — POST: criar sessão Customer Portal
- [ ] `app/api/webhooks/stripe/route.ts` — receber e processar webhooks Stripe
- [ ] Atualizar `workspaces.plan` no Supabase via webhook (free → pro → free)
- [ ] Página de configurações, aba "Plano":
  - [ ] Plano Free: exibir limites + botão "Fazer upgrade"
  - [ ] Plano Pro: exibir status + botão "Gerenciar assinatura" (Customer Portal)
- [ ] Bloquear criação de lead quando atingir limite de 50 (plano Free)
- [ ] Bloquear convite de membro quando atingir limite de 2 (plano Free)
- [ ] Tela de sucesso pós-checkout (`/settings?upgrade=success`)
- [ ] Testar localmente com `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

**Commit final:** `feat: stripe — checkout Pro, webhook, customer portal e limites de plano enforçados`

---

## M12 — Deploy & Produção

**Branch:** `feat/deploy`
**Objetivo:** App em produção na Vercel com Supabase produção, domínio configurado e smoke test aprovado.

### Entregas

- [ ] Criar projeto Supabase de produção (separado do de desenvolvimento)
- [ ] Rodar todas as migrations SQL no Supabase produção
- [ ] Configurar produto e preço no Stripe (modo live ou manter test para o curso)
- [ ] Criar projeto na Vercel e conectar ao repositório GitHub
- [ ] Configurar todas as variáveis de ambiente na Vercel (Settings → Environment Variables)
- [ ] Configurar `NEXT_PUBLIC_APP_URL` com a URL real da Vercel
- [ ] Configurar webhook Stripe apontando para a URL de produção
- [ ] Primeiro deploy bem-sucedido (`npm run build` sem erros)
- [ ] Smoke test de produção:
  - [ ] Signup → criação de workspace → login
  - [ ] Criar lead → mover no kanban → registrar atividade
  - [ ] Convidar membro → aceitar convite
  - [ ] Checkout Stripe → plano atualizado → Customer Portal
- [ ] Configurar domínio customizado (opcional)
- [ ] `npm run build` local sem warnings de TypeScript

**Commit final:** `chore: deploy — app em produção na Vercel com Supabase e Stripe configurados`

---

## Sequência Visual

```
M0 Setup
 └─ M1 Landing Page
     └─ M2 Auth UI
         └─ M3 Dashboard Shell
             ├─ M4 Leads UI
             ├─ M5 Pipeline UI
             └─ M6 Dashboard UI
                 └─ M7 Auth Backend        ← interface conecta ao banco
                     └─ M8 Leads Backend
                         └─ M9 Pipeline Backend
                             └─ M10 Multi-workspace
                                 └─ M11 Stripe
                                     └─ M12 Deploy
```

---

> **Regra de ouro:** cada milestone deve rodar sem erros (`npm run build`) antes de abrir o próximo branch.
