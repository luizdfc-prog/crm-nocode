import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          },
        },
      },
    )

    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Prevent open redirect: only allow relative paths
      const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'

      // Novo usuário sem workspace → redireciona para onboarding
      if (safeNext === '/dashboard' && sessionData.user) {
        const { count } = await supabase
          .from('workspace_members')
          .select('id', { count: 'exact', head: true })
          .eq('profile_id', sessionData.user.id)

        if ((count ?? 0) === 0) {
          return NextResponse.redirect(new URL('/onboarding', origin))
        }
      }

      return NextResponse.redirect(new URL(safeNext, origin))
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', origin))
}
