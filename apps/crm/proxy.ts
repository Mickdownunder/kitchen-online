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

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const host = request.headers.get('host') || ''

  // Check if request is coming from portal subdomain
  const isPortalSubdomain = host.startsWith('portal.')

  // Check env vars
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('[Proxy] Missing Supabase environment variables!')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ============================================
  // PORTAL SUBDOMAIN HANDLING
  // ============================================
  if (
    isPortalSubdomain &&
    !pathname.startsWith('/portal') &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/_next')
  ) {
    const targetPath = `/portal${pathname === '/' ? '' : pathname}`

    if (pathname === '/') {
      return NextResponse.redirect(new URL(targetPath, request.url))
    }

    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = targetPath
    return NextResponse.rewrite(rewriteUrl)
  }

  // Add pathname header for layout detection
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)
  if (isPortalSubdomain) {
    requestHeaders.set('x-is-portal-subdomain', 'true')
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // ============================================
  // PORTAL ROUTES (Customer Portal) - Separate cookies
  // ============================================
  const isPortalRoute = pathname.startsWith('/portal')

  const publicPortalRoutes = [
    '/portal/login',
    '/portal/forgot-password',
    '/portal/reset-password',
    '/portal/setup-password',
  ]
  const isOrderSignRoute = pathname.match(/^\/portal\/auftrag\/[^/]+\/unterschreiben$/)
  const isPublicPortalRoute = publicPortalRoutes.includes(pathname) || isOrderSignRoute

  if (isPublicPortalRoute) {
    return response
  }

  if (isPortalRoute) {
    let portalUser = null

    try {
      const portalSupabase = createPortalClient(request, response)
      const {
        data: { user },
      } = await portalSupabase.auth.getUser()
      portalUser = user
    } catch (error) {
      console.warn('[Proxy] Portal auth error:', error)
    }

    const userRole = portalUser?.app_metadata?.role
    if (!portalUser || userRole !== 'customer') {
      return NextResponse.redirect(new URL('/portal/login', request.url))
    }

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
    '/orders',
    '/deliveries',
    '/statistics',
    '/accounting',
    '/settings',
  ]
  const isRootRoute = pathname === '/' && !isPortalSubdomain
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  if ((isProtectedRoute || isRootRoute) && !isPortalSubdomain) {
    let crmUser = null

    try {
      const crmSupabase = createCrmClient(request, response)
      const {
        data: { user },
      } = await crmSupabase.auth.getUser()
      crmUser = user
    } catch (error) {
      console.warn('[Proxy] CRM auth error:', error)
    }

    if (!crmUser) {
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
