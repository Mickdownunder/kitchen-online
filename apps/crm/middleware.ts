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
  const isPortalRoute = pathname.startsWith('/portal') || isPortalSubdomain
  
  // Public portal routes (no auth required)
  // When on portal subdomain, paths are /login instead of /portal/login
  const publicPortalPaths = ['/login', '/forgot-password', '/reset-password', '/setup-password']
  const publicPortalRoutes = [
    '/portal/login',
    '/portal/forgot-password',
    '/portal/reset-password',
    '/portal/setup-password',
  ]
  const isPublicPortalRoute = publicPortalRoutes.includes(pathname) || 
    (isPortalSubdomain && publicPortalPaths.includes(pathname))

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
      const isOnLoginPage = pathname === '/portal/login' || (isPortalSubdomain && pathname === '/login')
      if (portalUser && userRole === 'customer' && isOnLoginPage) {
        // On portal subdomain, redirect to / (which maps to /portal)
        const redirectPath = isPortalSubdomain ? '/' : '/portal'
        return NextResponse.redirect(new URL(redirectPath, request.url))
      }
      return response
    }

    // For all other portal routes, require customer session
    const userRole = portalUser?.app_metadata?.role
    if (!portalUser || userRole !== 'customer') {
      // On portal subdomain, redirect to /login (which maps to /portal/login)
      const loginPath = isPortalSubdomain ? '/login' : '/portal/login'
      console.log(`[Middleware] Portal access denied, redirecting to ${loginPath}`)
      return NextResponse.redirect(new URL(loginPath, request.url))
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
