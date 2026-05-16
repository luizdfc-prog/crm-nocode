import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/signup', '/invite', '/auth', '/', '/admin/login', '/leadloop', '/z4pcrm', '/c']
const PROTECTED_PREFIXES = ['/dashboard', '/leads', '/pipeline', '/activities', '/settings', '/onboarding', '/conversations']
const ADMIN_PREFIX = '/admin'

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

  // Usuário autenticado em rota protegida (exceto onboarding) sem workspace → força onboarding
  if (user && isProtected(pathname) && pathname !== '/onboarding') {
    const { count } = await supabase
      .from('workspace_members')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', user.id)

    if ((count ?? 0) === 0) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  }

  // Rotas /admin (exceto /admin/login) — exige sessão + e-mail @engenharia.app
  if (pathname.startsWith(ADMIN_PREFIX) && pathname !== '/admin/login') {
    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    const email = user.email ?? ''
    if (!email.endsWith('@engenharia.app')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
