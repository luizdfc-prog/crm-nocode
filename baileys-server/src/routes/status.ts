import { Router } from 'express'
import { getState, disconnectBaileys } from '../baileys'

export const statusRouter = Router()

// GET /status — retorna estado atual da conexão
statusRouter.get('/', (_req, res) => {
  const { connectionState, socket } = getState()
  const phone = socket?.user?.id?.split(':')[0] ?? null

  res.json({ status: connectionState, phone })
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
