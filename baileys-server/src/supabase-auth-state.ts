/**
 * Adaptador de autenticação do Baileys que persiste credenciais no Supabase.
 * Substitui useMultiFileAuthState (filesystem) para funcionar em ambientes
 * com disco efêmero como Railway, Fly.io, etc.
 */

import { createClient } from '@supabase/supabase-js'
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

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios')
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
    realtime: { timeout: 0 } as never,
  })
}

// Chave única por workspace para isolar sessões
function rowKey(id: string) {
  return `${WORKSPACE_ID}:${id}`
}

async function readData(id: string): Promise<unknown> {
  try {
    const supabase = getSupabase()
    const { data } = await supabase
      .from('baileys_auth')
      .select('value')
      .eq('key', rowKey(id))
      .maybeSingle()
    if (!data?.value) return null
    return JSON.parse(data.value, BufferJSON.reviver)
  } catch {
    return null
  }
}

async function writeData(id: string, value: unknown): Promise<void> {
  try {
    const supabase = getSupabase()
    const serialized = JSON.stringify(value, BufferJSON.replacer)
    await supabase
      .from('baileys_auth')
      .upsert({ key: rowKey(id), value: serialized, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  } catch (err) {
    console.error('[SupabaseAuth] Erro ao salvar:', id, err)
  }
}

async function removeData(id: string): Promise<void> {
  try {
    const supabase = getSupabase()
    await supabase.from('baileys_auth').delete().eq('key', rowKey(id))
  } catch {
    // silencia
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
