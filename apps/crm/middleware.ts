import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { logger } from '@/lib/utils/logger'

export async function middleware(request: NextRequest) {
  // SECURITY: Fail Closed - If critical env vars are missing, abort the request
  // This prevents the app from running in an insecure state
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    logger.error('Missing Supabase environment variables - aborting request', {
      component: 'middleware',
      path: request.nextUrl.pathname,
    })
    // Fail Closed: Return 500 error instead of continuing with missing config
    return new NextResponse('Configuration Error: Missing required environment variables', {
      status: 500,
    })
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  let user = null

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
            response = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options: _options }) =>
              response.cookies.set(name, value, _options)
            )
          },
        },
      }
    )

    // Try to get user from session
    try {
      // Refresh the session first to ensure we have the latest
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError && sessionError.message !== 'Auth session missing!') {
        // Only log non-expected errors
        logger.warn(
          'Middleware session error',
          {
            component: 'middleware',
            path: request.nextUrl.pathname,
            errorMessage: sessionError.message,
          },
          sessionError as Error
        )
      }

      user = session?.user

      // If no session found, try getUser (validates token from Authorization header)
      if (!user) {
        const {
          data: { user: userData },
          error: getUserError,
        } = await supabase.auth.getUser()
        // Don't log "Auth session missing" errors - this is expected when not logged in
        if (getUserError && getUserError.message !== 'Auth session missing!') {
          logger.warn(
            'Middleware getUser error',
            {
              component: 'middleware',
              path: request.nextUrl.pathname,
              errorMessage: getUserError.message,
            },
            getUserError as Error
          )
        }
        if (!getUserError && userData) {
          user = userData
        }
      }
    } catch (error: unknown) {
      // Only log unexpected errors (not "Auth session missing")
      const errMessage = error instanceof Error ? error.message : ''
      if (errMessage !== 'Auth session missing!') {
        logger.error(
          'Middleware auth check failed',
          {
            component: 'middleware',
            path: request.nextUrl.pathname,
          },
          error as Error
        )
      }
      user = null
    }
  } catch (error) {
    // SECURITY: Fail Closed - If Supabase initialization fails, abort the request
    // This prevents the app from running without proper authentication
    logger.error(
      'Middleware Supabase initialization failed - aborting request',
      {
        component: 'middleware',
        path: request.nextUrl.pathname,
      },
      error as Error
    )
    return new NextResponse('Configuration Error: Authentication service unavailable', {
      status: 500,
    })
  }

  // Protected routes - ALL app routes require authentication
  const protectedRoutes = [
    '/dashboard',
    '/projects',
    '/customers',
    '/articles',
    '/calendar',
    '/complaints',
    '/payments',
    '/invoices',
    '/deliveries', // Lieferscheine
    '/statistics', // Statistiken
    '/accounting', // Buchhaltung
    '/settings', // Firmenstammdaten
    '/clear-data', // Daten löschen
  ]
  const isRootRoute = request.nextUrl.pathname === '/'
  const isProtectedRoute = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route))

  // Redirect to login if accessing protected route or root without auth
  if ((isProtectedRoute || isRootRoute) && !user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Note: Permission checks for specific routes (like /settings, /accounting)
  // are handled at the page/API level using requirePermission() helper

  // Don't redirect from login if user is logged in - let them stay on login page
  // The login form will handle the redirect after successful login
  // This prevents redirect loops

  // Security Headers
  // Note: HSTS disabled for local development - enable in production
  const isLocalhost =
    request.nextUrl.hostname === 'localhost' ||
    request.nextUrl.hostname === '127.0.0.1' ||
    request.nextUrl.hostname.startsWith('192.168.')
  const securityHeaders: Record<string, string> = {
    'X-DNS-Prefetch-Control': 'on',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    // Content Security Policy
    // SECURITY WARNING: 'unsafe-inline' and 'unsafe-eval' are XSS risks
    // TODO for Production: Implement Nonce-based CSP to remove unsafe-inline/unsafe-eval
    // Example: script-src 'self' 'nonce-{random}' instead of 'unsafe-inline' 'unsafe-eval'
    // This requires generating a nonce per request and injecting it into script/style tags
    // Note: upgrade-insecure-requests removed for local development compatibility
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.supabase.co https://*.googleapis.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: https: blob:",
      `connect-src 'self' http://${request.nextUrl.hostname}:* http://127.0.0.1:* https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://generativelanguage.googleapis.com https://fonts.googleapis.com`,
      "frame-src 'self' https://*.supabase.co",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ].join('; '),
  }

  // Add HSTS only for production (not localhost)
  if (!isLocalhost) {
    securityHeaders['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload'
  }

  // Apply security headers to response
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
