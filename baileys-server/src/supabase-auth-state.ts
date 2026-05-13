/**
 * Adaptador de autenticação do Baileys que persiste credenciais no Supabase.
 * Substitui useMultiFileAuthState (filesystem) para funcionar em ambientes
 * com disco efêmero como Railway, Fly.io, etc.
 *
 * Usa fetch direto (node-fetch / native fetch) em vez do SDK Supabase para
 * evitar o problema de WebSocket no Node.js 20 com @supabase/realtime-js.
 */

import {
  initAuthCreds,
  proto,
  type AuthenticationCreds,
  type AuthenticationState,
  type SignalDataTypeMap,
} from '@whiskeysockets/baileys'
import { BufferJSON } from '@whiskeysockets/baileys'

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const WORKSPACE_ID = process.env.WORKSPACE_ID || 'default'

function supabaseHeaders() {
  return {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Prefer': 'resolution=merge-duplicates',
  }
}

function restUrl(key: string) {
  const encoded = encodeURIComponent(key)
  return `${SUPABASE_URL}/rest/v1/baileys_auth?key=eq.${encoded}`
}

function upsertUrl() {
  return `${SUPABASE_URL}/rest/v1/baileys_auth`
}

function rowKey(id: string) {
  return `${WORKSPACE_ID}:${id}`
}

async function readData(id: string): Promise<unknown> {
  try {
    const res = await fetch(restUrl(rowKey(id)), {
      headers: supabaseHeaders(),
    })
    if (!res.ok) return null
    const rows = await res.json() as { value: string }[]
    if (!rows.length || !rows[0].value) return null
    return JSON.parse(rows[0].value, BufferJSON.reviver)
  } catch {
    return null
  }
}

async function writeData(id: string, value: unknown): Promise<void> {
  try {
    const serialized = JSON.stringify(value, BufferJSON.replacer)
    await fetch(upsertUrl(), {
      method: 'POST',
      headers: supabaseHeaders(),
      body: JSON.stringify({ key: rowKey(id), value: serialized, updated_at: new Date().toISOString() }),
    })
  } catch (err) {
    console.error('[SupabaseAuth] Erro ao salvar:', id, err)
  }
}

async function removeData(id: string): Promise<void> {
  try {
    await fetch(restUrl(rowKey(id)), {
      method: 'DELETE',
      headers: supabaseHeaders(),
    })
  } catch {
    // silencia
  }
}

// Lock distribuído via Supabase — impede que dois servidores conectem simultaneamente
// (ex: Railway rolling deploy sobe nova instância antes de matar a anterior)
const LOCK_KEY_PREFIX = 'lock:'
const LOCK_TTL_MS = 45_000 // 45s — tempo máximo que um lock sem heartbeat é considerado válido

function lockKey() {
  return `${WORKSPACE_ID}:${LOCK_KEY_PREFIX}connection`
}

export async function acquireConnectionLock(): Promise<boolean> {
  try {
    const now = Date.now()
    // Lê o lock existente
    const res = await fetch(restUrl(lockKey()), { headers: supabaseHeaders() })
    if (res.ok) {
      const rows = await res.json() as { value: string }[]
      if (rows.length > 0 && rows[0].value) {
        const existing = JSON.parse(rows[0].value) as { ts: number }
        if (now - existing.ts < LOCK_TTL_MS) {
          console.log(`[SupabaseAuth] Lock ativo encontrado (${Math.round((now - existing.ts) / 1000)}s atrás) — outra instância em execução`)
          return false
        }
        console.log(`[SupabaseAuth] Lock expirado (${Math.round((now - existing.ts) / 1000)}s atrás) — assumindo controle`)
      }
    }
    // Grava o lock com timestamp atual
    await fetch(upsertUrl(), {
      method: 'POST',
      headers: supabaseHeaders(),
      body: JSON.stringify({ key: lockKey(), value: JSON.stringify({ ts: now }), updated_at: new Date().toISOString() }),
    })
    console.log('[SupabaseAuth] Lock de conexão adquirido')
    return true
  } catch (err) {
    // Em caso de erro no Supabase, permite conectar (fail-open)
    console.warn('[SupabaseAuth] Erro ao verificar lock — conectando mesmo assim:', err)
    return true
  }
}

export async function renewConnectionLock(): Promise<void> {
  try {
    await fetch(upsertUrl(), {
      method: 'POST',
      headers: supabaseHeaders(),
      body: JSON.stringify({ key: lockKey(), value: JSON.stringify({ ts: Date.now() }), updated_at: new Date().toISOString() }),
    })
  } catch {
    // silencia — heartbeat falhou, lock vai expirar naturalmente
  }
}

export async function releaseConnectionLock(): Promise<void> {
  try {
    await fetch(restUrl(lockKey()), { method: 'DELETE', headers: supabaseHeaders() })
    console.log('[SupabaseAuth] Lock de conexão liberado')
  } catch {
    // silencia
  }
}

export async function clearAuthState(): Promise<void> {
  try {
    // Remove todas as chaves deste workspace do Supabase
    await fetch(
      `${SUPABASE_URL}/rest/v1/baileys_auth?key=like.${encodeURIComponent(WORKSPACE_ID + ':%')}`,
      { method: 'DELETE', headers: supabaseHeaders() },
    )
    console.log('[SupabaseAuth] Sessão limpa com sucesso')
  } catch (err) {
    console.error('[SupabaseAuth] Erro ao limpar sessão:', err)
  }
}

// Remove apenas as session keys do Signal Protocol (session-*, pre-key-*, sender-key-*, etc.)
// mantendo as creds intactas — evita exigir novo QR Code após MessageCounterError.
export async function clearSessionKeys(): Promise<void> {
  const SESSION_PREFIXES = ['session-', 'pre-key-', 'sender-key-', 'app-state-sync-key-', 'app-state-sync-version-']
  try {
    await Promise.all(
      SESSION_PREFIXES.map((prefix) =>
        fetch(
          `${SUPABASE_URL}/rest/v1/baileys_auth?key=like.${encodeURIComponent(WORKSPACE_ID + ':' + prefix + '%')}`,
          { method: 'DELETE', headers: supabaseHeaders() },
        ).catch((err) => console.error(`[SupabaseAuth] Erro ao limpar ${prefix}:`, err)),
      ),
    )
    console.log('[SupabaseAuth] Session keys limpas com sucesso')
  } catch (err) {
    console.error('[SupabaseAuth] Erro ao limpar session keys:', err)
  }
}

export async function useSupabaseAuthState(): Promise<{
  state: AuthenticationState
  saveCreds: () => Promise<void>
}> {
  const storedCreds = await readData('creds')
  const creds: AuthenticationCreds = (storedCreds as AuthenticationCreds) ?? initAuthCreds()

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data: { [_: string]: SignalDataTypeMap[typeof type] } = {}
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`)
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value)
              }
              data[id] = value as SignalDataTypeMap[typeof type]
            }),
          )
          return data
        },
        set: async (data) => {
          const tasks: Promise<void>[] = []
          for (const category of Object.keys(data) as (keyof SignalDataTypeMap)[]) {
            for (const id of Object.keys(data[category]!)) {
              const value = (data[category] as Record<string, unknown>)[id]
              tasks.push(value ? writeData(`${category}-${id}`, value) : removeData(`${category}-${id}`))
            }
          }
          await Promise.all(tasks)
        },
      },
    },
    saveCreds: () => writeData('creds', creds),
  }
}
