import { Router } from 'express'
import QRCode from 'qrcode'
import { getState } from '../baileys'

export const qrRouter = Router()

// GET /qr — retorna QR Code como imagem base64 (data URL) ou 204 se já conectado
qrRouter.get('/', async (_req, res) => {
  const { qrCode, connectionState } = getState()

  if (connectionState === 'connected') {
    res.status(204).end()
    return
  }

  if (!qrCode) {
    res.status(202).json({ status: connectionState, qr: null })
    return
  }

  try {
    const dataUrl = await QRCode.toDataURL(qrCode, { width: 300, margin: 2 })
    res.json({ status: connectionState, qr: dataUrl })
  } catch {
    res.status(500).json({ error: 'Erro ao gerar imagem do QR Code' })
  }
})
