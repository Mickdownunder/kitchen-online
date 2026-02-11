import { validatePublishPayload } from '@/app/api/portal/publish-document/guards'
import type { PublishRequest } from '@/app/api/portal/publish-document/schema'
import type { AuthorizationContext } from '@/app/api/portal/publish-document/types'

type QueryResult = { data: unknown; error: unknown }

function createMockServiceClient(resultsByTable: Record<string, QueryResult>) {
  return {
    from: jest.fn((table: string) => {
      const queryResult = resultsByTable[table] || { data: null, error: null }
      const chain = {
        select: jest.fn(),
        eq: jest.fn(),
        maybeSingle: jest.fn().mockResolvedValue(queryResult),
      }
      chain.select.mockReturnValue(chain)
      chain.eq.mockReturnValue(chain)
      return chain
    }),
  }
}

function createAuthContext(serviceClient: ReturnType<typeof createMockServiceClient>): AuthorizationContext {
  return {
    user: { id: 'user-1', email: 'user@test.com' } as never,
    companyId: 'company-1',
    serviceClient: serviceClient as never,
  }
}

const baseProject = {
  id: 'project-1',
  customerName: 'Max Muster',
}

describe('publishDocument guards', () => {
  it('rejects invoice publishing when invoice does not belong to project', async () => {
    const payload = {
      documentType: 'invoice',
      projectId: 'project-1',
      project: baseProject,
      invoice: {
        id: 'invoice-1',
        invoiceNumber: 'R-1',
        type: 'final',
        amount: 100,
        date: '2026-02-10',
      },
    } satisfies PublishRequest

    const serviceClient = createMockServiceClient({
      invoices: { data: null, error: { message: 'not found' } },
    })

    const result = await validatePublishPayload(payload, createAuthContext(serviceClient))

    expect(result).not.toBeNull()
    expect(result?.status).toBe(400)
  })

  it('rejects delivery note publishing when note is not a customer delivery note', async () => {
    const payload = {
      documentType: 'delivery_note',
      projectId: 'project-1',
      project: baseProject,
      deliveryNote: {
        id: 'supplier-note-1',
        deliveryNoteNumber: 'LS-1',
        deliveryDate: '2026-02-10',
      },
    } satisfies PublishRequest

    const serviceClient = createMockServiceClient({
      customer_delivery_notes: { data: null, error: { message: 'not found' } },
    })

    const result = await validatePublishPayload(payload, createAuthContext(serviceClient))

    expect(result).not.toBeNull()
    expect(result?.status).toBe(400)
  })

  it('passes when invoice and customer delivery note are project-scoped', async () => {
    const invoicePayload = {
      documentType: 'invoice',
      projectId: 'project-1',
      project: baseProject,
      invoice: {
        id: 'invoice-1',
        invoiceNumber: 'R-1',
        type: 'final',
        amount: 100,
        date: '2026-02-10',
      },
    } satisfies PublishRequest

    const deliveryNotePayload = {
      documentType: 'delivery_note',
      projectId: 'project-1',
      project: baseProject,
      deliveryNote: {
        id: 'customer-note-1',
        deliveryNoteNumber: 'LS-1',
        deliveryDate: '2026-02-10',
      },
    } satisfies PublishRequest

    const serviceClient = createMockServiceClient({
      invoices: { data: { id: 'invoice-1' }, error: null },
      customer_delivery_notes: { data: { id: 'customer-note-1' }, error: null },
    })
    const authContext = createAuthContext(serviceClient)

    const invoiceResult = await validatePublishPayload(invoicePayload, authContext)
    const deliveryNoteResult = await validatePublishPayload(deliveryNotePayload, authContext)

    expect(invoiceResult).toBeNull()
    expect(deliveryNoteResult).toBeNull()
  })
})
