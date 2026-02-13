/**
 * Zentrale Error-Handling Utilities
 *
 * Standardisierte Fehlerbehandlung für die gesamte Anwendung
 */

import { NextResponse } from 'next/server'
import { logger } from './logger'

// ============================================
// SICHERE API ERROR RESPONSES
// ============================================

/**
 * Mapping von internen Error-Codes zu sicheren Benutzer-Nachrichten
 * NIEMALS interne Fehlerdetails an den Client senden!
 */
const SAFE_ERROR_MESSAGES: Record<string, string> = {
  INTERNAL_ERROR: 'Ein interner Fehler ist aufgetreten',
  VALIDATION_ERROR: 'Ungültige Eingabedaten',
  NOT_FOUND: 'Ressource nicht gefunden',
  UNAUTHORIZED: 'Nicht authentifiziert',
  FORBIDDEN: 'Keine Berechtigung',
  RATE_LIMITED: 'Zu viele Anfragen. Bitte warten.',
  SERVICE_UNAVAILABLE: 'Dienst vorübergehend nicht verfügbar',
  BAD_REQUEST: 'Ungültige Anfrage',
  MIGRATION_REQUIRED:
    'Voice-Funktion: Datenbank-Aktualisierung fehlt. Bitte Migration 20260213130000 (Voice Capture) auf der Datenbank ausführen.',
}

interface ApiErrorOptions {
  /** HTTP Status Code */
  status: number
  /** Error Code für Frontend-Handling */
  code: string
  /** Kontext für Server-seitiges Logging */
  logContext?: Record<string, unknown>
  /** Original-Error für Logging (wird NICHT an Client gesendet) */
  originalError?: Error
}

/**
 * Erstellt eine sichere API Error Response
 * - Loggt vollständige Fehlerdetails server-seitig
 * - Sendet nur sichere, generische Nachrichten an den Client
 */
export function apiError(options: ApiErrorOptions): NextResponse {
  const { status, code, logContext, originalError } = options

  // Server-seitig mit vollständigen Details loggen
  if (originalError) {
    logger.error(`API Error: ${code}`, {
      ...logContext,
      errorCode: code,
      httpStatus: status,
      errorMessage: originalError.message,
      errorStack: originalError.stack,
    }, originalError)
  }

  // Sichere Nachricht für Client
  const message = SAFE_ERROR_MESSAGES[code] || SAFE_ERROR_MESSAGES.INTERNAL_ERROR

  return NextResponse.json(
    {
      error: message,
      code, // Code für Frontend-Handling
    },
    { status }
  )
}

/**
 * Convenience-Funktionen für häufige Error-Typen
 */
export const apiErrors = {
  unauthorized: (ctx?: Record<string, unknown>) =>
    apiError({ status: 401, code: 'UNAUTHORIZED', logContext: ctx }),

  forbidden: (ctx?: Record<string, unknown>) =>
    apiError({ status: 403, code: 'FORBIDDEN', logContext: ctx }),

  notFound: (ctx?: Record<string, unknown>) =>
    apiError({ status: 404, code: 'NOT_FOUND', logContext: ctx }),

  validation: (ctx?: Record<string, unknown>) =>
    apiError({ status: 400, code: 'VALIDATION_ERROR', logContext: ctx }),

  badRequest: (ctx?: Record<string, unknown>) =>
    apiError({ status: 400, code: 'BAD_REQUEST', logContext: ctx }),

  internal: (error: Error, ctx?: Record<string, unknown>) =>
    apiError({ status: 500, code: 'INTERNAL_ERROR', logContext: ctx, originalError: error }),

  migrationRequired: (ctx?: Record<string, unknown>) =>
    apiError({ status: 503, code: 'MIGRATION_REQUIRED', logContext: ctx }),

  rateLimit: (resetTime?: number) =>
    NextResponse.json(
      {
        error: SAFE_ERROR_MESSAGES.RATE_LIMITED,
        code: 'RATE_LIMITED',
        ...(resetTime && { resetTime }),
      },
      {
        status: 429,
        headers: resetTime
          ? { 'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString() }
          : {},
      }
    ),
}

// ============================================
// BESTEHENDE ERROR UTILITIES
// ============================================

/**
 * Prüft ob ein Error ein Abort-Error ist
 * Diese treten bei Navigation oder Request-Abbruch auf und sollten ignoriert werden
 */
export const isAbortError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false
  return error.message.includes('aborted') || error.name === 'AbortError'
}

/**
 * Context für Error-Logging
 */
export interface ErrorContext {
  /** Komponenten-Name */
  component: string
  /** Aktion die fehlgeschlagen ist */
  action: string
  /** Zusätzliche Metadaten */
  metadata?: Record<string, unknown>
}

/**
 * Standard Error-Handler für Service-Calls
 * Ignoriert Abort-Errors, loggt alle anderen
 *
 * @param error - Der aufgetretene Fehler
 * @param context - Kontext für das Logging
 */
export const handleServiceError = (error: unknown, context: ErrorContext): void => {
  if (isAbortError(error)) return

  logger.error(`${context.action} failed`, {
    component: context.component,
    action: context.action,
    ...context.metadata,
  }, error as Error)
}

/**
 * Wrapper für async Funktionen mit automatischem Error-Handling
 *
 * @param fn - Die auszuführende async Funktion
 * @param context - Kontext für das Logging
 * @param fallback - Optionaler Fallback-Wert bei Fehler
 * @returns Das Ergebnis oder den Fallback-Wert
 *
 * @example
 * const data = await withErrorHandling(
 *   () => fetchData(),
 *   { component: 'MyComponent', action: 'fetchData' },
 *   []
 * )
 */
export const withErrorHandling = async <T>(
  fn: () => Promise<T>,
  context: ErrorContext,
  fallback?: T
): Promise<T | undefined> => {
  try {
    return await fn()
  } catch (error) {
    handleServiceError(error, context)
    return fallback
  }
}

/**
 * Extrahiert eine lesbare Fehlermeldung aus einem Error
 *
 * @param error - Der Fehler (kann alles sein)
 * @param defaultMessage - Standard-Nachricht falls keine extrahiert werden kann
 * @returns Lesbare Fehlermeldung
 */
export const getErrorMessage = (
  error: unknown,
  defaultMessage = 'Ein unbekannter Fehler ist aufgetreten'
): string => {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return defaultMessage
}

/**
 * Erstellt eine Error-Instanz aus einem unbekannten Fehler
 * Nützlich für konsistentes Error-Handling
 */
export const toError = (error: unknown): Error => {
  if (error instanceof Error) return error
  return new Error(getErrorMessage(error))
}

/**
 * Type Guard für API-Fehler mit Status-Code
 */
export interface ApiError {
  status: number
  message: string
  code?: string
}

export const isApiError = (error: unknown): error is ApiError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'message' in error &&
    typeof (error as ApiError).status === 'number' &&
    typeof (error as ApiError).message === 'string'
  )
}

/**
 * Behandelt API-Fehler und gibt eine benutzerfreundliche Nachricht zurück
 */
export const handleApiError = (error: unknown): string => {
  if (isApiError(error)) {
    switch (error.status) {
      case 400:
        return error.message || 'Ungültige Anfrage'
      case 401:
        return 'Nicht autorisiert. Bitte erneut anmelden.'
      case 403:
        return 'Keine Berechtigung für diese Aktion'
      case 404:
        return 'Ressource nicht gefunden'
      case 409:
        return error.message || 'Konflikt beim Speichern'
      case 422:
        return error.message || 'Ungültige Daten'
      case 429:
        return 'Zu viele Anfragen. Bitte warten.'
      case 500:
        return 'Serverfehler. Bitte später erneut versuchen.'
      default:
        return error.message || 'Ein Fehler ist aufgetreten'
    }
  }
  return getErrorMessage(error)
}
