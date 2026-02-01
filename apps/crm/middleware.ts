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
  const host = request.headers.get('host') || ''
  
  // Check if request is coming from portal subdomain
  const isPortalSubdomain = host.startsWith('portal.')
  
  // Check env vars
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('[Middleware] Missing Supabase environment variables!')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ============================================
  // PORTAL SUBDOMAIN HANDLING
  // ============================================
  // When on portal subdomain, redirect/rewrite to /portal/...
  if (isPortalSubdomain && !pathname.startsWith('/portal') && !pathname.startsWith('/api') && !pathname.startsWith('/_next')) {
    const targetPath = `/portal${pathname === '/' ? '' : pathname}`
    
    // For root path, use redirect (more reliable on mobile Safari)
    if (pathname === '/') {
      console.log(`[Middleware] Portal subdomain redirect: ${pathname} -> ${targetPath}`)
      return NextResponse.redirect(new URL(targetPath, request.url))
    }
    
    // For other paths, use rewrite
    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = targetPath
    console.log(`[Middleware] Portal subdomain rewrite: ${pathname} -> ${rewriteUrl.pathname}`)
    return NextResponse.rewrite(rewriteUrl)
  }

  // Add pathname header for layout detection
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)
  // Add portal subdomain header for components to detect
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
  // Portal route if: path starts with /portal OR request is from portal subdomain
  const isPortalRoute = pathname.startsWith('/portal')
  
  // Public portal routes (no auth required)
  const publicPortalRoutes = [
    '/portal/login',
    '/portal/forgot-password',
    '/portal/reset-password',
    '/portal/setup-password',
  ]
  const isPublicPortalRoute = publicPortalRoutes.includes(pathname)

  if (isPortalRoute) {
    let portalUser = null
    
    try {
      const portalSupabase = createPortalClient(request, response)
      const { data: { user } } = await portalSupabase.auth.getUser()
      portalUser = user
    } catch (error) {
      console.error('[Middleware] Portal auth error:', error)
    }

    // Public portal pages are always accessible
    if (isPublicPortalRoute) {
      // If customer is already logged in and on login page, redirect to portal dashboard
      const userRole = portalUser?.app_metadata?.role
      if (portalUser && userRole === 'customer' && pathname === '/portal/login') {
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
  // Root route on CRM domain should redirect to CRM login, but NOT on portal subdomain
  const isRootRoute = pathname === '/' && !isPortalSubdomain
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // Only check CRM auth for protected routes (and not on portal subdomain)
  if ((isProtectedRoute || isRootRoute) && !isPortalSubdomain) {
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
