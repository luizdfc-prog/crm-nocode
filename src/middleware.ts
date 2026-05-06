import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/signup', '/invite', '/auth', '/']
const PROTECTED_PREFIXES = ['/dashboard', '/leads', '/pipeline', '/activities', '/settings', '/onboarding']

function isPublic(pathname: string) {
  return PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))
}

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((r) => pathname === r || pathname.startsWith(r + '/'))
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refresh da sessão — mantém o token atualizado
  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Usuário logado tentando acessar página de auth → redireciona
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Rota protegida sem sessão → redireciona para login
  if (!user && isProtected(pathname)) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
