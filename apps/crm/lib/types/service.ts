import type { Database } from '@/types/database.types'

// ─────────────────────────────────────────────────────
// Service Result Pattern
// ─────────────────────────────────────────────────────

/**
 * Discriminated union for service-layer return values.
 *
 * Services NEVER throw. Every function returns `ServiceResult<T>`.
 * API routes map the result to an HTTP response.
 *
 * @example
 * ```ts
 * const result = await getCustomer(id)
 * if (!result.ok) {
 *   return apiErrors[result.code === 'NOT_FOUND' ? 'notFound' : 'internal'](
 *     result.error instanceof Error ? result.error : undefined,
 *   )
 * }
 * return NextResponse.json(result.data)
 * ```
 */
export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ServiceErrorCode; message: string; cause?: unknown }

export type ServiceErrorCode =
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'INTERNAL'

/** Convenience constructors so services don't build the object by hand. */
export function ok<T>(data: T): ServiceResult<T> {
  return { ok: true, data }
}

export function fail<T = never>(
  code: ServiceErrorCode,
  message: string,
  cause?: unknown,
): ServiceResult<T> {
  return { ok: false, code, message, cause }
}

// ─────────────────────────────────────────────────────
// Database type aliases
// ─────────────────────────────────────────────────────

/** Shorthand for a table's Row type (what SELECT returns). */
export type Row<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

/** Shorthand for a table's Insert type (what INSERT accepts). */
export type Insert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

/** Shorthand for a table's Update type (what UPDATE accepts). */
export type Update<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
