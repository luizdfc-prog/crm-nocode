# Plano de Template GitHub — Deploy sem Desktop

Estratégia para transformar o Z4P em um template reutilizável no GitHub,
permitindo implantar novos clientes em ~30 minutos sem depender do Desktop local.

---

## Por que essa abordagem

- **Sem dependência do Desktop:** o código vive no GitHub, o deploy acontece na nuvem
- **Escala:** dezenas de clientes sem acumular pastas no seu PC
- **Segurança:** `.env.local` nunca entra no repositório — cada cliente tem suas credenciais no painel da Vercel/Railway
- **Velocidade:** com o template pronto, um novo cliente leva 30 minutos para ir ao ar

---

## Modelos de Venda Suportados

| Modelo | Descrição | Preço sugerido |
|---|---|---|
| **SaaS Compartilhado** | Infraestrutura sua, cliente paga mensalidade | R$ 300/mês |
| **White-label Dedicado** | Instância exclusiva do cliente, setup único | R$ 5.000 setup + custos diretos do cliente |

No modelo White-label, após o setup o cliente paga diretamente:
- Railway (Baileys): ~U$ 5–15/mês
- Tokens IA (Anthropic): ~U$ 10–30/mês (variável por volume)
- Supabase: grátis ou U$ 25/mês se precisar de mais capacidade
- Vercel: grátis (conta do cliente)
- **Total estimado: ~R$ 80–400/mês** — sem mensalidade para você

---

## Etapas para Transformar o Projeto em Template

### Etapa 1 — `.env.example` + `.gitignore` (15 min)

**O que fazer:**
- Criar `.env.example` na raiz do Next.js com todas as variáveis necessárias e valores vazios
- Confirmar que `.gitignore` exclui `.env.local`, `node_modules/` e a pasta de sessão do WhatsApp (`baileys-server/auth_info_baileys/`)
- Remover qualquer dado hardcoded no código (IDs de workspace, e-mails fixos, etc.)

**Resultado:** repositório seguro para ir ao GitHub sem vazar segredos

---

### Etapa 2 — Verificar Migrations completas (30 min)

**O que fazer:**
- Confirmar que todos os arquivos em `supabase/migrations/` estão em ordem e numerados corretamente
- Testar rodar as migrations do zero em um projeto Supabase limpo
- Garantir que um banco vazio + migrations = sistema funcionando

**Resultado:** qualquer pessoa consegue recriar o banco do zero seguindo os arquivos de migration

---

### Etapa 3 — Centralizar configuração de marca (1h)

**O que fazer:**
- Criar arquivo `src/config/brand.ts` com todas as configurações personalizáveis:
  - Nome do sistema (`APP_NAME`)
  - Logo (caminho ou URL)
  - Cor de destaque (`ACCENT_COLOR`)
  - E-mail de suporte
  - Dados da empresa (usados nos e-mails transacionais)
- Substituir valores espalhados no código por referências a esse arquivo

**Resultado:** para personalizar uma instância basta editar um único arquivo

---

### Etapa 4 — Script de setup automatizado (30 min)

**O que fazer:**
- Criar `setup.ps1` (Windows) e `setup.sh` (Linux/Mac) que:
  1. Copia `.env.example` → `.env.local`
  2. Solicita no terminal as credenciais (Supabase URL, Stripe Key, etc.)
  3. Preenche o `.env.local` automaticamente
  4. Orienta sobre os próximos passos

**Resultado:** instalador guiado — menos chance de erro humano na configuração

---

### Etapa 5 — Guia de deploy `DEPLOY.md` (30 min)

**O que fazer:**
- Criar passo a passo completo de 30 minutos para subir uma nova instância:
  1. Fazer fork do repositório template no GitHub
  2. Criar projeto no Supabase → copiar credenciais
  3. Criar projeto no Railway → deploy do `baileys-server/` → copiar URL
  4. Criar projeto na Vercel → conectar ao repo → colar todas as env vars
  5. Configurar número de WhatsApp (escanear QR)
  6. Validação final (checklist rápido)

**Resultado:** documento que você (ou um assistente) segue sem precisar improvisar

---

## Resumo de Tempo

| # | Etapa | Tempo estimado |
|---|---|---|
| 1 | `.env.example` + `.gitignore` | 15 min |
| 2 | Verificar migrations | 30 min |
| 3 | Centralizar config de marca | 1h |
| 4 | Script de setup | 30 min |
| 5 | `DEPLOY.md` | 30 min |
| **Total** | | **~3 horas** |

Após esse investimento inicial, cada novo cliente leva **~30 minutos** para ir ao ar.

---

## Estrutura de Repositórios no GitHub (por cliente)

```
sua-conta-github/
  z4p-template/          ← repositório base (template oficial)
  z4p-cliente-empresa-a/ ← fork do template, personalizado para o cliente A
  z4p-cliente-empresa-b/ ← fork do template, personalizado para o cliente B
```

Cada repositório de cliente é **privado** e **independente** — uma atualização no template
não afeta clientes existentes automaticamente (você controla quando e se atualiza cada um).

---

## Custos por Cliente (White-label)

| Serviço | Responsável | Custo |
|---|---|---|
| GitHub (repo privado) | Você | Grátis |
| Vercel (conta do cliente) | Cliente | Grátis |
| Supabase (projeto do cliente) | Cliente | Grátis até 500MB |
| Railway (Baileys) | Cliente | ~U$ 5–15/mês |
| Anthropic (tokens IA) | Cliente | ~U$ 10–30/mês |
| **Seu custo após setup** | — | **R$ 0** |

---

## Próximo passo

Executar as etapas acima nesta ordem. Começar pela **Etapa 1** pois é a mais rápida
e já deixa o repositório seguro para subir ao GitHub.

Ver também: [CHECKLIST.md](CHECKLIST.md) para o processo completo de implantação por cliente.
