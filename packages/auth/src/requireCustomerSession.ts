import { createSupabaseAdmin } from './supabase'
import type { CustomerSessionClaims } from '@kitchen/shared-types'

export interface CustomerSession {
  project_id: string
  customer_id: string
  user_id: string
}

export interface SessionError {
  success: false
  error: string
  status: number
}

/**
 * Validiert eine Customer Session aus dem Authorization Header
 * 
 * @param authHeader - Der Authorization Header (Bearer <token>)
 * @returns CustomerSession oder SessionError
 * 
 * @example
 * ```ts
 * const session = await requireCustomerSession(request.headers.get('Authorization'))
 * if ('error' in session) {
 *   return NextResponse.json(session, { status: session.status })
 * }
 * const { project_id, customer_id } = session
 * ```
 */
export async function requireCustomerSession(
  authHeader: string | null
): Promise<CustomerSession | SessionError> {
  // 1. Header prüfen
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      success: false,
      error: 'UNAUTHORIZED',
      status: 401,
    }
  }

  const token = authHeader.substring(7)

  // 2. Token validieren
  const supabase = createSupabaseAdmin()
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return {
      success: false,
      error: 'INVALID_SESSION',
      status: 401,
    }
  }

  // 3. Claims extrahieren
  const claims = user.app_metadata as Partial<CustomerSessionClaims>
  const project_id = claims?.project_id
  const customer_id = claims?.customer_id
  const role = claims?.role

  // 4. Customer-Rolle prüfen
  if (!project_id || !customer_id || role !== 'customer') {
    return {
      success: false,
      error: 'INVALID_CUSTOMER_SESSION',
      status: 403,
    }
  }

  return {
    project_id,
    customer_id,
    user_id: user.id,
  }
}

/**
 * Type Guard um zu prüfen ob es ein Fehler ist
 */
export function isSessionError(
  result: CustomerSession | SessionError
): result is SessionError {
  return 'error' in result
}
