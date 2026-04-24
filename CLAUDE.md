# PipeFlow CRM — Briefing do Projeto

> CRM SaaS multi-empresa para PMEs, freelancers e times de vendas.
> PRD completo em [`docs/PRD.md`](docs/PRD.md).

---

## Stack Técnica

| Camada | Tecnologia | Notas |
|---|---|---|
| Framework | Next.js 14 (App Router) | Server Components por padrão |
| Linguagem | TypeScript 5 | `strict: true`, sem `any` |
| Estilização | Tailwind CSS + shadcn/ui | Tema customizado (ver Identidade Visual) |
| Banco de dados | Supabase — PostgreSQL | RLS obrigatório em todas as tabelas |
| Autenticação | Supabase Auth | E-mail + senha |
| Segurança | Row Level Security (RLS) | Isolamento por `workspace_id` |
| Pagamento | Stripe | Checkout + Webhooks + Customer Portal |
| E-mail | Resend | Convites de colaboradores |
| Drag-and-drop | @dnd-kit | Pipeline Kanban |
| Gráficos | Recharts | Dashboard de métricas |
| Deploy | Vercel + Supabase | CI via GitHub |
| Validação | Zod | Todas as API Routes |

---

## Estrutura de Pastas

```
src/
  app/
    (auth)/                   # rotas públicas
      login/
      signup/
      invite/[token]/
    (dashboard)/              # rotas protegidas (requer sessão)
      layout.tsx              # sidebar + header + workspace switcher
      page.tsx                # dashboard com métricas
      leads/
        page.tsx              # listagem com busca e filtros
        [id]/page.tsx         # detalhe do lead + timeline
      pipeline/
        page.tsx              # kanban drag-and-drop
      activities/
        page.tsx              # timeline geral
      settings/
        page.tsx              # workspace, membros, plano Stripe
    api/
      webhooks/
        stripe/route.ts       # ativar/desativar plano via webhook
      invites/route.ts        # criar e aceitar convites
    page.tsx                  # landing page pública
    layout.tsx                # root layout
  components/
    ui/                       # shadcn/ui — NÃO editar diretamente
    features/
      leads/                  # LeadCard, LeadForm, LeadTimeline
      pipeline/               # KanbanBoard, KanbanColumn, DealCard
      dashboard/              # MetricCard, FunnelChart, DealsList
      workspace/              # WorkspaceSwitcher, InviteModal
  lib/
    supabase/
      client.ts               # createBrowserClient
      server.ts               # createServerClient (cookies)
    stripe/
      client.ts               # Stripe SDK instance
      webhooks.ts             # handlers de eventos
    resend/
      templates/              # InviteEmail, WelcomeEmail
  hooks/                      # useLeads, usePipeline, useWorkspace...
  types/
    index.ts                  # Lead, Deal, Activity, Workspace, Member
    env.d.ts                  # tipagem de process.env
  utils/                      # funções puras sem side effects
  middleware.ts               # proteção de rotas via Supabase Auth
```

---

## Convenções de Código

### Geral
- TypeScript estrito — sem `any`, sem `// @ts-ignore`
- Imports absolutos via `@/` (configurado em `tsconfig.json`)
- Comentários apenas quando o "porquê" não é óbvio

### Componentes
- PascalCase para componentes: `LeadCard.tsx`
- `"use client"` apenas quando necessário (eventos, hooks de estado, @dnd-kit)
- Props tipadas com interface, não `type`
- Server Components para busca de dados; Client Components para interatividade

### API Routes
- Arquivo: `app/api/[recurso]/route.ts`
- Sempre validar entrada com Zod antes de qualquer operação
- Retornar `NextResponse.json()` com status HTTP correto
- Nunca confiar em `workspace_id` vindo do body — sempre extrair da sessão Supabase

### Hooks
- Prefixo `use`: `useLeads`, `usePipeline`, `useWorkspace`
- Um hook por domínio de funcionalidade

### Banco de dados
- Tipos gerados via: `npx supabase gen types typescript --local > src/types/database.ts`
- Nunca fazer queries raw — usar o cliente Supabase tipado
- RLS ativo em todas as tabelas (sem exceção)

---

## Multi-tenancy — Padrão Crítico

Todo dado pertence a um workspace. Regra absoluta:

1. `workspace_id` **sempre** vem da sessão autenticada do Supabase
2. **Nunca** aceitar `workspace_id` do body de requisições HTTP
3. RLS no PostgreSQL garante isolamento como segunda camada de defesa
4. Schema de referência:
   - `workspaces` → `workspace_members` (N:N com `profiles`)
   - `leads`, `deals`, `activities` → todos com FK para `workspaces.id`

---

## Identidade Visual

### Paleta de Cores

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#0C0C0E` | Background principal |
| `--surface` | `#141416` | Cards, painéis |
| `--surface-2` | `#1A1A1E` | Hover states, nested |
| `--border` | `#2A2A2E` | Bordas visíveis |
| `--accent` | `#CAFF33` | CTA, destaques, links ativos |
| `--text` | `#E8E8E8` | Texto principal |
| `--text-sec` | `#8A8A8F` | Texto secundário |
| `--text-muted` | `#555559` | Labels, placeholders |
| `--positive` | `#2ED573` | Sucesso, "Fechado Ganho" |
| `--negative` | `#FF4757` | Erro, "Fechado Perdido" |
| `--cool` | `#5B7FFF` | Info, links |
| `--warm` | `#FF6B35` | Avisos |

### Tipografia

| Papel | Fonte | Peso |
|---|---|---|
| Headings / Títulos | Syne | 700, 800 |
| Corpo / UI | DM Sans | 400, 500, 600 |
| Código / Mono | IBM Plex Mono | 400, 500 |

### Princípios de Design
- **Dark mode nativo** — sem toggle claro/escuro por ora
- shadcn/ui com tema customizado alinhado à paleta acima (CSS variables em `globals.css`)
- Referência de pipeline: **PipeDrive** (kanban limpo, foco em ação)
- Referência de estrutura: **HubSpot** (sidebar, navegação, detalhe de contato)
- Evitar "AI slop" — UI distinta, não genérica

---

## Planos e Limites

| Plano | Colaboradores | Leads | Preço |
|---|---|---|---|
| Free | até 2 | até 50 | Grátis |
| Pro | ilimitados | ilimitados | R$49/mês |

- Limites verificados no servidor antes de criar leads/convidar membros
- Stripe Webhook em `app/api/webhooks/stripe/route.ts` atualiza `workspaces.plan`

---

## Variáveis de Ambiente

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=

# Resend
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Comandos Úteis

```bash
npm run dev                                          # servidor de desenvolvimento
npm run build                                        # build de produção
npm run lint                                         # ESLint
npx supabase gen types typescript --local \
  > src/types/database.ts                            # gerar tipos do banco
stripe listen --forward-to localhost:3000/api/webhooks/stripe  # webhooks locais
```

---

## Skills & Agents Disponíveis

| Nome | Tipo | Uso |
|---|---|---|
| `nextjs-supabase-auth` | Skill | Autenticação, middleware, rotas protegidas |
| `stripe-integration` | Skill | Checkout, webhooks, Customer Portal |
| `best-practices` | Skill | Segurança, qualidade, OWASP |
| `frontend-design` | Skill | UI production-grade, evitar AI slop |
| `code-reviewer` | Agent | Revisão antes de cada commit importante |
| `frontend-developer` | Agent | Componentes React/Next.js complexos |
