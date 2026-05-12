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

const Z4P_WEBHOOK_URL = process.env.Z4P_WEBHOOK_URL || ''
const WORKSPACE_ID = process.env.WORKSPACE_ID || ''
const BAILEYS_API_SECRET = process.env.BAILEYS_API_SECRET || ''

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
    // Apenas 'notify' = mensagens novas em tempo real; 'append' é histórico/sincronização (ignora)
    if (type !== 'notify') return

    for (const msg of messages) {
      const jid = msg.key.remoteJid ?? ''

      // Ignora mensagens sem conteúdo e broadcasts de status
      if (!msg.message) continue
      if (jid === 'status@broadcast') continue

      // Ignora mensagens enviadas por nós mesmos (fromMe) — evitar loop e processar
      // documentos/mídias que você mesmo envia pelo celular
      if (msg.key.fromMe) continue

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
      await forwardMessageToZ4P(resolvedMsg)
    }
  })
}

const MEDIA_TYPES = ['imageMessage', 'audioMessage', 'videoMessage', 'documentMessage', 'stickerMessage'] as const

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

    // Fallback: tenta perguntar ao WhatsApp pelo número extraído do nome push (se disponível)
    // O pushName às vezes é o número formatado
    const pushName = msg.pushName ?? ''
    const pushDigits = pushName.replace(/\D/g, '')
    if (pushDigits.length >= 10) {
      const results = await sock.onWhatsApp(pushDigits)
      if (results && results.length > 0 && results[0].exists) {
        const realJid = results[0].jid
        console.log(`[Baileys] @lid resolvido via onWhatsApp(pushName): ${jid} → ${realJid}`)
        return { ...msg, key: { ...msg.key, remoteJid: realJid } }
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

  // Só baixa se o objeto de mídia tiver mediaKey (chave de descriptografia) — evita tentar baixar
  // thumbnails ou previews embutidos em mensagens de texto/link que não são mídia real
  const mediaObj = mediaKey ? msgContent[mediaKey] as { mediaKey?: unknown; mimetype?: string | null; url?: string | null; directPath?: string | null } | null : null
  const hasMediaKey = !!mediaObj?.mediaKey

  if (mediaKey && hasMediaKey && state.socket) {
    try {
      console.log(`[Baileys] Baixando mídia: ${mediaKey}`)
      const buffer = await downloadMediaMessage(
        msg,
        'buffer',
        {},
        { logger, reuploadRequest: state.socket.updateMediaMessage },
      ) as Buffer

      mediaBase64 = buffer.toString('base64')
      // Extrai mimetype do objeto da mensagem
      const mediaObj = msgContent[mediaKey] as { mimetype?: string | null } | null
      mediaMimeType = mediaObj?.mimetype ?? null
      console.log(`[Baileys] Mídia baixada: ${buffer.length} bytes, mime: ${mediaMimeType}`)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error(`[Baileys] Erro ao baixar mídia (${mediaKey}): ${errMsg}`)
      console.error(`[Baileys] Detalhes da mídia: mime=${mediaObj?.mimetype}, url=${mediaObj?.url ?? 'N/A'}, directPath=${mediaObj?.directPath ?? 'N/A'}`)
    }
  }

  try {
    await axios.post(
      Z4P_WEBHOOK_URL,
      {
        message: msg,
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
    stats.lastError = err instanceof Error ? err.message : String(err)
    stats.lastErrorAt = new Date().toISOString()
    console.error('Erro ao encaminhar mensagem ao Z4P:', err)
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
