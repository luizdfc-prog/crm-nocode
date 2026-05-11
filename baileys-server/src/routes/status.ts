import { Router } from 'express'
import { getState, disconnectBaileys, getStats } from '../baileys'

export const statusRouter = Router()

// GET /status — retorna estado atual da conexão + métricas de saúde
statusRouter.get('/', (_req, res) => {
  const { connectionState, socket } = getState()
  const phone = socket?.user?.id?.split(':')[0] ?? null
  const stats = getStats()

  res.json({
    status: connectionState,
    phone,
    uptime_seconds: Math.floor(process.uptime()),
    messages_received: stats.messagesReceived,
    messages_forwarded: stats.messagesForwarded,
    forward_errors: stats.forwardErrors,
    last_message_at: stats.lastMessageAt,
    last_error: stats.lastError,
    last_error_at: stats.lastErrorAt,
    reconnect_count: stats.reconnectCount,
  })
})

// DELETE /status — desconecta o WhatsApp (logout)
statusRouter.delete('/', async (_req, res) => {
  try {
    await disconnectBaileys()
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao desconectar', detail: String(err) })
  }
})
