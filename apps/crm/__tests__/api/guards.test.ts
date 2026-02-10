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

const mockGetCompanyIdForUser = jest.fn()

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
  getCompanyIdForUser: (...args: unknown[]) => mockGetCompanyIdForUser(...args),
  getCompanySettings: jest.fn(),
  getCompanySettingsById: jest.fn(),
  getNextInvoiceNumber: jest.fn(),
  getNextOrderNumber: jest.fn(),
  getEmployees: jest.fn(),
}))
jest.mock('@/lib/supabase/services/audit', () => ({
  logAuditEvent: jest.fn(),
}))
jest.mock('@/lib/supabase/services/projects', () => ({
  getProject: jest.fn(),
}))
jest.mock('@/lib/supabase/services/invoices', () => ({
  getInvoice: jest.fn(),
  updateInvoice: jest.fn(),
  getInvoices: jest.fn(),
  getInvoicesWithProject: jest.fn(),
}))
jest.mock('@/lib/utils/emailTemplates', () => ({
  reminderTemplate: jest.fn(),
}))
jest.mock('@/hooks/useInvoiceCalculations', () => ({
  calculateOverdueDays: jest.fn(),
  canSendReminder: jest.fn(),
}))
jest.mock('@/lib/pdf/pdfGenerator', () => ({
  generatePDF: jest.fn(),
}))
jest.mock('@/lib/email-templates/portal-access', () => ({
  portalAccessTemplate: jest.fn(),
}))
jest.mock('@/lib/middleware/validateRequest', () => {
  const actual = jest.requireActual('@/lib/middleware/validateRequest')
  return actual
})

// ─── Helpers ──────────────────────────────────────────────────────────

function makeRequest(url: string, options?: RequestInit): NextRequest {
  // Strip `signal: null` which global RequestInit allows but Next.js does not
  const { signal, ...rest } = options ?? {}
  return new NextRequest(new URL(url, 'http://localhost'), {
    ...rest,
    ...(signal ? { signal } : {}),
  })
}

function setEmployeeAuth(user: Record<string, unknown> | null, error: unknown = null): void {
  mockAuthGetUser.mockResolvedValue({ data: { user }, error })
}

// ─── Test Suites ─────────────────────────────────────────────────────

beforeEach(() => {
  mockAuthGetUser.mockReset()
  mockRpc.mockReset()
  mockFrom.mockReset().mockImplementation(() => createChainBuilder())
  mockRequireCustomerSession.mockReset()
  mockGetCompanyIdForUser.mockReset()
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
    mockGetCompanyIdForUser.mockResolvedValue(null)

    const res = await GET(makeRequest('http://localhost/api/tickets'))
    const body = await res.json()

    if (res.status !== 403) {
      console.warn('Unexpected response:', res.status, body)
    }
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

// =====================================================================
// Employee Auth: GET /api/tickets/[id] - auth + company check
// =====================================================================

describe('Employee Auth: GET /api/tickets/[id]', () => {
  let GET: (request: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<NextResponse>

  beforeAll(async () => {
    const mod = await import('@/app/api/tickets/[id]/route')
    GET = mod.GET
  })

  const ctx = { params: Promise.resolve({ id: 'ticket-1' }) }

  it('returns 401 when no user', async () => {
    setEmployeeAuth(null, { message: 'not authenticated' })

    const res = await GET(makeRequest('http://localhost/api/tickets/ticket-1'), ctx)

    expect(res.status).toBe(401)
  })

  it('returns 401 when user has customer role', async () => {
    setEmployeeAuth({ id: 'u-1', app_metadata: { role: 'customer' } })

    const res = await GET(makeRequest('http://localhost/api/tickets/ticket-1'), ctx)

    expect(res.status).toBe(401)
  })

  it('returns 403 when user has no company', async () => {
    setEmployeeAuth({ id: 'u-1', app_metadata: { role: 'verkaeufer' } })
    mockGetCompanyIdForUser.mockResolvedValue(null)

    const res = await GET(makeRequest('http://localhost/api/tickets/ticket-1'), ctx)

    expect(res.status).toBe(403)
  })
})

// =====================================================================
// Employee Auth: POST /api/tickets/[id] - reply auth + company check
// =====================================================================

describe('Employee Auth: POST /api/tickets/[id]', () => {
  let POST: (request: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<NextResponse>

  beforeAll(async () => {
    const mod = await import('@/app/api/tickets/[id]/route')
    POST = mod.POST
  })

  const ctx = { params: Promise.resolve({ id: 'ticket-1' }) }

  it('returns 401 when no user', async () => {
    setEmployeeAuth(null, { message: 'not authenticated' })

    const res = await POST(
      makeRequest('http://localhost/api/tickets/ticket-1', {
        method: 'POST',
        body: JSON.stringify({ message: 'Hello' }),
      }),
      ctx,
    )

    expect(res.status).toBe(401)
  })

  it('returns 401 when user is customer', async () => {
    setEmployeeAuth({ id: 'u-1', app_metadata: { role: 'customer' } })

    const res = await POST(
      makeRequest('http://localhost/api/tickets/ticket-1', {
        method: 'POST',
        body: JSON.stringify({ message: 'Hello' }),
      }),
      ctx,
    )

    expect(res.status).toBe(401)
  })

  it('returns 403 when user has no company', async () => {
    setEmployeeAuth({ id: 'u-1', app_metadata: { role: 'verkaeufer' } })
    mockGetCompanyIdForUser.mockResolvedValue(null)

    const res = await POST(
      makeRequest('http://localhost/api/tickets/ticket-1', {
        method: 'POST',
        body: JSON.stringify({ message: 'Hello' }),
      }),
      ctx,
    )

    expect(res.status).toBe(403)
  })

  it('returns 400 when message is empty', async () => {
    setEmployeeAuth({ id: 'u-1', app_metadata: { role: 'verkaeufer' } })

    const res = await POST(
      makeRequest('http://localhost/api/tickets/ticket-1', {
        method: 'POST',
        body: JSON.stringify({ message: '' }),
      }),
      ctx,
    )

    expect(res.status).toBe(400)
  })
})

// =====================================================================
// Employee Auth: PATCH /api/tickets/[id] - status update auth
// =====================================================================

describe('Employee Auth: PATCH /api/tickets/[id]', () => {
  let PATCH: (request: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<NextResponse>

  beforeAll(async () => {
    const mod = await import('@/app/api/tickets/[id]/route')
    PATCH = mod.PATCH
  })

  const ctx = { params: Promise.resolve({ id: 'ticket-1' }) }

  it('returns 401 when no user', async () => {
    setEmployeeAuth(null, { message: 'not authenticated' })

    const res = await PATCH(
      makeRequest('http://localhost/api/tickets/ticket-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'GESCHLOSSEN' }),
      }),
      ctx,
    )

    expect(res.status).toBe(401)
  })

  it('returns 403 when user has no company', async () => {
    setEmployeeAuth({ id: 'u-1', app_metadata: { role: 'verkaeufer' } })
    mockGetCompanyIdForUser.mockResolvedValue(null)

    const res = await PATCH(
      makeRequest('http://localhost/api/tickets/ticket-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'GESCHLOSSEN' }),
      }),
      ctx,
    )

    expect(res.status).toBe(403)
  })

  it('returns 400 when status is invalid', async () => {
    setEmployeeAuth({ id: 'u-1', app_metadata: { role: 'verkaeufer' } })

    const res = await PATCH(
      makeRequest('http://localhost/api/tickets/ticket-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'INVALID_STATUS' }),
      }),
      ctx,
    )

    expect(res.status).toBe(400)
  })
})

// =====================================================================
// Employee Auth: POST /api/users/invite - auth + permission
// =====================================================================

describe('Employee Auth: POST /api/users/invite', () => {
  let POST: (request: NextRequest) => Promise<NextResponse>

  beforeAll(async () => {
    const mod = await import('@/app/api/users/invite/route')
    POST = mod.POST
  })

  it('returns 401 when no user', async () => {
    setEmployeeAuth(null, { message: 'not authenticated' })

    const res = await POST(
      makeRequest('http://localhost/api/users/invite', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@test.de', role: 'verkaeufer' }),
      }),
    )

    expect(res.status).toBe(401)
  })

  it('returns 403 when user cannot manage users', async () => {
    setEmployeeAuth({ id: 'u-1', app_metadata: {} })
    // can_manage_users returns false
    mockRpc.mockResolvedValue({ data: false, error: null })

    const res = await POST(
      makeRequest('http://localhost/api/users/invite', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@test.de', role: 'verkaeufer' }),
      }),
    )

    expect(res.status).toBe(403)
  })

  it('returns 403 when no company assigned', async () => {
    setEmployeeAuth({ id: 'u-1', app_metadata: {} })
    // can_manage_users returns true, get_current_company_id returns null
    mockRpc
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: null, error: null })

    const res = await POST(
      makeRequest('http://localhost/api/users/invite', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@test.de', role: 'verkaeufer' }),
      }),
    )

    expect(res.status).toBe(403)
  })
})

// =====================================================================
// Employee Auth: POST /api/projects/send-portal-access - auth + role
// =====================================================================

describe('Employee Auth: POST /api/projects/send-portal-access', () => {
  let POST: (request: NextRequest) => Promise<NextResponse>

  beforeAll(async () => {
    const mod = await import('@/app/api/projects/send-portal-access/route')
    POST = mod.POST
  })

  it('returns 401 when no user', async () => {
    setEmployeeAuth(null, { message: 'not authenticated' })

    const res = await POST(
      makeRequest('http://localhost/api/projects/send-portal-access', {
        method: 'POST',
        body: JSON.stringify({ projectId: 'proj-1' }),
      }),
    )

    expect(res.status).toBe(401)
  })

  it('returns 403 when user is a customer', async () => {
    setEmployeeAuth({ id: 'u-1', app_metadata: { role: 'customer' } })

    const res = await POST(
      makeRequest('http://localhost/api/projects/send-portal-access', {
        method: 'POST',
        body: JSON.stringify({ projectId: 'proj-1' }),
      }),
    )

    expect(res.status).toBe(403)
  })
})

// =====================================================================
// Employee Auth: POST /api/reminders/send - auth + company + permission
// =====================================================================

describe('Employee Auth: POST /api/reminders/send', () => {
  let POST: (request: NextRequest) => Promise<NextResponse>

  beforeAll(async () => {
    const mod = await import('@/app/api/reminders/send/route')
    POST = mod.POST
  })

  it('returns 401 when no user', async () => {
    setEmployeeAuth(null, { message: 'not authenticated' })

    const res = await POST(
      makeRequest('http://localhost/api/reminders/send', {
        method: 'POST',
        body: JSON.stringify({ projectId: 'p-1', invoiceId: 'i-1', reminderType: 'first' }),
      }),
    )

    expect(res.status).toBe(401)
  })

  it('returns 403 when no company assigned', async () => {
    setEmployeeAuth({ id: 'u-1', app_metadata: {} })
    // get_current_company_id returns null
    mockRpc.mockResolvedValue({ data: null, error: null })

    const res = await POST(
      makeRequest('http://localhost/api/reminders/send', {
        method: 'POST',
        body: JSON.stringify({ projectId: 'p-1', invoiceId: 'i-1', reminderType: 'first' }),
      }),
    )

    expect(res.status).toBe(403)
  })

  it('returns 403 when user lacks mark_payments permission', async () => {
    setEmployeeAuth({ id: 'u-1', app_metadata: {} })
    // get_current_company_id returns OK, has_permission returns false
    mockRpc
      .mockResolvedValueOnce({ data: 'company-1', error: null })
      .mockResolvedValueOnce({ data: false, error: null })

    const res = await POST(
      makeRequest('http://localhost/api/reminders/send', {
        method: 'POST',
        body: JSON.stringify({ projectId: 'p-1', invoiceId: 'i-1', reminderType: 'first' }),
      }),
    )

    expect(res.status).toBe(403)
  })
})

// =====================================================================
// Employee Auth: GET /api/users/members - auth + can_manage_users + company
// =====================================================================

describe('Employee Auth: GET /api/users/members', () => {
  let GET: () => Promise<NextResponse>

  beforeAll(async () => {
    const mod = await import('@/app/api/users/members/route')
    GET = mod.GET
  })

  it('returns 401 when no user', async () => {
    setEmployeeAuth(null, { message: 'not authenticated' })

    const res = await GET()

    expect(res.status).toBe(401)
  })

  it('returns 403 when user cannot manage users', async () => {
    setEmployeeAuth({ id: 'u-1', app_metadata: {} })
    mockRpc.mockResolvedValue({ data: false, error: null })

    const res = await GET()

    expect(res.status).toBe(403)
  })

  it('returns 403 when no company assigned', async () => {
    setEmployeeAuth({ id: 'u-1', app_metadata: {} })
    mockRpc
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: null, error: null })

    const res = await GET()

    expect(res.status).toBe(403)
  })
})

// =====================================================================
// Employee Auth: GET /api/users/permissions - auth + can_manage_users + company
// =====================================================================

describe('Employee Auth: GET /api/users/permissions', () => {
  let GET: () => Promise<NextResponse>

  beforeAll(async () => {
    const mod = await import('@/app/api/users/permissions/route')
    GET = mod.GET
  })

  it('returns 401 when no user', async () => {
    setEmployeeAuth(null, { message: 'not authenticated' })

    const res = await GET()

    expect(res.status).toBe(401)
  })

  it('returns 403 when user cannot manage users', async () => {
    setEmployeeAuth({ id: 'u-1', app_metadata: {} })
    mockRpc.mockResolvedValue({ data: false, error: null })

    const res = await GET()

    expect(res.status).toBe(403)
  })

  it('returns 403 when no company assigned', async () => {
    setEmployeeAuth({ id: 'u-1', app_metadata: {} })
    mockRpc
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: null, error: null })

    const res = await GET()

    expect(res.status).toBe(403)
  })
})

// =====================================================================
// Employee Auth: GET /api/audit-logs - auth + role check + company
// =====================================================================

describe('Employee Auth: GET /api/audit-logs', () => {
  let GET: (request: NextRequest) => Promise<NextResponse>

  beforeAll(async () => {
    const mod = await import('@/app/api/audit-logs/route')
    GET = mod.GET
  })

  it('returns 401 when no user', async () => {
    setEmployeeAuth(null, { message: 'not authenticated' })

    const res = await GET(makeRequest('http://localhost/api/audit-logs'))

    expect(res.status).toBe(401)
  })

  it('returns 403 when user has customer role', async () => {
    setEmployeeAuth({ id: 'u-1', app_metadata: { role: 'customer' } })

    const res = await GET(makeRequest('http://localhost/api/audit-logs'))

    expect(res.status).toBe(403)
  })

  it('returns 403 when no company assigned', async () => {
    setEmployeeAuth({ id: 'u-1', app_metadata: {} })
    mockRpc.mockResolvedValue({ data: null, error: null })

    const res = await GET(makeRequest('http://localhost/api/audit-logs'))

    expect(res.status).toBe(403)
  })

  it('returns 403 when user lacks admin role for audit logs', async () => {
    setEmployeeAuth({ id: 'u-1', app_metadata: {} })
    mockRpc.mockResolvedValue({ data: 'company-1', error: null })
    // mockFrom for company_members returns no member or role verkaeufer -> 403
    const builder = createChainBuilder()
    builder.single = jest.fn().mockResolvedValue({ data: { role: 'verkaeufer' }, error: null })
    mockFrom.mockImplementation(() => builder)

    const res = await GET(makeRequest('http://localhost/api/audit-logs'))

    expect(res.status).toBe(403)
  })
})

// =====================================================================
// Employee Auth: GET /api/calendar/team - auth + menu_calendar permission
// =====================================================================

describe('Employee Auth: GET /api/calendar/team', () => {
  let GET: () => Promise<NextResponse>

  beforeAll(async () => {
    const mod = await import('@/app/api/calendar/team/route')
    GET = mod.GET
  })

  it('returns 401 when no user', async () => {
    setEmployeeAuth(null, { message: 'not authenticated' })

    const res = await GET()

    expect(res.status).toBe(401)
  })

  it('returns 403 when user lacks menu_calendar permission', async () => {
    setEmployeeAuth({ id: 'u-1', app_metadata: {} })
    mockRpc.mockResolvedValue({ data: false, error: null })

    const res = await GET()

    expect(res.status).toBe(403)
  })
})
