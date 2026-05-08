# Parâmetros de Personalização por Cliente

O que pode ser alterado por cliente, onde fica no código e como mudar.

---

## Via Variáveis de Ambiente (sem mexer no código)

| Parâmetro | Variável | Exemplo |
|---|---|---|
| Nome do app/empresa | `NEXT_PUBLIC_APP_NAME` | `Clínica Beleza` |
| URL do sistema | `NEXT_PUBLIC_APP_URL` | `https://crm.clinicabeleza.com.br` |
| E-mail remetente | `NEXT_PUBLIC_FROM_EMAIL` | `noreply@clinicabeleza.com.br` |

> **Status:** estas variáveis ainda precisam ser lidas no código. Ver tarefas abaixo.

---

## Via Substituição de Arquivo

| Elemento | Arquivo atual | Como trocar |
|---|---|---|
| Logo SVG/PNG | `public/logo.svg` (a criar) | Substituir o arquivo |
| Favicon | `public/favicon.ico` | Substituir o arquivo |

---

## Via CSS Variables (globals.css)

A cor de destaque (`--accent`) é a principal identidade visual.
Trocar apenas este valor já muda botões, links, bordas ativas e destaques.

```css
/* globals.css — ajustar por cliente */
--accent: #CAFF33;        /* cor principal do cliente */
--accent-fg: #0C0C0E;     /* texto sobre a cor de destaque */
```

---

## Tarefas de Código Pendentes para White-label

Itens que ainda estão hardcoded e precisam ser parametrizados:

- [ ] Substituir `"Z4P"` nos e-mails (InviteEmail, WelcomeEmail) por `NEXT_PUBLIC_APP_NAME`
- [ ] Substituir `"noreply@send.engenharia.app"` nos envios por `NEXT_PUBLIC_FROM_EMAIL`
- [ ] Substituir logo hardcoded no layout por componente que lê `public/logo.svg`
- [ ] Substituir nome "Z4P" no `<title>` e metadata do layout raiz
- [ ] Criar script `scripts/setup-client.ts` que valida se todas as env vars estão preenchidas

---

## Cores — Referência Rápida

Para trocar o tema visual do cliente, editar as CSS variables em `src/app/globals.css`:

| Token | Uso |
|---|---|
| `--accent` | Cor principal — botões CTA, links ativos, destaques |
| `--bg` | Background principal |
| `--surface` | Cards e painéis |
| `--border` | Bordas visíveis |
| `--text` | Texto principal |
