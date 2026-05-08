# White-label — Instâncias Dedicadas por Cliente

Guia para implantar o Z4P CRM como solução personalizada para um cliente específico.
Cada cliente recebe sua própria instância: domínio próprio, logo, cores e banco de dados isolado.

---

## Estrutura desta pasta

```
white-label/
  README.md              # este arquivo
  CHECKLIST.md           # passo a passo por cliente
  env.template           # todas as variáveis necessárias
  setup/
    parametros.md        # o que pode ser personalizado por cliente
```

---

## Visão geral do processo

| Etapa | Tempo estimado |
|---|---|
| Criar repo a partir do template GitHub | 1 min |
| Criar projeto Supabase + rodar migrations | 5 min |
| Criar projeto Vercel + conectar domínio | 5 min |
| Configurar env vars | 5 min |
| Personalizar logo, nome, cores | 15–30 min |
| **Total** | **~30–60 min por cliente** |

---

## Pré-requisitos

- Acesso ao GitHub (template do repo Z4P)
- Conta Vercel (pode ser conta do cliente ou a sua)
- Conta Supabase (pode ser conta do cliente ou a sua)
- Domínio do cliente com acesso ao DNS
- Conta Stripe (do cliente ou Stripe Connect)
- Conta Resend para e-mails transacionais
