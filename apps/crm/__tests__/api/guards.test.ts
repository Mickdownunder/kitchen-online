/**
 * Integration tests for API route auth guards.
 *
 * Tests that unauthenticated/unauthorized requests are correctly rejected
 * at the route level. We import route handlers directly and call them with
 * constructed NextRequest objects, mocking the Supabase server clients.
 */

import { NextRequest, NextResponse } from 'next/server'

// ─── Mock wiring ──────────────────────────────────────────────────────

// Mock the server-side Supabase client used by employee routes
const mockAuthGetUser = jest.fn()
const mockRpc = jest.fn()
const mockFrom = jest.fn()

function createChainBuilder() {
  const builder: Record<string, jest.Mock> = {}
  const methods = [
    'select', 'insert', 'update', 'delete',
    'eq', 'neq', 'lt', 'lte', 'gt', 'gte',
    'like', 'ilike', 'is', 'in', 'or', 'not',
    'order', 'limit', 'range', 'filter',
    'single', 'maybeSingle',
  ]
  for (const m of methods) {
    builder[m] = jest.fn().mockReturnValue(builder)
  }
  // Terminal: return resolved promise
  builder.single = jest.fn().mockResolvedValue({ data: null, error: null })
  builder.then = jest.fn().mockImplementation(
    (resolve: (v: unknown) => void) => Promise.resolve({ data: null, error: null }).then(resolve),
  )
  return builder
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockImplementation(() =>
    Promise.resolve({
      auth: { getUser: mockAuthGetUser },
      rpc: mockRpc,
      from: mockFrom.mockImplementation(() => createChainBuilder()),
    }),
  ),
  createServiceClient: jest.fn().mockImplementation(() =>
    Promise.resolve({
      auth: { getUser: jest.fn() },
      from: mockFrom.mockImplementation(() => createChainBuilder()),
    }),
  ),
  getCurrentUser: jest.fn(),
}))

jest.mock('@/lib/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    api: jest.fn().mockReturnValue({
      start: jest.fn().mockReturnValue(0),
      end: jest.fn(),
      error: jest.fn(),
    }),
  },
}))

jest.mock('@/lib/utils/errorHandling', () => {
  const actual = jest.requireActual('@/lib/utils/errorHandling')
  return actual
})

// Mock requireCustomerSession for customer routes
const mockRequireCustomerSession = jest.fn()
jest.mock('@/lib/auth/requireCustomerSession', () => ({
  requireCustomerSession: (...args: unknown[]) => mockRequireCustomerSession(...args),
  isSessionError: (result: unknown) => result instanceof NextResponse,
}))

// Mock rate limiting to always allow
jest.mock('@/lib/middleware/rateLimit', () => ({
  rateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 99, resetTime: Date.now() + 60000 }),
  RateLimiter: jest.fn().mockImplementation(() => ({
    check: jest.fn().mockReturnValue({ allowed: true, remaining: 99, resetTime: 0 }),
  })),
}))

// Mock transitive dependencies used by cron route (email -> company -> client)
jest.mock('@/lib/supabase/client', () => ({
  supabase: { from: jest.fn(), auth: { getUser: jest.fn() } },
}))
jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: null,
  createInviteAndSendEmail: jest.fn(),
}))
jest.mock('@/lib/supabase/services/email', () => ({
  sendEmail: jest.fn(),
  sendDeliveryNoteEmail: jest.fn(),
  sendInvoiceEmail: jest.fn(),
}))
jest.mock('@/lib/supabase/services/company', () => ({
  getCompanySettings: jest.fn(),
  getCompanySettingsById: jest.fn(),
  getNextInvoiceNumber: jest.fn(),
  getNextOrderNumber: jest.fn(),
  getEmployees: jest.fn(),
}))
jest.mock('@/lib/supabase/services/audit', () => ({
  logAuditEvent: jest.fn(),
}))

// ─── Helpers ──────────────────────────────────────────────────────────

function makeRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'), options)
}

function setEmployeeAuth(user: Record<string, unknown> | null, error: unknown = null): void {
  mockAuthGetUser.mockResolvedValue({ data: { user }, error })
}

function setRpc(name: string, result: { data: unknown; error: unknown }): void {
  mockRpc.mockImplementation((rpcName: string) => {
    if (rpcName === name) return Promise.resolve(result)
    return Promise.resolve({ data: null, error: null })
  })
}

// ─── Test Suites ─────────────────────────────────────────────────────

beforeEach(() => {
  mockAuthGetUser.mockReset()
  mockRpc.mockReset()
  mockFrom.mockReset().mockImplementation(() => createChainBuilder())
  mockRequireCustomerSession.mockReset()
})

// =====================================================================
// Employee Auth: /api/tickets (GET) - role check only, no permission
// =====================================================================

describe('Employee Auth: GET /api/tickets', () => {
  let GET: (request: NextRequest) => Promise<NextResponse>

  beforeAll(async () => {
    const mod = await import('@/app/api/tickets/route')
    GET = mod.GET
  })

  it('returns 401 when no user (auth error)', async () => {
    setEmployeeAuth(null, { message: 'not authenticated' })

    const res = await GET(makeRequest('http://localhost/api/tickets'))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.success).toBe(false)
  })

  it('returns 401 when user has customer role', async () => {
    setEmployeeAuth({ id: 'u-1', app_metadata: { role: 'customer' } })

    const res = await GET(makeRequest('http://localhost/api/tickets'))

    expect(res.status).toBe(401)
  })

  it('returns 403 when user has no company membership', async () => {
    setEmployeeAuth({ id: 'u-1', app_metadata: { role: 'verkaeufer' } })
    // company_members query returns nothing
    const builder = createChainBuilder()
    builder.single = jest.fn().mockResolvedValue({ data: null, error: null })
    mockFrom.mockImplementation(() => builder)

    const res = await GET(makeRequest('http://localhost/api/tickets'))

    expect(res.status).toBe(403)
  })
})

// =====================================================================
// Employee Auth: DELETE /api/projects/delete - permission check
// =====================================================================

describe('Employee Auth: DELETE /api/projects/delete', () => {
  let DELETE: (request: NextRequest) => Promise<NextResponse>

  beforeAll(async () => {
    const mod = await import('@/app/api/projects/delete/route')
    DELETE = mod.DELETE
  })

  it('returns 401 when no user', async () => {
    setEmployeeAuth(null, { message: 'not authenticated' })

    const res = await DELETE(makeRequest('http://localhost/api/projects/delete?id=proj-1'))

    expect(res.status).toBe(401)
  })

  it('returns 400 when no id parameter', async () => {
    setEmployeeAuth({ id: 'u-1', app_metadata: {} })

    const res = await DELETE(makeRequest('http://localhost/api/projects/delete'))

    expect(res.status).toBe(400)
  })

  it('returns 403 when user has no company', async () => {
    setEmployeeAuth({ id: 'u-1', app_metadata: {} })
    mockRpc.mockResolvedValue({ data: null, error: null })

    const res = await DELETE(makeRequest('http://localhost/api/projects/delete?id=proj-1'))

    expect(res.status).toBe(403)
  })

  it('returns 403 when user lacks delete_projects permission', async () => {
    setEmployeeAuth({ id: 'u-1', app_metadata: {} })
    // First rpc call: get_current_company_id => success
    // Second rpc call: has_permission => false
    mockRpc
      .mockResolvedValueOnce({ data: 'company-1', error: null })
      .mockResolvedValueOnce({ data: false, error: null })

    const res = await DELETE(makeRequest('http://localhost/api/projects/delete?id=proj-1'))

    expect(res.status).toBe(403)
  })
})

// =====================================================================
// Customer Auth: GET /api/customer/project - requireCustomerSession
// =====================================================================

describe('Customer Auth: GET /api/customer/project', () => {
  let GET: (request: NextRequest) => Promise<NextResponse>

  beforeAll(async () => {
    const mod = await import('@/app/api/customer/project/route')
    GET = mod.GET
  })

  it('returns 401 when no Authorization header', async () => {
    mockRequireCustomerSession.mockResolvedValue(
      NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 }),
    )

    const res = await GET(makeRequest('http://localhost/api/customer/project'))

    expect(res.status).toBe(401)
  })

  it('returns 403 when token is valid but user is not a customer', async () => {
    mockRequireCustomerSession.mockResolvedValue(
      NextResponse.json({ success: false, error: 'INVALID_CUSTOMER_SESSION' }, { status: 403 }),
    )

    const res = await GET(
      makeRequest('http://localhost/api/customer/project', {
        headers: { Authorization: 'Bearer invalid-token' },
      }),
    )

    expect(res.status).toBe(403)
  })
})

// =====================================================================
// Customer Auth: POST /api/customer/tickets - requireCustomerSession
// =====================================================================

describe('Customer Auth: POST /api/customer/tickets', () => {
  let POST: (request: NextRequest) => Promise<NextResponse>

  beforeAll(async () => {
    const mod = await import('@/app/api/customer/tickets/route')
    POST = mod.POST
  })

  it('returns 401 when no session', async () => {
    mockRequireCustomerSession.mockResolvedValue(
      NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 }),
    )

    const res = await POST(
      makeRequest('http://localhost/api/customer/tickets', {
        method: 'POST',
        body: JSON.stringify({ subject: 'Test', message: 'Hello World' }),
      }),
    )

    expect(res.status).toBe(401)
  })
})

// =====================================================================
// Cron Auth: GET /api/cron/appointment-reminders - secret verification
// =====================================================================

describe('Cron Auth: GET /api/cron/appointment-reminders', () => {
  let GET: (request: NextRequest) => Promise<NextResponse>

  beforeAll(async () => {
    const mod = await import('@/app/api/cron/appointment-reminders/route')
    GET = mod.GET
  })

  it('returns 401 without cron secret', async () => {
    const res = await GET(makeRequest('http://localhost/api/cron/appointment-reminders'))

    expect(res.status).toBe(401)
  })

  it('returns 401 with wrong secret', async () => {
    const res = await GET(
      makeRequest('http://localhost/api/cron/appointment-reminders', {
        headers: { authorization: 'Bearer wrong-secret' },
      }),
    )

    expect(res.status).toBe(401)
  })
})
