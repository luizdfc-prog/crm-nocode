import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
  jidNormalizedUser,
  Browsers,
  type WASocket,
  type proto,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import axios from 'axios'
import { useSupabaseAuthState, clearAuthState, clearSessionKeys } from './supabase-auth-state'

const logger = pino({ level: 'silent' })

export type ConnectionState = 'disconnected' | 'qr' | 'connecting' | 'connected'

interface BaileysState {
  socket: WASocket | null
  qrCode: string | null
  connectionState: ConnectionState
}

interface BaileysStats {
  messagesReceived: number
  messagesForwarded: number
  forwardErrors: number
  lastMessageAt: string | null
  lastError: string | null
  lastErrorAt: string | null
  reconnectCount: number
}

const state: BaileysState = {
  socket: null,
  qrCode: null,
  connectionState: 'disconnected',
}

const stats: BaileysStats = {
  messagesReceived: 0,
  messagesForwarded: 0,
  forwardErrors: 0,
  lastMessageAt: null,
  lastError: null,
  lastErrorAt: null,
  reconnectCount: 0,
}

export function getState() { return state }
export function getStats() { return stats }

// Mapa em memória: pushName.toLowerCase() → número real de telefone
// Populado em tempo real (append + notify) e via Supabase ao iniciar
const lidToPhoneMap = new Map<string, string>()

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const Z4P_WEBHOOK_URL = process.env.Z4P_WEBHOOK_URL || ''
const WORKSPACE_ID = process.env.WORKSPACE_ID || ''
const BAILEYS_API_SECRET = process.env.BAILEYS_API_SECRET || ''

// Pre-popula mapa pushName→phone consultando conversas recentes no Supabase
async function preloadLidMap(): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !WORKSPACE_ID) return
  try {
    const url = `${SUPABASE_URL}/rest/v1/conversations?select=phone_number,lead:leads(name)&workspace_id=eq.${WORKSPACE_ID}&order=last_message_at.desc&limit=200`
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    })
    if (!res.ok) return
    const rows = await res.json() as Array<{ phone_number: string; lead: { name?: string } | null }>
    let count = 0
    for (const row of rows) {
      const phone = row.phone_number ?? ''
      const name = (row.lead?.name ?? '').toLowerCase()
      // Só mapeia números reais (55... com 10-13 dígitos) e nomes não genéricos
      if (phone.length >= 10 && phone.length <= 15 && name && !name.startsWith('whatsapp ')) {
        lidToPhoneMap.set(`pushName:${name}`, phone)
        count++
      }
    }
    console.log(`[Baileys] mapa @lid pre-populado com ${count} contatos do Supabase`)
  } catch (err) {
    console.warn('[Baileys] Erro ao pre-popular mapa @lid:', err)
  }
}

export async function createBaileysConnection(): Promise<void> {
  const { version } = await fetchLatestBaileysVersion()
  const { state: authState, saveCreds } = await useSupabaseAuthState()

  const sock = makeWASocket({
    version,
    logger,
    auth: authState,
    printQRInTerminal: true,
    // Ubuntu browser = multi-device sem conflito com WhatsApp Web no celular
    browser: Browsers.ubuntu('Chrome'),
    // Reconecta mais rápido após quedas
    connectTimeoutMs: 60_000,
    keepAliveIntervalMs: 10_000,
    retryRequestDelayMs: 250,
  })

  state.socket = sock

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      state.qrCode = qr
      state.connectionState = 'qr'
      console.log('QR Code gerado — escaneie pelo WhatsApp')
    }

    if (connection === 'connecting') {
      state.connectionState = 'connecting'
    }

    if (connection === 'open') {
      state.connectionState = 'connected'
      state.qrCode = null
      console.log('WhatsApp conectado com sucesso!')
      // Pre-popula mapa @lid com contatos existentes no Supabase
      preloadLidMap().catch(() => {})
    }

    if (connection === 'close') {
      stats.reconnectCount++
      const boom = lastDisconnect?.error as Boom | undefined
      const statusCode = boom?.output?.statusCode
      const errorMessage = boom?.message ?? ''

      state.connectionState = 'disconnected'
      state.qrCode = null
      console.log(`Conexão encerrada. Código: ${statusCode}. Mensagem: ${errorMessage}`)

      // 515 = loggedOut explicitamente pelo usuário — não reconecta
      if (statusCode === DisconnectReason.loggedOut) {
        console.log('[Baileys] Sessão encerrada pelo usuário — aguardando novo QR Code')
        return
      }

      // 440 = outra sessão ativa expulsou esta (WhatsApp Web/celular em conflito)
      // 428 = Connection Closed / Precondition Required após conflito de sessão
      // Nesses casos: limpa session keys (não as creds), aguarda mais antes de reconectar
      if (statusCode === 440 || statusCode === 428) {
        console.log(`[Baileys] Código ${statusCode}: conflito de sessão — limpando session keys e aguardando 10s`)
        await clearSessionKeys()
        await new Promise((r) => setTimeout(r, 10_000))
        await createBaileysConnection()
        return
      }

      // 500 / MessageCounterError = session keys corrompidas
      if (errorMessage.includes('MessageCounterError') || statusCode === 500) {
        console.log('[Baileys] MessageCounterError — limpando session keys corrompidas')
        await clearSessionKeys()
        await new Promise((r) => setTimeout(r, 3000))
        await createBaileysConnection()
        return
      }

      // Demais erros: reconecta após 3s
      await new Promise((r) => setTimeout(r, 3000))
      await createBaileysConnection()
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    for (const msg of messages) {
      const jid = msg.key.remoteJid ?? ''
      // Popula mapa pushName → phone para todos os tipos (notify e append/histórico)
      // Isso permite resolver @lid em mídias mesmo após reinício do servidor
      if (jid.endsWith('@s.whatsapp.net') && msg.pushName && !msg.key.fromMe) {
        const phone = jid.replace('@s.whatsapp.net', '')
        lidToPhoneMap.set(`pushName:${msg.pushName.toLowerCase()}`, phone)
      }
    }

    // Log de diagnóstico: registra TODOS os tipos de mensagem para detectar novos contatos perdidos
    console.log(`[Baileys] messages.upsert type="${type}" count=${messages.length} jids=${messages.map(m => m.key.remoteJid ?? '?').join(',')}`)

    // Apenas 'notify' = mensagens novas em tempo real; 'append' é histórico/sincronização (ignora)
    if (type !== 'notify') return

    for (const msg of messages) {
      const jid = msg.key.remoteJid ?? ''

      // Broadcasts de status — ignora sempre
      if (jid === 'status@broadcast') continue

      // Ignora mensagens enviadas por nós mesmos (fromMe)
      if (msg.key.fromMe) {
        console.log(`[Baileys] ignorado fromMe=true: ${jid}`)
        continue
      }

      // Mensagem sem conteúdo — loga para diagnóstico mas ignora
      if (!msg.message) {
        console.log(`[Baileys] ignorado sem message: ${jid} fromMe=${msg.key.fromMe} pushName=${msg.pushName ?? 'vazio'}`)
        continue
      }

      // Resolve @lid → número real antes de encaminhar
      const resolvedMsg = await resolveLidToPhone(sock, msg)
      const resolvedJid = resolvedMsg.key.remoteJid ?? ''

      // Se o @lid não foi resolvido, ainda encaminha mas marca como somente leitura
      // (não há como responder, mas a mensagem deve ser registrada no CRM)
      if (resolvedJid.endsWith('@lid')) {
        console.log(`[Baileys] @lid não resolvido (${resolvedJid}) — encaminhando assim mesmo para registro`)
      }

      stats.messagesReceived++
      stats.lastMessageAt = new Date().toISOString()

      const msgKeys = Object.keys(resolvedMsg.message ?? {}).join(', ')
      console.log(`[Baileys] → encaminhando — fromMe: ${resolvedMsg.key.fromMe}, jid: ${resolvedJid}, tipos: ${msgKeys}`)
      try {
        await forwardMessageToZ4P(resolvedMsg)
      } catch (fwdErr) {
        console.error(`[Baileys] EXCEÇÃO em forwardMessageToZ4P:`, fwdErr instanceof Error ? fwdErr.message : String(fwdErr))
      }
    }
  })
}

// audioMessage primeiro — evita que imageMessage (thumbnail) seja detectado antes em mensagens de áudio
const MEDIA_TYPES = ['audioMessage', 'videoMessage', 'documentMessage', 'imageMessage', 'stickerMessage'] as const

// Tenta resolver um JID @lid para o número de telefone real (@s.whatsapp.net).
// O WhatsApp às vezes entrega mensagens com JID interno (@lid) em vez do número do contato.
// Usamos sock.onWhatsApp() para descobrir o JID real a partir do número extraído do @lid.
async function resolveLidToPhone(sock: WASocket, msg: proto.IWebMessageInfo): Promise<proto.IWebMessageInfo> {
  const jid = msg.key.remoteJid ?? ''
  if (!jid.endsWith('@lid')) return msg

  // Extrai a parte numérica do @lid (ex: "99325464080537@lid" → "99325464080537")
  const lidNumeric = jid.replace('@lid', '')
  const participant = msg.key.participant ?? ''
  console.log(`[Baileys] @lid detectado: ${jid} participant=${participant || 'vazio'} pushName=${msg.pushName ?? 'vazio'} — tentando resolver número real`)

  // Em chats 1:1, participant pode já ter o número real
  if (participant.endsWith('@s.whatsapp.net')) {
    console.log(`[Baileys] @lid resolvido via participant: ${jid} → ${participant}`)
    return { ...msg, key: { ...msg.key, remoteJid: participant } }
  }

  try {
    // onWhatsApp aceita número limpo ou com código de país
    // O @lid numérico não é o número de telefone, então tentamos via contato normalizado
    const normalized = jidNormalizedUser(jid)
    console.log(`[Baileys] jidNormalizedUser: ${normalized}`)

    // Tenta buscar o contato pela store de contatos do socket
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contacts = (sock as unknown as { store?: { contacts?: Record<string, { id?: string; notify?: string }> } }).store?.contacts ?? {}
    const contact = contacts[jid] ?? contacts[normalized]
    if (contact?.id && contact.id.endsWith('@s.whatsapp.net')) {
      const resolvedPhone = contact.id.replace('@s.whatsapp.net', '')
      console.log(`[Baileys] @lid resolvido via store: ${jid} → ${contact.id}`)
      return { ...msg, key: { ...msg.key, remoteJid: contact.id } }
    }

    // Consulta mapa em memória pelo pushName (populado quando textos chegam com número real)
    const pushName = msg.pushName ?? ''
    if (pushName) {
      const cachedPhone = lidToPhoneMap.get(`pushName:${pushName.toLowerCase()}`)
      if (cachedPhone) {
        const realJid = `${cachedPhone}@s.whatsapp.net`
        console.log(`[Baileys] @lid resolvido via mapa em memória (pushName): ${jid} → ${realJid}`)
        return { ...msg, key: { ...msg.key, remoteJid: realJid } }
      }
    }

    // Tenta perguntar ao WhatsApp se pushName parece um número de telefone
    // Usa timeout de 5s para evitar travar o loop de mensagens
    const pushDigits = pushName.replace(/\D/g, '')
    if (pushDigits.length >= 10) {
      try {
        const results = await Promise.race([
          sock.onWhatsApp(pushDigits),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
        ])
        if (results && results.length > 0 && results[0].exists) {
          const realJid = results[0].jid
          console.log(`[Baileys] @lid resolvido via onWhatsApp(pushName): ${jid} → ${realJid}`)
          lidToPhoneMap.set(`pushName:${pushName.toLowerCase()}`, realJid.replace('@s.whatsapp.net', ''))
          return { ...msg, key: { ...msg.key, remoteJid: realJid } }
        }
      } catch (onWaErr) {
        console.warn(`[Baileys] onWhatsApp timeout/erro para pushDigits "${pushDigits}": ${onWaErr instanceof Error ? onWaErr.message : String(onWaErr)}`)
      }
    }

    console.log(`[Baileys] @lid não resolvido: ${jid} — usando LID numérico (${lidNumeric})`)
  } catch (err) {
    console.warn(`[Baileys] Erro ao resolver @lid ${jid}:`, err)
  }

  return msg
}

async function forwardMessageToZ4P(msg: proto.IWebMessageInfo): Promise<void> {
  if (!Z4P_WEBHOOK_URL || !WORKSPACE_ID) {
    console.warn('Z4P_WEBHOOK_URL ou WORKSPACE_ID não configurados — mensagem ignorada')
    return
  }

  // Detecta se a mensagem contém mídia e tenta baixar
  let mediaBase64: string | null = null
  let mediaMimeType: string | null = null

  const msgContent = msg.message ?? {}
  const mediaKey = MEDIA_TYPES.find((k) => k in msgContent)

  const mediaObj = mediaKey ? msgContent[mediaKey] as { mediaKey?: unknown; mimetype?: string | null; url?: string | null; directPath?: string | null } | null : null
  const hasMediaKey = !!mediaObj?.mediaKey
  const hasDirectPath = !!mediaObj?.directPath

  console.log(`[Baileys] mídia detectada: ${mediaKey ?? 'nenhuma'} | hasMediaKey=${hasMediaKey} | hasDirectPath=${hasDirectPath} | mime=${mediaObj?.mimetype ?? 'N/A'}`)

  // Tenta baixar se tiver mediaKey (chave de descriptografia) OU directPath (URL direta)
  // Mensagens com @lid às vezes chegam sem mediaKey mas com directPath válido
  if (mediaKey && (hasMediaKey || hasDirectPath) && state.socket) {
    try {
      console.log(`[Baileys] Baixando mídia: ${mediaKey}`)
      const buffer = await downloadMediaMessage(
        msg,
        'buffer',
        {},
        { logger, reuploadRequest: state.socket.updateMediaMessage },
      ) as Buffer

      if (buffer && buffer.length > 0) {
        mediaBase64 = buffer.toString('base64')
        const mediaObjInner = msgContent[mediaKey] as { mimetype?: string | null } | null
        mediaMimeType = mediaObjInner?.mimetype ?? null
        console.log(`[Baileys] Mídia baixada com sucesso: ${buffer.length} bytes, mime: ${mediaMimeType}`)
      } else {
        console.warn(`[Baileys] Download retornou buffer vazio para ${mediaKey}`)
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error(`[Baileys] Erro ao baixar mídia (${mediaKey}): ${errMsg}`)
      console.error(`[Baileys] Detalhes: mime=${mediaObj?.mimetype}, url=${mediaObj?.url ?? 'N/A'}, directPath=${mediaObj?.directPath ?? 'N/A'}`)

      // Tenta reupload para refrescar URL expirada e baixar novamente
      if (state.socket && (errMsg.includes('404') || errMsg.includes('expired') || errMsg.includes('403'))) {
        try {
          console.log(`[Baileys] Tentando reupload da mídia...`)
          const refreshed = await state.socket.updateMediaMessage(msg)
          const buffer2 = await downloadMediaMessage(refreshed, 'buffer', {}, { logger, reuploadRequest: state.socket.updateMediaMessage }) as Buffer
          if (buffer2 && buffer2.length > 0) {
            mediaBase64 = buffer2.toString('base64')
            const mediaObjInner = msgContent[mediaKey] as { mimetype?: string | null } | null
            mediaMimeType = mediaObjInner?.mimetype ?? null
            console.log(`[Baileys] Mídia baixada após reupload: ${buffer2.length} bytes`)
          }
        } catch (err2) {
          console.error(`[Baileys] Reupload também falhou: ${err2 instanceof Error ? err2.message : String(err2)}`)
        }
      }
    }
  } else if (mediaKey && !hasMediaKey && !hasDirectPath) {
    console.warn(`[Baileys] ${mediaKey} sem mediaKey nem directPath — não é possível baixar`)
  }

  // Se a mensagem tem texto real (conversation/extendedTextMessage) E uma mídia fantasma sem bytes
  // (comum em mensagens @lid que chegam com audioMessage/imageMessage sem mediaKey),
  // remove a mídia do payload para que o webhook trate como texto normal
  const hasRealText = !!(msgContent.conversation || msgContent.extendedTextMessage?.text)
  const hasPhantomMedia = mediaKey && !hasMediaKey && !hasDirectPath && !mediaBase64
  let finalMsg = msg
  if (hasRealText && hasPhantomMedia && mediaKey) {
    const cleanedMessage = { ...msgContent }
    delete (cleanedMessage as Record<string, unknown>)[mediaKey]
    finalMsg = { ...msg, message: cleanedMessage }
    console.log(`[Baileys] mídia fantasma "${mediaKey}" removida — mensagem tem texto real`)
  }

  try {
    await axios.post(
      Z4P_WEBHOOK_URL,
      {
        message: finalMsg,
        workspace_id: WORKSPACE_ID,
        media_base64: mediaBase64,
        media_mime_type: mediaMimeType,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-baileys-secret': BAILEYS_API_SECRET,
        },
        timeout: 30_000,
      },
    )
    stats.messagesForwarded++
  } catch (err) {
    stats.forwardErrors++
    stats.lastErrorAt = new Date().toISOString()
    if (axios.isAxiosError(err)) {
      const status = err.response?.status ?? 'sem resposta'
      const data = JSON.stringify(err.response?.data ?? err.message).slice(0, 300)
      stats.lastError = `HTTP ${status}: ${data}`
      console.error(`[Baileys] ERRO ao encaminhar para Z4P: HTTP ${status} | ${data}`)
      console.error(`[Baileys] URL: ${Z4P_WEBHOOK_URL} | timeout: ${err.code ?? 'ok'}`)
    } else {
      stats.lastError = err instanceof Error ? err.message : String(err)
      console.error('[Baileys] ERRO ao encaminhar para Z4P:', stats.lastError)
    }
  }
}

export async function disconnectBaileys(): Promise<void> {
  if (state.socket) {
    try {
      await state.socket.logout()
    } catch {
      // logout pode falhar se conexão já estava quebrada — continua mesmo assim
    }
    state.socket = null
    state.connectionState = 'disconnected'
    state.qrCode = null
  }
  // Limpa credenciais salvas para forçar novo QR Code
  await clearAuthState()
  // Reconecta para gerar novo QR imediatamente
  await createBaileysConnection()
}
