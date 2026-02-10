/**
 * API route tests for POST /api/chat/stream.
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/chat/stream/route'

jest.mock('@/lib/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}))

const mockCreateClient = jest.fn()
jest.mock('@/lib/supabase/server', () => ({ createClient: (...args: unknown[]) => mockCreateClient(...args) }))

const mockRateLimit = jest.fn()
jest.mock('@/lib/middleware/rateLimit', () => ({ rateLimit: (...args: unknown[]) => mockRateLimit(...args) }))

const mockParseChatStreamRequest = jest.fn()
jest.mock('@/app/api/chat/stream/request', () => ({
  parseChatStreamRequest: (...args: unknown[]) => mockParseChatStreamRequest(...args),
}))

const mockBuildChatStreamContext = jest.fn()
jest.mock('@/app/api/chat/stream/context', () => ({
  buildChatStreamContext: (...args: unknown[]) => mockBuildChatStreamContext(...args),
}))

const mockCreateChatStreamResponse = jest.fn()
jest.mock('@/app/api/chat/stream/sse', () => ({
  createChatStreamResponse: (...args: unknown[]) => mockCreateChatStreamResponse(...args),
}))

function createPostRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/chat/stream', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function createAuthenticatedSupabase(user: { id: string; app_metadata?: { role?: string } }) {
  return {
    auth: {
      getUser: () =>
        Promise.resolve({
          data: { user },
          error: null,
        }),
    },
    rpc: (name: string) => {
      if (name === 'get_current_company_id') return Promise.resolve({ data: 'company-1', error: null })
      if (name === 'has_permission') return Promise.resolve({ data: true, error: null })
      return Promise.resolve({ data: null, error: null })
    },
  }
}

beforeEach(() => {
  mockCreateClient.mockReset()
  mockRateLimit.mockReset()
  mockParseChatStreamRequest.mockReset()
  mockBuildChatStreamContext.mockReset()
  mockCreateChatStreamResponse.mockReset()
  process.env.GEMINI_API_KEY = 'test-key'
})

describe('POST /api/chat/stream', () => {
  it('returns 401 when not authenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: null }, error: null }) },
      rpc: () => Promise.resolve({ data: null, error: null }),
    })

    const request = createPostRequest({ message: 'hi', projects: [] })
    const response = await POST(request)

    expect(response.status).toBe(401)
    expect(mockParseChatStreamRequest).not.toHaveBeenCalled()
  })

  it('returns 403 when user is customer role', async () => {
    mockCreateClient.mockResolvedValue(
      createAuthenticatedSupabase({ id: 'u1', app_metadata: { role: 'customer' } })
    )

    const request = createPostRequest({ message: 'hi', projects: [] })
    const response = await POST(request)

    expect(response.status).toBe(403)
  })

  it('returns 429 when rate limited', async () => {
    mockCreateClient.mockResolvedValue(createAuthenticatedSupabase({ id: 'u1' }))
    mockRateLimit.mockResolvedValue({ allowed: false, resetTime: Date.now() + 60_000 })

    const request = createPostRequest({ message: 'hi', projects: [] })
    const response = await POST(request)

    expect(response.status).toBe(429)
    expect(mockParseChatStreamRequest).not.toHaveBeenCalled()
  })

  it('returns 200 and stream when authorized and parse ok', async () => {
    mockCreateClient.mockResolvedValue(createAuthenticatedSupabase({ id: 'u1' }))
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 10, resetTime: Date.now() + 60_000 })
    mockParseChatStreamRequest.mockReturnValue({
      ok: true,
      data: { message: 'hi', chatHistory: [], projects: [] },
      bodySizeMB: 0,
    })
    mockBuildChatStreamContext.mockResolvedValue({ projectSummary: '', appointmentsSummary: '' })
    mockCreateChatStreamResponse.mockResolvedValue(new Response(null, { status: 200 }))

    const request = createPostRequest({ message: 'hi', projects: [] })
    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mockParseChatStreamRequest).toHaveBeenCalled()
    expect(mockBuildChatStreamContext).toHaveBeenCalled()
    expect(mockCreateChatStreamResponse).toHaveBeenCalled()
  })

  it('returns 500 when GEMINI_API_KEY is not set', async () => {
    delete process.env.GEMINI_API_KEY
    mockCreateClient.mockResolvedValue(createAuthenticatedSupabase({ id: 'u1' }))
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 10, resetTime: Date.now() + 60_000 })

    const request = createPostRequest({ message: 'hi', projects: [] })
    const response = await POST(request)

    expect(response.status).toBe(500)
    process.env.GEMINI_API_KEY = 'test-key'
  })
})
