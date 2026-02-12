/**
 * Unit tests for publish-document persist.
 */

import { persistDocument } from '@/app/api/portal/publish-document/persist'
import type { PublishRequest } from '@/app/api/portal/publish-document/schema'
import type { AuthorizationContext, RenderedDocument } from '@/app/api/portal/publish-document/types'

jest.mock('@/lib/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}))

function createMockServiceClient(
  fromResults: Array<{ data: unknown; error: unknown }>,
  uploadError: unknown = null,
  removeError: unknown = null
) {
  let fromIndex = 0
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    single: jest.fn().mockImplementation(() => {
      const result = fromResults[fromIndex++] ?? { data: null, error: null }
      return Promise.resolve(result)
    }),
    then: jest.fn().mockImplementation((resolve: (v: unknown) => void) => {
      const result = fromResults[fromIndex++] ?? { data: null, error: null }
      return Promise.resolve(result).then(resolve)
    }),
  }
  return {
    from: jest.fn().mockReturnValue(chain),
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: uploadError }),
        remove: jest.fn().mockResolvedValue({ error: removeError }),
      }),
    },
  }
}

const minimalRequest: PublishRequest = {
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

const minimalRendered: RenderedDocument = {
  pdfBuffer: Buffer.from('pdf'),
  fileName: 'order_K-2026-0001.pdf',
  portalType: 'KAUFVERTRAG',
}

function createContext(serviceClient: ReturnType<typeof createMockServiceClient>): AuthorizationContext {
  return {
    user: { id: 'user-1', email: 'u@test.com' } as never,
    companyId: 'company-1',
    serviceClient: serviceClient as never,
  }
}

describe('persistDocument', () => {
  it('returns existing document when name matches (alreadyExists)', async () => {
    const existingDocs = [{ id: 'existing-id', name: 'order_K-2026-0001.pdf' }]
    const client = createMockServiceClient([{ data: existingDocs, error: null }])
    const context = createContext(client)

    const result = await persistDocument(minimalRequest, minimalRendered, context)

    expect(result.status).toBe(200)
    const json = await result.json()
    expect(json.success).toBe(true)
    expect(json.documentId).toBe('existing-id')
    expect(json.alreadyExists).toBe(true)
  })

  it('returns 500 when existing docs query fails', async () => {
    const client = createMockServiceClient([{ data: null, error: { message: 'DB error' } }])
    const context = createContext(client)

    const result = await persistDocument(minimalRequest, minimalRendered, context)

    expect(result.status).toBe(500)
  })

  it('returns success with documentId when upload and insert succeed', async () => {
    const client = createMockServiceClient(
      [{ data: [], error: null }, { data: { id: 'new-doc-id' }, error: null }],
      null
    )
    const context = createContext(client)

    const result = await persistDocument(minimalRequest, minimalRendered, context)

    expect(result.status).toBe(200)
    const json = await result.json()
    expect(json.success).toBe(true)
    expect(json.documentId).toBe('new-doc-id')
    expect(json.alreadyExists).toBeUndefined()
  })

  it('returns 500 when storage upload fails', async () => {
    const client = createMockServiceClient([{ data: [], error: null }], new Error('Upload failed'))
    const context = createContext(client)

    const result = await persistDocument(minimalRequest, minimalRendered, context)

    expect(result.status).toBe(500)
  })

  it('returns 500 when documents insert fails', async () => {
    const client = createMockServiceClient([
      { data: [], error: null },
      { data: null, error: { message: 'Insert failed' } },
    ])
    const context = createContext(client)

    const result = await persistDocument(minimalRequest, minimalRendered, context)

    expect(result.status).toBe(500)
  })
})
