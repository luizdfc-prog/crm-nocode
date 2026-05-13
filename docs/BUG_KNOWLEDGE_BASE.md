# Base de Conhecimento — Bugs e Soluções

Registro histórico de falhas recorrentes ou não-óbvias no Z4P CRM. Organizado por domínio.
Use como referência antes de depurar — muitos problemas têm raiz conhecida.

---

## WhatsApp / Baileys

### BUG: Agente IA responde para JID inválido (`@lid`)

**Sintoma:** Mensagem aparece no CRM mas não chega ao WhatsApp do cliente.

**Causa:** O WhatsApp usa dois tipos de JID: `@s.whatsapp.net` (número real) e `@lid` (ID interno). Quando o JID é `@lid`, o campo `phone_number` salvo na conversa é o número numérico do LID (ex: `36262509588574`) — não é um telefone real. O Baileys não consegue entregar para `@lid` desconhecido.

**Solução (`baileys-server` e webhook `whatsapp-qr/route.ts`):**
- Mudança de `const lidWithoutPhone = false` para `let lidWithoutPhone = false`
- Após resolução do `sendJid`, verificar: `isRealPhone = !pn.includes("@lid") && pn.length >= 10 && pn.length <= 15 && pn !== from`
- Se `pn !== from` → o `phone_number` é diferente do `from` extraído do LID → é o número real → usar `${pn}@s.whatsapp.net`
- Se `pn === from` → o `phone_number` é o próprio LID numérico → setar `lidWithoutPhone = true` para bloquear IA
- Se `sendJid.endsWith("@lid")` → idem, setar `lidWithoutPhone = true`
- IA só processa quando `!lidWithoutPhone`

**Arquivo:** `src/app/api/webhooks/whatsapp-qr/route.ts`

---

### BUG: Telefone LID exibido no painel lateral da conversa

**Sintoma:** Campo "Telefone" no painel direito do chat mostra `+36262509588574` (ou número de 14 dígitos sem sentido).

**Causa:** `lead.phone` é salvo com o LID numérico quando o JID não é resolvido. A UI exibia `formatPhone(panelLead.phone)` sem validar se é um número real.

**Solução (`ChatWindow.tsx`):**
```tsx
const phoneDigits = (panelLead.phone ?? "").replace(/\D/g, "")
const isRealLeadPhone = panelLead.phone && phoneDigits.length >= 10 && phoneDigits.length <= 15
if (isRealLeadPhone) return formatPhone(panelLead.phone!)
// Fallback para phone_number da conversa se válido
const pn = conversation.phone_number ?? ""
return pn && pn.length <= 15 ? formatPhone(pn) : "Aguardando número"
```
**Regra:** Números reais (E.164) têm entre 10 e 15 dígitos. LIDs têm 14 dígitos mas não passam pelo check `pn !== from` — porém o check visual mais simples é que um telefone brasileiro/internacional real raramente ultrapassa 13 dígitos. Se um `lead.phone` tiver exatamente 14 dígitos sem código de país reconhecível, desconfiar.

**Arquivo:** `src/components/features/conversations/ChatWindow.tsx` linha ~627

---

### BUG: Mensagens do próprio agente processadas pelo webhook

**Sintoma:** Agente responde a si mesmo em loop ou mensagens de saída disparam fluxo de IA.

**Causa:** Webhook processava mensagens com `fromMe = true`.

**Solução:** Adicionar guard `if (msg.key.fromMe) return` no início do handler de mensagens.

**Arquivo:** `src/app/api/webhooks/whatsapp-qr/route.ts`

---

### BUG: Conflito de sessão WhatsApp (erros 440 / 428)

**Sintoma:** WhatsApp desconecta com código 440 (Conflict) ou 428.

**Causa:** Múltiplas instâncias do servidor Baileys rodando simultaneamente com a mesma sessão salva.

**Solução:** Garantir que apenas uma instância do `baileys-server` rode por workspace. No Railway, verificar que não há deploy duplicado ativo. A sessão é persistida na tabela `baileys_auth` — se corrompida, limpar as linhas e escanear QR novamente.

---

### BUG: Mensagens duplicadas no CRM

**Sintoma:** A mesma mensagem aparece duas vezes na conversa.

**Causa:** O webhook Baileys recebe eventos de tipo `append` (histórico de mensagens carregado na reconexão) além de `notify` (novas mensagens). Ambos eram processados.

**Solução:** Filtrar: `if (type !== "notify") return` no início do handler de upsert de mensagens.

---

## Pipeline / Deals

### BUG: Card do deal duplicado ao mover no pipeline

**Sintoma:** Ao arrastar um card para uma coluna, um segundo card idêntico aparece.

**Causa:** A query `.single()` para buscar `existingDeal` lança erro (ou retorna `null`) quando há mais de um resultado ou quando o deal não é encontrado. O bloco `else { INSERT }` era acionado indevidamente.

**Solução:**
- Trocar `.single()` por `.maybeSingle()` na busca de deal existente
- Adicionar `.not("stage", "in", '("fechado_ganho","fechado_perdido")')` para ignorar deals encerrados
- Substituir `else { INSERT }` por `if (!existingDeal) return` (early return sem criar novo deal)

**Arquivo:** `src/app/api/webhooks/whatsapp-qr/route.ts` — bloco de transferência Agente→Vendas

---

### BUG: Conversa não encerra ao mover deal para Fechado Ganho/Perdido

**Sintoma:** Lead tem conversa ainda ativa após deal ser movido para etapa final.

**Causa:** `reorderDeals` não tinha lógica de encerramento de conversas.

**Solução:** No final de `reorderDeals`, filtrar updates com `stage === "fechado_ganho" || "fechado_perdido"`, buscar `lead_id` dos deals afetados, e executar:
```ts
supabase.from("conversations").update({ status: "closed", ai_active: false })
  .in("lead_id", leadIds).eq("status", "open")
```

**Arquivo:** `src/actions/deals.ts` — função `reorderDeals`

---

## Supabase / Tipos

### BUG: `SelectQueryError` ao usar `.select()` com coluna não tipada

**Sintoma:** TypeScript recusa o cast da query com erro `SelectQueryError<"column 'X' does not exist on 'Y'">`.

**Causa:** Os tipos gerados pelo `supabase gen types` não incluem a coluna nova (migration não rodada ou tipos desatualizados).

**Solução imediata:** Usar `(supabase as any).from(...)` com cast explícito do resultado.
**Solução definitiva:** Rodar `npx supabase gen types typescript --local > src/types/database.ts` após cada migration.

---

### BUG: Mock data causa erro de tipo após adicionar coluna à interface

**Sintoma:** TypeScript reclama que objetos em `mock-data.ts` não satisfazem a interface `Deal` (ou similar).

**Causa:** Campo novo adicionado à interface não está nos objetos mock.

**Solução:** Buscar `is_return:` (ou o campo novo) no `mock-data.ts` com `replace_all: true` para adicionar em todos os objetos de uma vez. Atenção a CRLF no Windows — usar `Edit` com string literal em vez de regex via PowerShell.

**Arquivo:** `src/utils/mock-data.ts`

---

## React / Next.js

### BUG: `useState` usado antes de declarado em `useMemo`

**Sintoma:** TypeScript erro `Block-scoped variable used before its declaration` ou comportamento incorreto no runtime.

**Causa:** React Hook rules exigem que `useState` seja declarado antes de `useMemo` que o utiliza. Reorganizar a ordem no componente.

**Solução:** Mover `const [filters, setFilters] = useState(...)` para antes de qualquer `useMemo` que dependa de `filters`.

**Arquivo:** `src/app/(dashboard)/pipeline/PipelineClient.tsx`

---

## Git / Deploy

### BUG: Commit falha com heredoc contendo aspas simples no PowerShell

**Sintoma:** `git commit` retorna `error: pathspec '...' did not match any file(s)`.

**Causa:** PowerShell trata aspas simples dentro de `@'...'@` heredoc de forma diferente quando a mensagem contém caracteres especiais junto a aspas.

**Solução:** Usar `-m` com backtick para continuação de linha em vez de heredoc, ou escapar com `\"`.
Alternativa: usar a ferramenta `Bash` (POSIX) em vez de `PowerShell` para commits com mensagens complexas.

---

## CSS / Tailwind

### BUG: CSS variables (`var(--accent)`) não funcionam em classes Tailwind JIT

**Sintoma:** Cor não aplicada; elemento fica sem cor ou usa fallback.

**Causa:** Tailwind JIT não resolve CSS variables em classes como `bg-[var(--accent)]` corretamente em todos os contextos (especialmente `hover:` e `border-`).

**Solução:** Usar `style={{ backgroundColor: "#CAFF33" }}` inline para cores críticas de UI (botões de ação, badges). Reservar classes Tailwind com `pf-*` tokens (definidos no `tailwind.config`) para uso estático.

---

---

## Sessão 2026-05-13 — Ciclo de crash pós-rollback Gemini

### BUG: Loop infinito de código 440 (conflito de sessão)

**Sintoma:** Logs do Railway mostram ciclo infinito de `WhatsApp conectado com sucesso!` → `Código 440: conflito de sessão` a cada ~20s. Agente não responde.

**Causa raiz:** Rolling deploy do Railway sobe nova instância antes de matar a antiga. As duas instâncias conectam ao mesmo número simultaneamente. Cada reconexão expulsa a outra (440), gerando loop infinito. O código original chamava `createBaileysConnection()` recursivamente sem limite.

**Solução (`baileys-server/src/baileys.ts`):**
- Flag `isReconnecting` em memória — segunda chamada retorna imediatamente
- Backoff exponencial no código 440: 10s → 20s → 40s → 80s → 160s
- Após 5 tentativas consecutivas de 440, para completamente e loga aviso claro
- `conflict440Count` resetado quando conexão abre com sucesso
- Lock distribuído via Supabase (`baileys_auth` com chave `workspace_id:lock:connection`): nova instância aguarda 20s se lock ativo (TTL 45s); heartbeat a cada 20s renova o lock
- Lock liberado no evento `connection.close` e no `disconnectBaileys`

**Arquivo:** `baileys-server/src/baileys.ts`, `baileys-server/src/supabase-auth-state.ts`

---

### BUG: Loop infinito de Invalid PreKey ID após reconexão

**Sintoma:** Logs mostram `[Baileys] Invalid PreKey ID detectado` repetindo a cada mensagem do mesmo contato. `isReconnecting` bloqueava a reconexão, então o handler chamava `createBaileysConnection()` que retornava imediatamente sem fazer nada.

**Causa:** O handler de PreKey chamava `createBaileysConnection()` diretamente enquanto o lock `isReconnecting` estava ativo (pois a conexão ainda não havia fechado).

**Solução:**
- Handler de PreKey agora chama `state.socket?.end(new Error('InvalidPreKey'))` em vez de `createBaileysConnection()` diretamente
- O `end()` dispara o evento `connection.update { connection: 'close' }`, que libera o lock e reconecta pelo fluxo padrão
- Debounce de 60s (`lastPreKeyReconnectAt`): evita loop se o erro persistir do lado do remetente

**Arquivo:** `baileys-server/src/baileys.ts`

---

### BUG: Mensagens não chegam no CRM após rollback de API (Gemini → Anthropic)

**Sintoma:** Mensagem chega no Baileys mas não aparece no CRM. Logs do Railway mostram `Invalid PreKey ID` em loop. Conexão parece ativa mas nenhuma mensagem é processada.

**Causa raiz:** As chaves criptográficas do Signal Protocol ficaram corrompidas no Supabase após o ciclo de crashes durante o rollback. `msg.message` chegava como `null` em todas as mensagens → webhook descartava tudo com `ignorado: sem conteúdo`.

**Solução:** Desconectar completamente via painel de Configurações → WhatsApp → Desconectar. O `clearAuthState()` apaga todas as chaves do Supabase (`baileys_auth`) e a reconexão gera um conjunto limpo de pre-keys.

**Como detectar:** Se `msg.message === null` em quase todas as mensagens + logs de `Invalid PreKey ID`, a solução é sempre reconectar do zero via QR.

---

### BUG: IA não respondia para contatos @lid sem número real

**Sintoma:** Mensagem aparece no CRM, IA fica "digitando" (três pontos), mas nenhuma resposta chega ao WhatsApp. Contato como "Luiz Daniel (Tico)" com número `+36262509588574` (LID numérico).

**Causa:** Código bloqueava a IA com `lidWithoutPhone = true` assumindo que sem número real era impossível responder. Mas o Baileys consegue enviar diretamente para `@lid`.

**Solução (`src/app/api/webhooks/whatsapp-qr/route.ts`):**
- Removido o flag `lidWithoutPhone` e o bloqueio da IA
- Quando não há número real, `sendJid` usa o `rawJid` original (ex: `36262509588574@lid`)
- O `formatJid` no Railway já preservava `@lid` — o envio funcionava, o bloqueio era desnecessário

**Regra:** O Baileys aceita enviar para qualquer JID válido incluindo `@lid`. Só bloquear IA se o JID for completamente inválido (vazio ou malformado).

---

### MELHORIA: Painel lateral do chat — Telefone vs ID WhatsApp

**Contexto:** Contatos @lid exibiam o LID numérico (ex: `+36262509588574`) no campo "Telefone", confundindo o operador.

**Solução (`src/components/features/conversations/ChatWindow.tsx`):**
- Se `lead.phone` tem entre 10–15 dígitos → exibe como "Telefone" formatado normalmente
- Se `conversation.phone_number` tem mais de 15 dígitos (LID) → exibe como "ID WhatsApp" + "Telefone: Aguardando número"
- Sem alteração em nenhuma coluna de banco — apenas cosmético

---

_Última atualização: 2026-05-13_
