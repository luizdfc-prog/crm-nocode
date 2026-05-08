# Recuperação de Desastre — Z4P CRM

Guia para restaurar todo o ambiente em caso de perda do computador,
formatação ou troca de máquina. Tempo estimado: **30–60 minutos**.

---

## O que está seguro na nuvem (não precisa recuperar)

| O que | Onde | Como acessar |
|---|---|---|
| Código fonte | GitHub | github.com → repositório crm-nocode |
| Banco de dados | Supabase | supabase.com → projeto sjaibytzqpxbvkvxwhoh |
| Arquivos de mídia | Supabase Storage | Mesmo painel acima |
| Aplicação em produção | Vercel | vercel.com → projeto crm-nocode |
| Servidor Baileys | Railway | railway.app |
| DNS / Domínio | Registrador do domínio | engenharia.app |

> A aplicação continuará funcionando normalmente para os usuários
> mesmo que seu computador esteja completamente inacessível.

---

## Backup Automático — Configurado em 08/05/2026

O Google Drive Desktop está instalado e configurado na conta **engenharia.ia26@gmail.com**.

**O que está sendo sincronizado automaticamente:**
- Pasta completa `C:\Users\Micro\Desktop` → sincroniza em tempo real
- Isso inclui `CRM_nocode/.env.local` e todos os arquivos do projeto

**Como verificar:** Abrir o ícone do Google Drive na bandeja do sistema (canto inferior direito) → deve mostrar "Atualizado".

**Para recuperar em outra máquina:**
1. Instalar Google Drive Desktop
2. Fazer login com engenharia.ia26@gmail.com
3. O Desktop inteiro será restaurado automaticamente

---

## Passo a Passo de Recuperação

### 1. Instalar ferramentas (5 min)
```bash
# Node.js — baixar em nodejs.org (versão LTS)
# Git — baixar em git-scm.com
# VS Code ou Cursor — baixar no site oficial

# Após instalar, verificar:
node -v
git -v
```

### 2. Clonar o repositório (2 min)
```bash
git clone https://github.com/SEU_USUARIO/crm-nocode.git
cd crm-nocode
npm install
```

### 3. Restaurar o .env.local (2 min)
- Copiar o `.env.local` salvo no Google Drive para dentro da pasta `crm-nocode/`
- Verificar se todas as variáveis estão presentes (comparar com `white-label/env.template`)

### 4. Instalar Vercel CLI (1 min)
```bash
npm i -g vercel
vercel login
vercel link  # selecionar o projeto crm-nocode existente
```

### 5. Testar localmente (2 min)
```bash
npm run dev
# Acessar http://localhost:3000 e verificar que carrega
```

### 6. Verificar que produção está ok
- Acessar engenharia.app — deve estar funcionando normalmente
- Acessar engenharia.app/admin — verificar painel admin

---

## Se precisar recriar as chaves (pior cenário)

Caso perca o `.env.local` e precise recriar tudo do zero:

| Serviço | Onde gerar | Variável |
|---|---|---|
| Supabase URL + Keys | supabase.com → projeto → Settings → API | `NEXT_PUBLIC_SUPABASE_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY` |
| Stripe Keys | dashboard.stripe.com → Developers → API Keys | `PUBLISHABLE_KEY`, `SECRET_KEY` |
| Stripe Webhook | dashboard.stripe.com → Webhooks → recriar endpoint | `STRIPE_WEBHOOK_SECRET` |
| Resend | resend.com → API Keys | `RESEND_API_KEY` |
| Anthropic | console.anthropic.com → API Keys | `ANTHROPIC_API_KEY` |
| OpenAI | platform.openai.com → API Keys | `OPENAI_API_KEY` |
| WhatsApp Token | developers.facebook.com → app → WhatsApp | `WHATSAPP_ACCESS_TOKEN` |
| Baileys Secret | inventar um novo valor seguro | `BAILEYS_API_SECRET` |

> Após recriar as chaves, atualizar na Vercel:
> `vercel env add NOME_DA_VARIAVEL production`

---

## Checklist de Backup Preventivo

Fazer **uma vez por mês**:

- [ ] Confirmar que o `.env.local` está salvo no Google Drive
- [ ] Confirmar que não há código local sem push: `git status`
- [ ] Fazer push de tudo pendente: `git push`
- [ ] Verificar no GitHub que o último commit está lá

---

## Contatos de Suporte dos Serviços

| Serviço | Suporte |
|---|---|
| Supabase | supabase.com/support |
| Vercel | vercel.com/support |
| Stripe | support.stripe.com |
| Railway | railway.app/help |
| Resend | resend.com/support |
