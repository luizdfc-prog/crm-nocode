import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  type WASocket,
  type proto,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import axios from 'axios'
import path from 'path'

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

const AUTH_DIR = path.resolve(process.cwd(), 'auth_info_baileys')
const Z4P_WEBHOOK_URL = process.env.Z4P_WEBHOOK_URL || ''
const WORKSPACE_ID = process.env.WORKSPACE_ID || ''
const BAILEYS_API_SECRET = process.env.BAILEYS_API_SECRET || ''

export async function createBaileysConnection(): Promise<void> {
  const { version } = await fetchLatestBaileysVersion()
  const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR)

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
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut

      state.connectionState = 'disconnected'
      state.qrCode = null
      console.log(`Conexão encerrada. Código: ${statusCode}. Reconectar: ${shouldReconnect}`)

      if (shouldReconnect) {
        // Aguarda 3s antes de reconectar para não sobrecarregar
        await new Promise((r) => setTimeout(r, 3000))
        await createBaileysConnection()
      }
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    // Processa tanto 'notify' (mensagens novas) quanto 'append' (histórico/sincronização)
    if (type !== 'notify' && type !== 'append') return

    for (const msg of messages) {
      const jid = msg.key.remoteJid ?? ''

      // Ignora mensagens sem conteúdo e broadcasts de status
      if (!msg.message) continue
      if (jid === 'status@broadcast') continue

      const msgKeys = Object.keys(msg.message ?? {}).join(', ')
      console.log(`[Baileys] → encaminhando — fromMe: ${msg.key.fromMe}, jid: ${jid}, tipos: ${msgKeys}`)
      await forwardMessageToZ4P(msg)
    }
  })
}

async function forwardMessageToZ4P(msg: proto.IWebMessageInfo): Promise<void> {
  if (!Z4P_WEBHOOK_URL || !WORKSPACE_ID) {
    console.warn('Z4P_WEBHOOK_URL ou WORKSPACE_ID não configurados — mensagem ignorada')
    return
  }

  try {
    await axios.post(
      Z4P_WEBHOOK_URL,
      { message: msg, workspace_id: WORKSPACE_ID },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-baileys-secret': BAILEYS_API_SECRET,
        },
        timeout: 10_000,
      },
    )
  } catch (err) {
    console.error('Erro ao encaminhar mensagem ao Z4P:', err)
  }
}

export async function disconnectBaileys(): Promise<void> {
  if (state.socket) {
    await state.socket.logout()
    state.socket = null
    state.connectionState = 'disconnected'
    state.qrCode = null
  }
}
