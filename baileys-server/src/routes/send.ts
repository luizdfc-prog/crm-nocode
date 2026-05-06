import { Router } from 'express'
import { getState } from '../baileys'

export const sendRouter = Router()

interface SendTextBody {
  to: string
  text: string
}

interface SendMediaBody {
  to: string
  type: 'image' | 'audio' | 'document' | 'video'
  url: string
  caption?: string
  filename?: string
  mimetype?: string
}

// POST /send/text — envia mensagem de texto
sendRouter.post('/text', async (req, res) => {
  const { to, text } = req.body as SendTextBody

  if (!to || !text) {
    res.status(400).json({ error: 'Campos "to" e "text" são obrigatórios' })
    return
  }

  const { socket, connectionState } = getState()

  if (connectionState !== 'connected' || !socket) {
    res.status(503).json({ error: 'WhatsApp não conectado', status: connectionState })
    return
  }

  try {
    const jid = formatJid(to)
    await socket.sendMessage(jid, { text })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao enviar mensagem', detail: String(err) })
  }
})

// POST /send/media — envia mídia (imagem, áudio, documento, vídeo)
sendRouter.post('/media', async (req, res) => {
  const { to, type, url, caption, filename, mimetype } = req.body as SendMediaBody

  if (!to || !type || !url) {
    res.status(400).json({ error: 'Campos "to", "type" e "url" são obrigatórios' })
    return
  }

  const { socket, connectionState } = getState()

  if (connectionState !== 'connected' || !socket) {
    res.status(503).json({ error: 'WhatsApp não conectado', status: connectionState })
    return
  }

  try {
    const jid = formatJid(to)

    const messageContent = buildMediaContent(type, url, caption, filename, mimetype)
    await socket.sendMessage(jid, messageContent)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao enviar mídia', detail: String(err) })
  }
})

function formatJid(phone: string): string {
  // Se já é um JID completo (contém @), usa direto — preserva @lid, @g.us, etc.
  if (phone.includes('@')) return phone
  // Senão, assume número de telefone e adiciona sufixo padrão
  const digits = phone.replace(/\D/g, '')
  return `${digits}@s.whatsapp.net`
}

function buildMediaContent(
  type: string,
  url: string,
  caption?: string,
  filename?: string,
  mimetype?: string,
) {
  switch (type) {
    case 'image':
      return { image: { url }, caption }
    case 'audio':
      return { audio: { url }, mimetype: mimetype ?? 'audio/ogg; codecs=opus', ptt: true }
    case 'document':
      return {
        document: { url },
        mimetype: mimetype ?? 'application/octet-stream',
        fileName: filename ?? 'arquivo',
        caption,
      }
    case 'video':
      return { video: { url }, caption }
    default:
      throw new Error(`Tipo de mídia inválido: ${type}`)
  }
}
