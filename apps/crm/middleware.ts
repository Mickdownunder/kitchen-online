import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PORTAL_COOKIE_PREFIX = 'sb-portal'

/**
 * Creates a Supabase client for CRM (default cookies)
 */
function createCrmClient(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options: _options }) =>
            response.cookies.set(name, value, _options)
          )
        },
      },
    }
  )
}

/**
 * Creates a Supabase client for Portal (separate cookies)
 */
function createPortalClient(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Only return portal-specific cookies
          return request.cookies.getAll().filter(c => c.name.startsWith(PORTAL_COOKIE_PREFIX))
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options: _options }) =>
            response.cookies.set(name, value, _options)
          )
        },
      },
      cookieOptions: {
        name: PORTAL_COOKIE_PREFIX,
      },
    }
  )
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Check env vars
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('[Middleware] Missing Supabase environment variables!')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // ============================================
  // PORTAL ROUTES (Customer Portal) - Separate cookies
  // ============================================
  const isPortalRoute = pathname.startsWith('/portal')
  const isPortalLoginRoute = pathname === '/portal/login'

  if (isPortalRoute) {
    let portalUser = null
    
    try {
      const portalSupabase = createPortalClient(request, response)
      const { data: { user } } = await portalSupabase.auth.getUser()
      portalUser = user
    } catch (error) {
      console.error('[Middleware] Portal auth error:', error)
    }

    // Portal login page is always accessible
    if (isPortalLoginRoute) {
      // If customer is already logged in, redirect to portal dashboard
      const userRole = portalUser?.app_metadata?.role
      if (portalUser && userRole === 'customer') {
        return NextResponse.redirect(new URL('/portal', request.url))
      }
      return response
    }

    // For all other portal routes, require customer session
    const userRole = portalUser?.app_metadata?.role
    if (!portalUser || userRole !== 'customer') {
      console.log('[Middleware] Portal access denied, redirecting to /portal/login')
      return NextResponse.redirect(new URL('/portal/login', request.url))
    }

    // Customer is authenticated, allow access
    return response
  }

  // ============================================
  // CRM ROUTES (Employee CRM) - Default cookies
  // ============================================
  const protectedRoutes = [
    '/dashboard',
    '/projects',
    '/customers',
    '/articles',
    '/calendar',
    '/complaints',
    '/tickets',
    '/payments',
    '/invoices',
    '/deliveries',
    '/statistics',
    '/accounting',
    '/settings',
    '/clear-data',
  ]
  const isRootRoute = pathname === '/'
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // Only check CRM auth for protected routes
  if (isProtectedRoute || isRootRoute) {
    let crmUser = null
    
    try {
      const crmSupabase = createCrmClient(request, response)
      const { data: { user } } = await crmSupabase.auth.getUser()
      crmUser = user
    } catch (error) {
      console.error('[Middleware] CRM auth error:', error)
    }

    // Redirect to login if accessing protected route without auth
    if (!crmUser) {
      console.log('[Middleware] Redirecting to /login')
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
