import 'dotenv/config'
import express from 'express'
import { createBaileysConnection } from './baileys'
import { qrRouter } from './routes/qr'
import { statusRouter } from './routes/status'
import { sendRouter } from './routes/send'

const app = express()
app.use(express.json({ limit: '50mb' }))

const PORT = process.env.PORT || 3001
const API_SECRET = process.env.BAILEYS_API_SECRET || ''

// Validação de secret em todas as rotas (exceto healthcheck)
app.use((req, res, next) => {
  if (req.path === '/health') return next()
  const auth = req.headers['x-api-secret']
  if (!API_SECRET || auth !== API_SECRET) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
})

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/qr', qrRouter)
app.use('/status', statusRouter)
app.use('/send', sendRouter)

app.listen(PORT, async () => {
  console.log(`Baileys server running on port ${PORT}`)
  await createBaileysConnection()
})
