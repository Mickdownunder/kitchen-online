/**
 * Integration tests for Zod validation in API routes.
 *
 * Tests both the central `validateRequest` middleware and inline Zod schemas
 * used by specific routes (inviteUserSchema, sendEmailSchema, etc.).
 */

import { NextRequest } from 'next/server'

jest.mock('@/lib/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}))

import { validateRequest, validateQuery, sanitizeString, sanitizeObject } from '@/lib/middleware/validateRequest'
import { inviteUserSchema } from '@/lib/validations/users'
import { sendEmailSchema } from '@/lib/validations/email'

// ─── Helpers ──────────────────────────────────────────────────────────

function makeJsonRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeQueryRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/test')
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  return new NextRequest(url)
}

// =====================================================================
// validateRequest middleware
// =====================================================================

describe('validateRequest', () => {
  it('returns parsed data for valid body', async () => {
    const req = makeJsonRequest({ email: 'test@example.com', role: 'verkaeufer' })
    const result = await validateRequest(req, inviteUserSchema)

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ email: 'test@example.com', role: 'verkaeufer' })
  })

  it('returns 400 error for invalid body', async () => {
    const req = makeJsonRequest({ email: 'not-an-email', role: 'verkaeufer' })
    const result = await validateRequest(req, inviteUserSchema)

    expect(result.data).toBeNull()
    expect(result.error).not.toBeNull()

    const res = result.error!
    expect(res.status).toBe(400)

    const body = await res.json()
    expect(body.error).toBe('Validierungsfehler')
    expect(body.details).toBeDefined()
    expect(body.details.length).toBeGreaterThan(0)
  })

  it('returns 400 for empty body (non-JSON)', async () => {
    const req = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      body: 'not json',
    })
    const result = await validateRequest(req, inviteUserSchema)

    expect(result.data).toBeNull()
    expect(result.error).not.toBeNull()
    expect(result.error!.status).toBe(400)
  })

  it('returns 400 for missing required fields', async () => {
    const req = makeJsonRequest({ email: 'test@example.com' }) // missing 'role'
    const result = await validateRequest(req, inviteUserSchema)

    expect(result.data).toBeNull()
    expect(result.error!.status).toBe(400)

    const body = await result.error!.json()
    expect(body.details.some((d: { path: string }) => d.path === 'role')).toBe(true)
  })

  it('returns 400 for invalid enum value', async () => {
    const req = makeJsonRequest({ email: 'test@example.com', role: 'superadmin' })
    const result = await validateRequest(req, inviteUserSchema)

    expect(result.data).toBeNull()
    expect(result.error!.status).toBe(400)
  })
})

// =====================================================================
// validateQuery
// =====================================================================

describe('validateQuery', () => {
  const { z } = require('zod')
  const querySchema = z.object({
    page: z.string().regex(/^\d+$/),
    status: z.enum(['open', 'closed']).optional(),
  })

  it('returns parsed data for valid query params', () => {
    const req = makeQueryRequest({ page: '1', status: 'open' })
    const result = validateQuery(req, querySchema)

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ page: '1', status: 'open' })
  })

  it('returns 400 for invalid query params', () => {
    const req = makeQueryRequest({ page: 'abc' })
    const result = validateQuery(req, querySchema)

    expect(result.data).toBeNull()
    expect(result.error!.status).toBe(400)
  })

  it('returns 400 for missing required params', () => {
    const req = makeQueryRequest({}) // missing 'page'
    const result = validateQuery(req, querySchema)

    expect(result.data).toBeNull()
    expect(result.error!.status).toBe(400)
  })
})

// =====================================================================
// inviteUserSchema (used by /api/users/invite)
// =====================================================================

describe('inviteUserSchema', () => {
  it('accepts valid email + role', () => {
    const result = inviteUserSchema.safeParse({ email: 'admin@baleah.at', role: 'geschaeftsfuehrer' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = inviteUserSchema.safeParse({ email: 'not-email', role: 'verkaeufer' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid role', () => {
    const result = inviteUserSchema.safeParse({ email: 'test@test.com', role: 'root' })
    expect(result.success).toBe(false)
  })

  it('rejects empty email', () => {
    const result = inviteUserSchema.safeParse({ email: '', role: 'verkaeufer' })
    expect(result.success).toBe(false)
  })

  it('accepts all valid roles', () => {
    const validRoles = ['geschaeftsfuehrer', 'administration', 'buchhaltung', 'verkaeufer', 'monteur']
    for (const role of validRoles) {
      const result = inviteUserSchema.safeParse({ email: 'test@test.com', role })
      expect(result.success).toBe(true)
    }
  })
})

// =====================================================================
// sendEmailSchema (used by /api/email/send)
// =====================================================================

describe('sendEmailSchema', () => {
  it('accepts valid single recipient', () => {
    const result = sendEmailSchema.safeParse({
      to: 'user@example.com',
      subject: 'Test Subject',
      html: '<p>Hello</p>',
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid array of recipients', () => {
    const result = sendEmailSchema.safeParse({
      to: ['a@example.com', 'b@example.com'],
      subject: 'Test',
      text: 'Hello',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty subject', () => {
    const result = sendEmailSchema.safeParse({
      to: 'user@example.com',
      subject: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects too long subject (>200 chars)', () => {
    const result = sendEmailSchema.safeParse({
      to: 'user@example.com',
      subject: 'A'.repeat(201),
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email in to field', () => {
    const result = sendEmailSchema.safeParse({
      to: 'not-an-email',
      subject: 'Test',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty recipients array', () => {
    const result = sendEmailSchema.safeParse({
      to: [],
      subject: 'Test',
    })
    expect(result.success).toBe(false)
  })

  it('rejects more than 10 recipients', () => {
    const result = sendEmailSchema.safeParse({
      to: Array.from({ length: 11 }, (_, i) => `user${i}@example.com`),
      subject: 'Test',
    })
    expect(result.success).toBe(false)
  })
})

// =====================================================================
// Inline Zod schemas (CreateTicketSchema, CodeLoginSchema)
// =====================================================================

describe('Inline schemas: Customer ticket creation', () => {
  const { z } = require('zod')

  // Mirrored from /api/customer/tickets/route.ts
  const CreateTicketSchema = z.object({
    subject: z.string().min(3).max(200),
    message: z.string().min(10).max(5000),
    projectId: z.string().uuid().optional(),
  })

  it('accepts valid ticket', () => {
    const result = CreateTicketSchema.safeParse({
      subject: 'Problem mit Lieferung',
      message: 'Die Lieferung wurde nicht geliefert. Bitte prüfen.',
    })
    expect(result.success).toBe(true)
  })

  it('rejects short subject (< 3 chars)', () => {
    const result = CreateTicketSchema.safeParse({
      subject: 'Hi',
      message: 'This is a valid message that is long enough.',
    })
    expect(result.success).toBe(false)
  })

  it('rejects short message (< 10 chars)', () => {
    const result = CreateTicketSchema.safeParse({
      subject: 'Test Subject',
      message: 'Short',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid projectId (not UUID)', () => {
    const result = CreateTicketSchema.safeParse({
      subject: 'Test Subject',
      message: 'Long enough message for validation test.',
      projectId: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid UUID projectId', () => {
    const result = CreateTicketSchema.safeParse({
      subject: 'Test Subject',
      message: 'Long enough message for validation test.',
      projectId: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })
})

describe('Inline schemas: Customer auth login', () => {
  const { z } = require('zod')

  const CodeLoginSchema = z.object({
    accessCode: z.string().min(6).max(20),
    email: z.undefined().optional(),
    password: z.undefined().optional(),
  })

  const EmailLoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    accessCode: z.undefined().optional(),
  })

  it('CodeLoginSchema: accepts valid access code', () => {
    const result = CodeLoginSchema.safeParse({ accessCode: 'ABC123DEF' })
    expect(result.success).toBe(true)
  })

  it('CodeLoginSchema: rejects short code (< 6 chars)', () => {
    const result = CodeLoginSchema.safeParse({ accessCode: 'ABC' })
    expect(result.success).toBe(false)
  })

  it('CodeLoginSchema: rejects when email is also provided', () => {
    const result = CodeLoginSchema.safeParse({
      accessCode: 'ABC123',
      email: 'test@test.com',
    })
    expect(result.success).toBe(false)
  })

  it('EmailLoginSchema: accepts valid email + password', () => {
    const result = EmailLoginSchema.safeParse({
      email: 'test@example.com',
      password: 'secret123',
    })
    expect(result.success).toBe(true)
  })

  it('EmailLoginSchema: rejects short password (< 6 chars)', () => {
    const result = EmailLoginSchema.safeParse({
      email: 'test@example.com',
      password: '12345',
    })
    expect(result.success).toBe(false)
  })

  it('EmailLoginSchema: rejects invalid email', () => {
    const result = EmailLoginSchema.safeParse({
      email: 'not-email',
      password: 'secret123',
    })
    expect(result.success).toBe(false)
  })

  it('EmailLoginSchema: rejects when accessCode is also provided', () => {
    const result = EmailLoginSchema.safeParse({
      email: 'test@example.com',
      password: 'secret123',
      accessCode: 'ABC123',
    })
    expect(result.success).toBe(false)
  })
})

// =====================================================================
// sanitizeString / sanitizeObject
// =====================================================================

describe('sanitizeString', () => {
  it('removes < and > characters', () => {
    expect(sanitizeString('<script>alert(1)</script>')).toBe('scriptalert(1)/script')
  })

  it('removes javascript: protocol', () => {
    expect(sanitizeString('javascript:alert(1)')).toBe('alert(1)')
  })

  it('removes event handlers', () => {
    expect(sanitizeString('onclick=alert(1)')).toBe('alert(1)')
    expect(sanitizeString('onload=malicious()')).toBe('malicious()')
  })

  it('trims whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello')
  })

  it('returns empty for non-string input', () => {
    expect(sanitizeString(42 as unknown as string)).toBe('')
  })
})

describe('sanitizeObject', () => {
  it('sanitizes all string values in an object', () => {
    const result = sanitizeObject({
      name: '<script>test</script>',
      age: 25,
      nested: { value: 'javascript:alert(1)' },
    })

    expect(result.name).toBe('scripttest/script')
    expect(result.age).toBe(25)
    expect(result.nested.value).toBe('alert(1)')
  })

  it('sanitizes arrays', () => {
    const result = sanitizeObject(['<b>bold</b>', 'normal'])
    expect(result[0]).toBe('bbold/b')
    expect(result[1]).toBe('normal')
  })

  it('returns primitives unchanged', () => {
    expect(sanitizeObject(42)).toBe(42)
    expect(sanitizeObject(null)).toBeNull()
    expect(sanitizeObject(true)).toBe(true)
  })
})
