import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const PORTAL_COOKIE_PREFIX = 'sb-portal'

/**
 * Portal-specific Supabase server client.
 * Uses separate cookies from the CRM to prevent session conflicts.
 */
export async function createPortalClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Get all cookies but filter/map to portal-specific ones
          return cookieStore.getAll().filter(cookie => 
            cookie.name.startsWith(PORTAL_COOKIE_PREFIX)
          )
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
          }
        },
      },
      cookieOptions: {
        name: PORTAL_COOKIE_PREFIX,
      },
    }
  )
}

// Helper to get current portal user (customer) in server components
export async function getPortalUser() {
  const supabase = await createPortalClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
