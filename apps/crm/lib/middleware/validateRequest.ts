import { NextRequest, NextResponse } from 'next/server'
import { ZodError, ZodSchema } from 'zod'
import { logger } from '@/lib/utils/logger'

/**
 * Middleware for validating request bodies with Zod schemas
 */

export interface ValidationOptions {
  schema: ZodSchema
  onError?: (error: ZodError) => NextResponse
}

/**
 * Validates request body against a Zod schema
 * Returns parsed data or throws error response
 */
export async function validateRequest<T>(
  request: NextRequest,
  schema: ZodSchema<T>,
  options?: {
    onError?: (error: ZodError) => NextResponse
  }
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  try {
    const body = await request.json()
    const data = schema.parse(body)
    return { data, error: null }
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn('Request validation failed', {
        component: 'validateRequest',
        path: request.nextUrl.pathname,
        errors: error.issues,
      })

      if (options?.onError) {
        return { data: null, error: options.onError(error) }
      }

      return {
        data: null,
        error: NextResponse.json(
          {
            error: 'Validierungsfehler',
            details: error.issues.map(e => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        ),
      }
    }

    // Non-Zod errors (e.g., JSON parse errors)
    logger.error(
      'Request validation error (non-Zod)',
      {
        component: 'validateRequest',
        path: request.nextUrl.pathname,
      },
      error as Error
    )

    return {
      data: null,
      error: NextResponse.json(
        { error: 'Ungültige Anfrage', details: 'Request body konnte nicht geparst werden' },
        { status: 400 }
      ),
    }
  }
}

/**
 * Validates query parameters against a Zod schema
 */
export function validateQuery<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): { data: T; error: null } | { data: null; error: NextResponse } {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams.entries())
    const data = schema.parse(params)
    return { data, error: null }
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn('Query validation failed', {
        component: 'validateQuery',
        path: request.nextUrl.pathname,
        errors: error.issues,
      })

      return {
        data: null,
        error: NextResponse.json(
          {
            error: 'Validierungsfehler',
            details: error.issues.map(e => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        ),
      }
    }

    return {
      data: null,
      error: NextResponse.json({ error: 'Ungültige Query-Parameter' }, { status: 400 }),
    }
  }
}

/**
 * Sanitizes string input to prevent XSS attacks
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return ''

  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers like onclick=
    .trim()
}

/**
 * Sanitizes object recursively
 */
export function sanitizeObject<T>(obj: T): T {
  if (typeof obj === 'string') {
    return sanitizeString(obj) as unknown as T
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject) as unknown as T
  }

  if (obj && typeof obj === 'object') {
    const sanitized = {} as T
    for (const [key, value] of Object.entries(obj)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(sanitized as Record<string, any>)[key] = sanitizeObject(value)
    }
    return sanitized
  }

  return obj
}
