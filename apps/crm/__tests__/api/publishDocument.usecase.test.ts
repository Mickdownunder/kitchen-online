/**
 * Unit tests for publish-document usecase.
 */

import { NextResponse } from 'next/server'
import { publishDocument } from '@/app/api/portal/publish-document/usecase'
import type { PublishRequest } from '@/app/api/portal/publish-document/schema'
import type { AuthorizationContext } from '@/app/api/portal/publish-document/types'

jest.mock('@/app/api/portal/publish-document/render', () => ({
  renderDocumentPdf: jest.fn(),
}))
jest.mock('@/app/api/portal/publish-document/persist', () => ({
  persistDocument: jest.fn(),
}))

import { renderDocumentPdf } from '@/app/api/portal/publish-document/render'
import { persistDocument } from '@/app/api/portal/publish-document/persist'

const mockRender = renderDocumentPdf as jest.MockedFunction<typeof renderDocumentPdf>
const mockPersist = persistDocument as jest.MockedFunction<typeof persistDocument>

const minimalPayload: PublishRequest = {
  documentType: 'order',
  projectId: 'proj-1',
  project: {
    id: 'proj-1',
    customerName: 'Test',
    address: '',
    orderNumber: 'K-2026-0001',
    items: [],
  },
}

const minimalRendered = {
  pdfBuffer: Buffer.from('pdf'),
  fileName: 'order_K-2026-0001.pdf',
  portalType: 'order' as const,
}

const minimalAuth: AuthorizationContext = {
  user: { id: 'user-1', email: 'u@test.com' } as never,
  companyId: 'company-1',
  serviceClient: {} as never,
}

beforeEach(() => {
  mockRender.mockReset()
  mockPersist.mockReset()
})

describe('publishDocument usecase', () => {
  it('calls render then persist and returns persist result on success', async () => {
    const response = NextResponse.json({ success: true, documentId: 'doc-1' })
    mockRender.mockResolvedValue(minimalRendered)
    mockPersist.mockResolvedValue(response)

    const result = await publishDocument(minimalPayload, minimalAuth)

    expect(mockRender).toHaveBeenCalledWith(minimalPayload)
    expect(mockPersist).toHaveBeenCalledWith(minimalPayload, minimalRendered, minimalAuth)
    expect(result).toBe(response)
    expect(result.status).toBe(200)
  })

  it('returns error response when persist returns error response', async () => {
    const errorResponse = NextResponse.json({ error: 'Internal' }, { status: 500 })
    mockRender.mockResolvedValue(minimalRendered)
    mockPersist.mockResolvedValue(errorResponse)

    const result = await publishDocument(minimalPayload, minimalAuth)

    expect(mockRender).toHaveBeenCalledWith(minimalPayload)
    expect(mockPersist).toHaveBeenCalledWith(minimalPayload, minimalRendered, minimalAuth)
    expect(result).toBe(errorResponse)
    expect(result.status).toBe(500)
  })

  it('throws when render throws', async () => {
    mockRender.mockRejectedValue(new Error('Render failed'))

    await expect(publishDocument(minimalPayload, minimalAuth)).rejects.toThrow('Render failed')
    expect(mockPersist).not.toHaveBeenCalled()
  })
})
