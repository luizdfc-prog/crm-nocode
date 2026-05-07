import { createClient } from "@supabase/supabase-js"

// Cliente com service role — sem tipagem do banco para permitir tabelas não geradas (usage_logs, etc.)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getServiceClient() {
  return createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
