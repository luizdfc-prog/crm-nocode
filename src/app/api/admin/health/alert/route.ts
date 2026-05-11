"use server"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const ADMIN_EMAIL = "engenharia.ia26@gmail.com"

export interface AlertPayload {
  type: "railway_down" | "ai_silent" | "forward_errors" | "reconnects"
  detail: string
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email?.endsWith("@engenharia.app")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { type, detail } = await req.json() as AlertPayload

  const subjects: Record<AlertPayload["type"], string> = {
    railway_down: "🔴 Z4P — Servidor Baileys (Railway) fora do ar",
    ai_silent: "🟡 Z4P — Agente IA parou de responder",
    forward_errors: "🟠 Z4P — Erros ao encaminhar mensagens para o Z4P",
    reconnects: "🟡 Z4P — Reconexões frequentes no Baileys",
  }

  const descriptions: Record<AlertPayload["type"], string> = {
    railway_down: "O servidor Baileys no Railway não está respondendo. O WhatsApp e o agente IA estão <strong>offline</strong>.",
    ai_silent: "O agente IA está ativo mas não enviou nenhuma resposta nos últimos 30 minutos, mesmo com mensagens recebidas.",
    forward_errors: "O servidor Baileys está recebendo mensagens mas falhando ao encaminhá-las para o Z4P.",
    reconnects: "O servidor Baileys reconectou muitas vezes recentemente, indicando instabilidade na sessão WhatsApp.",
  }

  const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })

  await resend.emails.send({
    from: "Z4P Monitor <monitor@engenharia.app>",
    to: ADMIN_EMAIL,
    subject: subjects[type],
    html: `
      <div style="font-family: 'DM Sans', sans-serif; max-width: 560px; margin: 0 auto; background: #0C0C0E; color: #E8E8E8; border-radius: 12px; overflow: hidden; border: 1px solid #2A2A2E;">
        <div style="background: #141416; padding: 24px 28px; border-bottom: 1px solid #2A2A2E;">
          <p style="margin: 0; font-size: 11px; color: #555559; text-transform: uppercase; letter-spacing: 2px;">Z4P CRM · EngenharIA</p>
          <h1 style="margin: 8px 0 0; font-size: 20px; color: #E8E8E8;">${subjects[type]}</h1>
        </div>
        <div style="padding: 24px 28px;">
          <p style="margin: 0 0 16px; color: #8A8A8F; line-height: 1.6;">${descriptions[type]}</p>
          <div style="background: #141416; border: 1px solid #2A2A2E; border-radius: 8px; padding: 14px 16px; font-family: monospace; font-size: 12px; color: #CAFF33; margin-bottom: 20px; white-space: pre-wrap; word-break: break-all;">${detail}</div>
          <a href="https://engenharia.app/admin" style="display: inline-block; background: #CAFF33; color: #0C0C0E; font-weight: 700; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px;">Ver painel admin →</a>
          <a href="https://railway.app" style="display: inline-block; margin-left: 10px; color: #5B7FFF; font-size: 13px; text-decoration: none;">Ver Railway →</a>
        </div>
        <div style="padding: 14px 28px; border-top: 1px solid #2A2A2E; background: #0C0C0E;">
          <p style="margin: 0; font-size: 11px; color: #555559;">Detectado em: ${now} (horário de Brasília)</p>
        </div>
      </div>
    `,
  })

  return NextResponse.json({ ok: true })
}
