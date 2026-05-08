# Checklist de Implantação — White-label por Cliente

Copie este checklist para cada novo cliente e vá marcando conforme avança.

---

## Dados do Cliente

- **Nome da empresa:** _______________
- **Domínio:** _______________
- **Cor principal (hex):** _______________
- **Logo URL ou arquivo:** _______________
- **E-mail de suporte:** _______________
- **Data de início:** _______________

---

## 1. Cópia Local

- [ ] Criar nova pasta na Área de Trabalho (ex: `CRM_ClienteX`)
- [ ] Copiar todo o conteúdo de `CRM_nocode` para a nova pasta
- [ ] Abrir a nova pasta no Cursor — ela vira um projeto independente
- [ ] **Nunca mexer na pasta `CRM_nocode` original** — ela é o produto Z4P

## 2. Repositório GitHub

- [ ] Criar novo repositório privado no GitHub (ex: `crm-nome-cliente`)
- [ ] Dentro da nova pasta, inicializar git e conectar ao novo repo:
  ```bash
  git init
  git remote add origin https://github.com/seu-usuario/crm-nome-cliente.git
  git add .
  git commit -m "init: base Z4P para cliente X"
  git push -u origin main
  ```

## 3. Supabase

- [ ] Criar novo projeto em supabase.com
- [ ] Anotar: `SUPABASE_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`
- [ ] Rodar migrations: copiar SQL de `supabase/migrations/` e executar no SQL Editor
- [ ] Ativar RLS em todas as tabelas (verificar via `supabase/seed.sql` se existir)
- [ ] Configurar Auth → Email confirmations conforme necessário

## 4. Vercel

- [ ] Criar novo projeto na Vercel
- [ ] Conectar ao repo do cliente criado no passo 2
- [ ] Adicionar domínio do cliente em Settings → Domains
- [ ] Apontar DNS do domínio para a Vercel (CNAME ou A record)
- [ ] Configurar todas as env vars (ver `env.template`)

## 5. Stripe

- [ ] Criar conta Stripe do cliente (ou usar Stripe Connect)
- [ ] Criar produtos/preços conforme planos desejados
- [ ] Anotar: `PUBLISHABLE_KEY`, `SECRET_KEY`, `WEBHOOK_SECRET`, price IDs
- [ ] Configurar webhook: `https://dominio-cliente.com/api/webhooks/stripe`

## 6. Resend

- [ ] Adicionar domínio do cliente no Resend (ou usar domínio próprio)
- [ ] Verificar DNS do domínio de e-mail
- [ ] Anotar: `RESEND_API_KEY`
- [ ] Atualizar `NEXT_PUBLIC_FROM_EMAIL` com e-mail do cliente

## 7. Personalização Visual

- [ ] Atualizar `NEXT_PUBLIC_APP_NAME` com nome da empresa
- [ ] Atualizar `NEXT_PUBLIC_APP_URL` com domínio do cliente
- [ ] Substituir logo (ver `setup/parametros.md`)
- [ ] Ajustar cor de destaque (`--accent`) se diferente do padrão `#CAFF33`
- [ ] Revisar e-mails transacionais (InviteEmail, WelcomeEmail) com nome/cor do cliente

## 8. WhatsApp (se aplicável)

- [ ] Definir tipo de conexão: Meta API ou Baileys (QR Code)
- [ ] **Meta API:** criar app no Meta Business, anotar tokens e phone number ID
- [ ] **Baileys:** fazer deploy do `baileys-server/` no Railway para esta instância
- [ ] Configurar variáveis `WHATSAPP_*` ou `BAILEYS_*`

## 9. Validação Final

- [ ] Acessar o domínio do cliente — landing page carrega
- [ ] Criar conta de teste → onboarding funciona
- [ ] Enviar convite de membro → e-mail chega com link correto
- [ ] Criar lead e mover no pipeline
- [ ] Testar envio/recebimento de mensagem WhatsApp
- [ ] Testar checkout Stripe (modo teste)
- [ ] Webhook Stripe processa corretamente
- [ ] Confirmar que dados de um workspace não aparecem em outro (isolamento RLS)

---

## 10. Configurações Recomendadas Pós-implantação

Ações para manter os custos sob controle e evitar surpresas no longo prazo.

### Storage — Política de Retenção de Mídia
- [ ] Implementar cron job de limpeza automática de mídias antigas (áudios, fotos, vídeos do WhatsApp)
- [ ] Configurar tempo de retenção padrão: 6 meses (ajustável pelo admin do cliente)
- [ ] Arquivos que NÃO devem ser apagados: mídias do agente IA e follow-up (são reutilizadas)
- [ ] Agendar revisão manual do storage a cada 3 meses via painel do Supabase

### Banco de Dados — Monitoramento
- [ ] Verificar tamanho do banco mensalmente no painel Supabase → Settings → Usage
- [ ] Planejar upgrade para Supabase Pro ($25/mês) antes de atingir 400MB (80% do limite)
- [ ] Para clientes com 500+ leads/mês: já contratar Supabase Pro na implantação

### Custos de IA — Controle
- [ ] Revisar consumo Anthropic mensalmente em dashboard.anthropic.com
- [ ] Configurar alerta de gasto no painel da Anthropic (ex: alertar ao atingir $20/mês)
- [ ] Avaliar se o volume de conversas justifica ajuste no prompt do agente para reduzir tokens

### Railway (Baileys)
- [ ] Monitorar uso de CPU/memória no painel Railway
- [ ] Se ultrapassar $5/mês de crédito, avaliar plano pago ou otimizar o servidor

### Painel Admin da Instância
- [ ] Configurar `ADMIN_EMAIL` e `ADMIN_PASSWORD` nas env vars
- [ ] Configurar `AI_COST_ALERT_BRL` com o limite de alerta de custo IA (padrão: R$ 100)
- [ ] Acessar `/admin` e validar que os dados estão carregando corretamente
- [ ] Ver documentação completa em `white-label/setup/painel-admin.md`

---

## Entrega ao Cliente

- [ ] Criar usuário admin para o cliente
- [ ] Enviar credenciais de acesso
- [ ] Entregar documento de uso básico
- [ ] Agendar sessão de onboarding (opcional)
