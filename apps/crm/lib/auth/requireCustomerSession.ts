import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

/**
 * Validated customer session data.
 */
export interface CustomerSession {
  /** UUID of the customer record in the `customers` table. */
  customer_id: string
  /** UUID of the Supabase Auth user backing this customer session. */
  user_id: string
  /** Pre-configured service-role Supabase client (bypasses RLS). */
  supabase: SupabaseClient<Database>
}

/**
 * Extracts and validates a customer session from the Authorization header.
 *
 * Returns either a `CustomerSession` on success or a ready-to-return
 * `NextResponse` (401 / 403) on failure.
 *
 * Usage:
 * ```ts
 * const result = await requireCustomerSession(request)
 * if (result instanceof NextResponse) return result
 * const { customer_id, supabase } = result
 * ```
 */
export async function requireCustomerSession(
  request: NextRequest,
): Promise<CustomerSession | NextResponse> {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, error: 'UNAUTHORIZED' },
      { status: 401 },
    )
  }

  const token = authHeader.substring(7)
  const supabase = await createServiceClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)

  if (error || !user) {
    return NextResponse.json(
      { success: false, error: 'INVALID_SESSION' },
      { status: 401 },
    )
  }

  const customer_id = user.app_metadata?.customer_id as string | undefined
  const role = user.app_metadata?.role as string | undefined

  if (!customer_id || role !== 'customer') {
    return NextResponse.json(
      { success: false, error: 'INVALID_CUSTOMER_SESSION' },
      { status: 403 },
    )
  }

  return { customer_id, user_id: user.id, supabase }
}

/**
 * Type guard: returns `true` when `requireCustomerSession` produced an error response.
 */
export function isSessionError(
  result: CustomerSession | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse
}
