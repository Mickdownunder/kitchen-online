/**
 * API route tests for POST /api/portal/publish-document.
 */

import { NextRequest, NextResponse } from 'next/server'
import { POST } from '@/app/api/portal/publish-document/route'

jest.mock('@/app/api/portal/publish-document/auth', () => ({
  authorizePublish: jest.fn(),
}))
jest.mock('@/app/api/portal/publish-document/usecase', () => ({
  publishDocument: jest.fn(),
}))
jest.mock('@/app/api/portal/publish-document/request', () => ({
  parsePublishRequest: jest.fn(),
}))

import { authorizePublish } from '@/app/api/portal/publish-document/auth'
import { publishDocument } from '@/app/api/portal/publish-document/usecase'
import { parsePublishRequest } from '@/app/api/portal/publish-document/request'

const mockAuthorize = authorizePublish as jest.MockedFunction<typeof authorizePublish>
const mockPublish = publishDocument as jest.MockedFunction<typeof publishDocument>
const mockParse = parsePublishRequest as jest.MockedFunction<typeof parsePublishRequest>

function createPostRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/portal/publish-document', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  mockAuthorize.mockReset()
  mockPublish.mockReset()
  mockParse.mockReset()
})

describe('POST /api/portal/publish-document', () => {
  it('returns 400 when parse returns null', async () => {
    mockParse.mockResolvedValue(null)
    const request = createPostRequest({})
    const response = await POST(request)
    expect(response.status).toBe(400)
    expect(mockAuthorize).not.toHaveBeenCalled()
    expect(mockPublish).not.toHaveBeenCalled()
  })

  it('returns 401 when authorization fails', async () => {
    const payload = {
      documentType: 'order' as const,
      projectId: 'proj-1',
      project: { id: 'proj-1', customerName: 'Test', address: '', orderNumber: 'K-1', items: [] },
    }
    mockParse.mockResolvedValue(payload)
    const unauthorizedResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    mockAuthorize.mockResolvedValue(unauthorizedResponse)

    const request = createPostRequest(payload)
    const response = await POST(request)

    expect(response.status).toBe(401)
    expect(mockPublish).not.toHaveBeenCalled()
  })

  it('returns 200 when authorized and publish succeeds', async () => {
    const payload = {
      documentType: 'order' as const,
      projectId: 'proj-1',
      project: { id: 'proj-1', customerName: 'Test', address: '', orderNumber: 'K-1', items: [] },
    }
    mockParse.mockResolvedValue(payload)
    const authContext = { user: { id: 'u1' }, companyId: 'c1', serviceClient: {} } as never
    mockAuthorize.mockResolvedValue(authContext)
    const successResponse = NextResponse.json({ success: true, documentId: 'doc-1' })
    mockPublish.mockResolvedValue(successResponse)

    const request = createPostRequest(payload)
    const response = await POST(request)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.success).toBe(true)
    expect(json.documentId).toBe('doc-1')
    expect(mockPublish).toHaveBeenCalledWith(payload, authContext)
  })
})
