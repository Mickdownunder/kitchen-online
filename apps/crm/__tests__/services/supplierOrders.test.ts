/**
 * Unit tests for supplier orders service.
 */

import { mockQueryResult, resetMock } from './__mocks__/supabase'

jest.mock('@/lib/supabase/client', () => require('./__mocks__/supabase'))
jest.mock('@/lib/supabase/services/auth', () => ({
  getCurrentUser: jest.fn(),
}))
jest.mock('@/lib/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}))

import { getCurrentUser } from '@/lib/supabase/services/auth'
import { getSupplierOrders } from '@/lib/supabase/services/supplierOrders'

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>

beforeEach(() => {
  resetMock()
  mockGetCurrentUser.mockReset()
})

describe('getSupplierOrders', () => {
  it('returns unauthorized when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await getSupplierOrders()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('UNAUTHORIZED')
    }
  })

  it('returns actionable validation error when supplier order schema is missing', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: null,
      error: {
        code: 'PGRST205',
        message: "Could not find the table 'public.supplier_orders' in the schema cache",
      },
    })

    const result = await getSupplierOrders()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('VALIDATION')
      expect(result.message).toContain('@kitchen/db migrate')
    }
  })

  it('maps supplier orders when query succeeds', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: [
        {
          id: 'so-1',
          user_id: 'user-1',
          project_id: 'proj-1',
          supplier_id: 'sup-1',
          order_number: 'K-2026-0001-LSUP1',
          status: 'draft',
          delivery_calendar_week: null,
          installation_reference_date: null,
          created_by_type: 'user',
          approved_by_user_id: null,
          approved_at: null,
          sent_to_email: null,
          sent_at: null,
          booked_at: null,
          idempotency_key: null,
          template_version: 'v1',
          template_snapshot: null,
          ab_number: null,
          ab_confirmed_delivery_date: null,
          ab_deviations: [],
          ab_received_at: null,
          ab_document_url: null,
          ab_document_name: null,
          ab_document_mime_type: null,
          supplier_delivery_note_id: null,
          goods_receipt_id: null,
          notes: null,
          created_at: '2026-02-11T08:00:00.000Z',
          updated_at: '2026-02-11T08:00:00.000Z',
          supplier_order_items: [],
          supplier_order_dispatch_logs: [],
          suppliers: {
            id: 'sup-1',
            name: 'Bosch',
            email: 'sales@bosch.de',
            order_email: 'order@bosch.de',
            contact_person: null,
          },
          projects: {
            id: 'proj-1',
            order_number: 'K-2026-0001',
            customer_name: 'Musterkunde',
            installation_date: '2026-03-01',
          },
        },
      ],
      error: null,
    })

    const result = await getSupplierOrders()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0].projectId).toBe('proj-1')
      expect(result.data[0].supplierName).toBe('Bosch')
    }
  })
})
