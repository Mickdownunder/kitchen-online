import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

/**
 * Portal-specific Supabase client with separate cookie storage.
 * This prevents session conflicts between CRM (employee) and Portal (customer).
 */
export const portalSupabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookieOptions: {
    name: 'sb-portal', // Different cookie prefix than CRM
  },
})
