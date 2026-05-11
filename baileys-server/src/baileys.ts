import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
  jidNormalizedUser,
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

const state: BaileysState = {
  socket: null,
  qrCode: null,
  connectionState: 'disconnected',
}

export function getState() {
  return state
}

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
    browser: ['Z4P CRM', 'Chrome', '1.0.0'],
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
      const boom = lastDisconnect?.error as Boom | undefined
      const statusCode = boom?.output?.statusCode
      const errorMessage = boom?.message ?? ''
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut

      state.connectionState = 'disconnected'
      state.qrCode = null
      console.log(`Conexão encerrada. Código: ${statusCode}. Reconectar: ${shouldReconnect}`)

      if (shouldReconnect) {
        // MessageCounterError = session keys do Signal Protocol corrompidas no Supabase.
        // Limpa apenas as session keys (não as creds) para não exigir novo QR Code.
        if (errorMessage.includes('MessageCounterError') || statusCode === 500) {
          console.log('[Baileys] Limpando session keys corrompidas (MessageCounterError)...')
          await clearSessionKeys()
        }

        await new Promise((r) => setTimeout(r, 3000))
        await createBaileysConnection()
      }
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

      // Resolve @lid → número real antes de encaminhar
      const resolvedMsg = await resolveLidToPhone(sock, msg)
      const resolvedJid = resolvedMsg.key.remoteJid ?? ''

      // Se o @lid não foi resolvido para um número real (@s.whatsapp.net),
      // não encaminha — não há como responder para um JID interno @lid
      if (resolvedJid.endsWith('@lid')) {
        console.log(`[Baileys] ignorado: @lid não resolvido (${resolvedJid}) — sem número de telefone real`)
        continue
      }

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
  console.log(`[Baileys] @lid detectado: ${jid} — tentando resolver número real`)

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
        timeout: 30_000, // aumentado para acomodar upload de mídia
      },
    )
  } catch (err) {
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
