import {
  isAbortError,
  getErrorMessage,
  toError,
  isApiError,
  handleApiError,
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
