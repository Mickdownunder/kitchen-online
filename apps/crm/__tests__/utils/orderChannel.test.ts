import { deriveSupplierOrderChannel } from '@/lib/orders/orderChannel'
import type { SupplierOrder } from '@/types'

function buildOrder(overrides: Partial<SupplierOrder> = {}): SupplierOrder {
  return {
    id: 'order-1',
    userId: 'user-1',
    projectId: 'project-1',
    supplierId: 'supplier-1',
    orderNumber: 'SO-1',
    status: 'draft',
    createdByType: 'user',
    templateVersion: 'v1',
    abDeviations: [],
    createdAt: '2026-02-11T10:00:00.000Z',
    updatedAt: '2026-02-11T10:00:00.000Z',
    ...overrides,
  }
}

describe('orderChannel', () => {
  it('returns pending for missing order', () => {
    expect(deriveSupplierOrderChannel(undefined)).toBe('pending')
  })

  it('returns crm_mail when dispatch logs exist', () => {
    const order = buildOrder({
      status: 'sent',
      dispatchLogs: [
        {
          id: 'log-1',
          supplierOrderId: 'order-1',
          userId: 'user-1',
          sentByType: 'user',
          toEmail: 'supplier@example.com',
          ccEmails: [],
          subject: 'Bestellung',
          templateVersion: 'v1',
          payload: {},
          sentAt: '2026-02-11T11:00:00.000Z',
          createdAt: '2026-02-11T11:00:00.000Z',
        },
      ],
    })

    expect(deriveSupplierOrderChannel(order)).toBe('crm_mail')
  })

  it('returns external for sent state without dispatch logs', () => {
    const order = buildOrder({
      status: 'sent',
      sentAt: '2026-02-11T11:00:00.000Z',
      dispatchLogs: [],
    })

    expect(deriveSupplierOrderChannel(order)).toBe('external')
  })
})
