jest.mock('@/lib/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}))

import {
  isAbortError,
  getErrorMessage,
  toError,
  isApiError,
  handleApiError,
  apiError,
  apiErrors,
} from '@/lib/utils/errorHandling'

// ---------------------------------------------------------------------------
// isAbortError
// ---------------------------------------------------------------------------
describe('isAbortError', () => {
  it('returns true for Error with name "AbortError"', () => {
    const err = new Error('request aborted')
    err.name = 'AbortError'
    expect(isAbortError(err)).toBe(true)
  })

  it('returns true for Error with "aborted" in message', () => {
    expect(isAbortError(new Error('The operation was aborted'))).toBe(true)
  })

  it('returns false for a normal Error', () => {
    expect(isAbortError(new Error('Something went wrong'))).toBe(false)
  })

  it('returns false for non-Error values', () => {
    expect(isAbortError('aborted')).toBe(false)
    expect(isAbortError(null)).toBe(false)
    expect(isAbortError(undefined)).toBe(false)
    expect(isAbortError(42)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// getErrorMessage
// ---------------------------------------------------------------------------
describe('getErrorMessage', () => {
  it('extracts message from Error instance', () => {
    expect(getErrorMessage(new Error('test error'))).toBe('test error')
  })

  it('returns string errors as-is', () => {
    expect(getErrorMessage('string error')).toBe('string error')
  })

  it('extracts message from plain object with message property', () => {
    expect(getErrorMessage({ message: 'obj error' })).toBe('obj error')
  })

  it('returns default message for unknown types', () => {
    expect(getErrorMessage(42)).toBe('Ein unbekannter Fehler ist aufgetreten')
    expect(getErrorMessage(null)).toBe('Ein unbekannter Fehler ist aufgetreten')
  })

  it('accepts custom default message', () => {
    expect(getErrorMessage(42, 'Custom fallback')).toBe('Custom fallback')
  })
})

// ---------------------------------------------------------------------------
// toError
// ---------------------------------------------------------------------------
describe('toError', () => {
  it('returns Error instances unchanged', () => {
    const err = new Error('original')
    expect(toError(err)).toBe(err)
  })

  it('wraps string in Error', () => {
    const err = toError('string error')
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toBe('string error')
  })

  it('wraps objects with message in Error', () => {
    const err = toError({ message: 'from object' })
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toBe('from object')
  })

  it('wraps unknown types in Error with default message', () => {
    const err = toError(42)
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toBe('Ein unbekannter Fehler ist aufgetreten')
  })
})

// ---------------------------------------------------------------------------
// isApiError
// ---------------------------------------------------------------------------
describe('isApiError', () => {
  it('returns true for valid ApiError shape', () => {
    expect(isApiError({ status: 404, message: 'Not Found' })).toBe(true)
  })

  it('returns true when code is present', () => {
    expect(isApiError({ status: 400, message: 'Bad Request', code: 'VALIDATION' })).toBe(true)
  })

  it('returns false when status is missing', () => {
    expect(isApiError({ message: 'no status' })).toBe(false)
  })

  it('returns false when message is missing', () => {
    expect(isApiError({ status: 404 })).toBe(false)
  })

  it('returns false for non-object values', () => {
    expect(isApiError(null)).toBe(false)
    expect(isApiError('string')).toBe(false)
    expect(isApiError(42)).toBe(false)
  })

  it('returns false when status is not a number', () => {
    expect(isApiError({ status: '404', message: 'Not Found' })).toBe(false)
  })

  it('returns false when message is not a string', () => {
    expect(isApiError({ status: 404, message: 42 })).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// handleApiError
// ---------------------------------------------------------------------------
describe('handleApiError', () => {
  it('returns specific message for 401', () => {
    expect(handleApiError({ status: 401, message: '' })).toBe('Nicht autorisiert. Bitte erneut anmelden.')
  })

  it('returns specific message for 403', () => {
    expect(handleApiError({ status: 403, message: '' })).toBe('Keine Berechtigung für diese Aktion')
  })

  it('returns specific message for 404', () => {
    expect(handleApiError({ status: 404, message: '' })).toBe('Ressource nicht gefunden')
  })

  it('returns specific message for 429', () => {
    expect(handleApiError({ status: 429, message: '' })).toBe('Zu viele Anfragen. Bitte warten.')
  })

  it('returns specific message for 500', () => {
    expect(handleApiError({ status: 500, message: '' })).toBe('Serverfehler. Bitte später erneut versuchen.')
  })

  it('uses error.message for 400 when present', () => {
    expect(handleApiError({ status: 400, message: 'Invalid email' })).toBe('Invalid email')
  })

  it('falls back to default for 400 without message', () => {
    expect(handleApiError({ status: 400, message: '' })).toBe('Ungültige Anfrage')
  })

  it('uses getErrorMessage for non-ApiError values', () => {
    expect(handleApiError(new Error('generic'))).toBe('generic')
    expect(handleApiError('plain string')).toBe('plain string')
  })
})

// ---------------------------------------------------------------------------
// apiError
// ---------------------------------------------------------------------------
describe('apiError', () => {
  it('returns NextResponse with status and code', () => {
    const res = apiError({ status: 403, code: 'FORBIDDEN' })
    expect(res.status).toBe(403)
  })

  it('includes safe message from SAFE_ERROR_MESSAGES', async () => {
    const res = apiError({ status: 401, code: 'UNAUTHORIZED' })
    const body = await res.json()
    expect(body.error).toBe('Nicht authentifiziert')
    expect(body.code).toBe('UNAUTHORIZED')
  })

  it('falls back to INTERNAL_ERROR for unknown codes', async () => {
    const res = apiError({ status: 500, code: 'UNKNOWN_CODE' })
    const body = await res.json()
    expect(body.error).toBe('Ein interner Fehler ist aufgetreten')
  })

  it('includes originalError in logContext when provided', () => {
    const err = new Error('DB failed')
    const res = apiError({ status: 500, code: 'INTERNAL_ERROR', originalError: err })
    expect(res.status).toBe(500)
  })
})

// ---------------------------------------------------------------------------
// apiErrors
// ---------------------------------------------------------------------------
describe('apiErrors', () => {
  it('unauthorized returns 401', async () => {
    const res = apiErrors.unauthorized()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.code).toBe('UNAUTHORIZED')
  })

  it('forbidden returns 403', async () => {
    const res = apiErrors.forbidden()
    expect(res.status).toBe(403)
    expect((await res.json()).code).toBe('FORBIDDEN')
  })

  it('notFound returns 404', async () => {
    const res = apiErrors.notFound()
    expect(res.status).toBe(404)
    expect((await res.json()).code).toBe('NOT_FOUND')
  })

  it('validation returns 400', async () => {
    const res = apiErrors.validation()
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('VALIDATION_ERROR')
  })

  it('badRequest returns 400', async () => {
    const res = apiErrors.badRequest()
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('BAD_REQUEST')
  })

  it('internal returns 500 with originalError', async () => {
    const res = apiErrors.internal(new Error('DB error'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.code).toBe('INTERNAL_ERROR')
  })

  it('rateLimit returns 429 with Retry-After when resetTime provided', async () => {
    const resetTime = Date.now() + 60000
    const res = apiErrors.rateLimit(resetTime)
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBeDefined()
    const body = await res.json()
    expect(body.code).toBe('RATE_LIMITED')
    expect(body.resetTime).toBe(resetTime)
  })

  it('rateLimit returns 429 without Retry-After when no resetTime', async () => {
    const res = apiErrors.rateLimit()
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.code).toBe('RATE_LIMITED')
  })
})
