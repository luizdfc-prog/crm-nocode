import 'dotenv/config'
import express from 'express'
import https from 'https'
import http from 'http'
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
  startFollowUpCron()
})

function startFollowUpCron() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const cronSecret = process.env.CRON_SECRET
  if (!appUrl || !cronSecret) {
    console.warn('[cron] NEXT_PUBLIC_APP_URL ou CRON_SECRET não configurado — follow-up cron desativado')
    return
  }

  const INTERVAL_MS = 30 * 60 * 1000 // 30 minutos

  function runFollowUp() {
    const url = new URL('/api/cron/followup', appUrl)
    const lib = url.protocol === 'https:' ? https : http
    const req = lib.request(
      { hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80), path: url.pathname, method: 'GET', headers: { Authorization: `Bearer ${cronSecret}` } },
      (res) => { console.log(`[cron] followup → ${res.statusCode}`) }
    )
    req.on('error', (err) => console.error('[cron] followup error:', err.message))
    req.end()
  }

  setInterval(runFollowUp, INTERVAL_MS)
  console.log('[cron] follow-up cron iniciado — intervalo: 30 minutos')
}
