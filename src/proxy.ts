// ─────────────────────────────────────────────────────────────────────────────
// Next.js 16 Proxy — route protection and session refresh
// (Replaces the deprecated middleware.ts convention)
// ─────────────────────────────────────────────────────────────────────────────
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Public routes — no auth required
const PUBLIC_ROUTES = [
  '/',
  '/upload',
  '/resources',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/about',
  '/contact',
  '/unauthorized',
]

// Admin-only route prefix
const ADMIN_PREFIX = '/admin'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return supabaseResponse
  }

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // IMPORTANT: always call getUser() to refresh session tokens
    const { data: { user } } = await supabase.auth.getUser()

    const path = request.nextUrl.pathname

  // Allow public routes
  if (PUBLIC_ROUTES.some((r) => path === r || path.startsWith(r + '/'))) {
    return supabaseResponse
  }

  // Not authenticated → redirect to login
  if (!user) {
    return NextResponse.redirect(
      new URL(`/login?redirect=${encodeURIComponent(path)}`, request.url)
    )
  }

  // Admin routes — check role in user_profiles
  if (path.startsWith(ADMIN_PREFIX)) {
    const { data: profileRaw } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const profile = profileRaw as { role?: string } | null
    if (!profile || (profile.role !== 'super_admin' && profile.role !== 'department_admin')) {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

    return supabaseResponse
  } catch (err) {
    console.error('Proxy error:', err)
    return supabaseResponse
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
