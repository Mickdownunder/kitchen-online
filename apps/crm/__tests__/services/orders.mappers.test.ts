import { mapOrderFromRow, mapOrderWithProjectFromRow } from '@/lib/supabase/services/orders/mappers'
import type { OrderRow, OrderWithProjectRow } from '@/lib/supabase/services/orders/types'

function makeOrderRow(overrides: Partial<OrderRow> = {}): OrderRow {
  return {
    id: 'order-1',
    user_id: 'user-1',
    project_id: 'project-1',
    order_number: 'K-2026-0001',
    order_date: '2026-02-10',
    status: 'sent',
    footer_text: 'footer',
    agb_snapshot: 'agb',
    sent_at: '2026-02-10T10:00:00.000Z',
    confirmed_at: null,
    created_at: '2026-02-10T09:00:00.000Z',
    updated_at: '2026-02-10T10:00:00.000Z',
    ...overrides,
  }
}

describe('orders mappers', () => {
  it('maps order row into domain order', () => {
    const mapped = mapOrderFromRow(makeOrderRow())

    expect(mapped).toEqual({
      id: 'order-1',
      userId: 'user-1',
      projectId: 'project-1',
      orderNumber: 'K-2026-0001',
      orderDate: '2026-02-10',
      status: 'sent',
      footerText: 'footer',
      agbSnapshot: 'agb',
      sentAt: '2026-02-10T10:00:00.000Z',
      confirmedAt: undefined,
      createdAt: '2026-02-10T09:00:00.000Z',
      updatedAt: '2026-02-10T10:00:00.000Z',
    })
  })

  it('uses draft fallback when status is null', () => {
    const mapped = mapOrderFromRow(
      makeOrderRow({
        status: null,
        order_date: null,
        footer_text: null,
        agb_snapshot: null,
        sent_at: null,
      }),
    )

    expect(mapped.status).toBe('draft')
    expect(mapped.orderDate).toBeUndefined()
    expect(mapped.footerText).toBeUndefined()
    expect(mapped.agbSnapshot).toBeUndefined()
    expect(mapped.sentAt).toBeUndefined()
  })

  it('maps project relation for orders with project', () => {
    const row: OrderWithProjectRow = {
      ...makeOrderRow(),
      projects: {
        id: 'project-1',
        customer_name: 'Max Mustermann',
        total_amount: 2500,
        address: 'Altstrasse 1',
        phone: '+43 1 111111',
        email: 'max@example.com',
        customer_address: 'Neustrasse 2',
        customer_phone: '+43 1 222222',
        customer_email: 'kunde@example.com',
      },
    }

    const mapped = mapOrderWithProjectFromRow(row)

    expect(mapped.project).toEqual(
      expect.objectContaining({
        id: 'project-1',
        customerName: 'Max Mustermann',
        totalAmount: 2500,
        address: 'Neustrasse 2',
        phone: '+43 1 222222',
        email: 'kunde@example.com',
      }),
    )
  })

  it('keeps project undefined when relation is missing', () => {
    const row: OrderWithProjectRow = {
      ...makeOrderRow(),
      projects: null,
    }

    const mapped = mapOrderWithProjectFromRow(row)
    expect(mapped.project).toBeUndefined()
  })
})
