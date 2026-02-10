/**
 * Unit tests for delivery service.
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
import {
  getDeliveryNotes,
  getDeliveryNote,
  createDeliveryNote,
  updateDeliveryNote,
  matchDeliveryNoteToProject,
  getGoodsReceipts,
  createGoodsReceipt,
  getCustomerDeliveryNotes,
  getCustomerDeliveryNote,
  createCustomerDeliveryNote,
  updateCustomerDeliveryNote,
  addCustomerSignature,
  deleteDeliveryNote,
  deleteCustomerDeliveryNote,
} from '@/lib/supabase/services/delivery'

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>

const baseDeliveryNote = {
  id: 'dn-1',
  user_id: 'user-1',
  supplier_name: 'Lieferant GmbH',
  supplier_delivery_note_number: 'LS-001',
  delivery_date: '2026-01-15',
  received_date: '2026-01-15',
  status: 'received',
  delivery_note_items: [],
}

beforeEach(() => {
  resetMock()
  mockGetCurrentUser.mockReset()
})

describe('getDeliveryNotes', () => {
  it('returns unauthorized when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await getDeliveryNotes()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('UNAUTHORIZED')
    }
  })

  it('returns mapped delivery notes when user authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: [{ ...baseDeliveryNote }],
      error: null,
    })

    const result = await getDeliveryNotes()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0].supplierName).toBe('Lieferant GmbH')
    }
  })

  it('returns internal error when query fails', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: null, error: { message: 'DB error' } })

    const result = await getDeliveryNotes()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('INTERNAL')
      expect(result.message).toBe('DB error')
    }
  })
})

describe('getDeliveryNote', () => {
  it('returns unauthorized when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await getDeliveryNote('dn-1')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('UNAUTHORIZED')
    }
  })

  it('returns delivery note when found', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: { ...baseDeliveryNote }, error: null })

    const result = await getDeliveryNote('dn-1')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.supplierName).toBe('Lieferant GmbH')
    }
  })

  it('returns not found when note does not exist', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: null, error: { code: 'PGRST116' } })

    const result = await getDeliveryNote('nonexistent')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('NOT_FOUND')
    }
  })
})

describe('createDeliveryNote', () => {
  it('returns unauthorized when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await createDeliveryNote({
      supplierName: 'X',
      supplierDeliveryNoteNumber: 'LS-1',
      deliveryDate: '2026-01-01',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('UNAUTHORIZED')
    }
  })

  it('creates delivery note without items', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: { ...baseDeliveryNote, id: 'dn-new' },
      error: null,
    })
    mockQueryResult({ data: { ...baseDeliveryNote, id: 'dn-new' }, error: null })

    const result = await createDeliveryNote({
      supplierName: 'Lieferant GmbH',
      supplierDeliveryNoteNumber: 'LS-001',
      deliveryDate: '2026-01-15',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe('dn-new')
      expect(result.data.supplierName).toBe('Lieferant GmbH')
    }
  })

  it('creates delivery note with items', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: { ...baseDeliveryNote, id: 'dn-new' },
      error: null,
    })
    mockQueryResult({ data: null, error: null })
    mockQueryResult({ data: { ...baseDeliveryNote, id: 'dn-new', delivery_note_items: [{ description: 'Artikel 1', quantity_received: 2 }] }, error: null })

    const result = await createDeliveryNote({
      supplierName: 'Lieferant GmbH',
      supplierDeliveryNoteNumber: 'LS-001',
      deliveryDate: '2026-01-15',
      items: [
        { description: 'Artikel 1', quantityOrdered: 2, quantityReceived: 2 },
      ],
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe('dn-new')
    }
  })

  it('returns INTERNAL when delivery_note_items insert fails', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: { ...baseDeliveryNote, id: 'dn-new' },
      error: null,
    })
    mockQueryResult({ data: null, error: { message: 'item insert failed' } })

    const result = await createDeliveryNote({
      supplierName: 'X',
      supplierDeliveryNoteNumber: 'LS-1',
      deliveryDate: '2026-01-15',
      items: [{ description: 'Item', quantityOrdered: 1, quantityReceived: 1 }],
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INTERNAL')
  })
})

describe('updateDeliveryNote', () => {
  it('returns unauthorized when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await updateDeliveryNote('dn-1', { supplierName: 'Updated' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('UNAUTHORIZED')
    }
  })

  it('updates delivery note', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: { ...baseDeliveryNote, supplier_name: 'Updated GmbH' },
      error: null,
    })

    const result = await updateDeliveryNote('dn-1', { supplierName: 'Updated GmbH' })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.supplierName).toBe('Updated GmbH')
    }
  })

  it('updates delivery note status (received -> matched)', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: { ...baseDeliveryNote, status: 'matched' },
      error: null,
    })

    const result = await updateDeliveryNote('dn-1', { status: 'matched' })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.status).toBe('matched')
    }
  })
})

describe('matchDeliveryNoteToProject', () => {
  it('matches delivery note to project', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: {
        ...baseDeliveryNote,
        matched_project_id: 'proj-1',
        status: 'matched',
      },
      error: null,
    })

    const result = await matchDeliveryNoteToProject('dn-1', 'proj-1')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.matchedProjectId).toBe('proj-1')
      expect(result.data.status).toBe('matched')
    }
  })
})

describe('getGoodsReceipts', () => {
  it('returns unauthorized when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await getGoodsReceipts()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('UNAUTHORIZED')
    }
  })

  it('returns goods receipts when user authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: [
        {
          id: 'gr-1',
          project_id: 'proj-1',
          delivery_note_id: null,
          user_id: 'user-1',
          receipt_date: '2026-01-15',
          receipt_type: 'delivery',
          status: 'received',
          notes: null,
          goods_receipt_items: [],
        },
      ],
      error: null,
    })

    const result = await getGoodsReceipts()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0].id).toBe('gr-1')
      expect(result.data[0].receiptType).toBe('delivery')
    }
  })
})

describe('createGoodsReceipt', () => {
  it('returns unauthorized when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await createGoodsReceipt({
      projectId: 'proj-1',
      receiptType: 'delivery',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('UNAUTHORIZED')
    }
  })

  it('creates goods receipt without items', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: {
        id: 'gr-new',
        project_id: 'proj-1',
        delivery_note_id: null,
        user_id: 'user-1',
        receipt_date: '2026-01-15',
        receipt_type: 'delivery',
        status: 'received',
        notes: null,
        created_at: '2026-01-15',
        updated_at: '2026-01-15',
        goods_receipt_items: [],
      },
      error: null,
    })
    mockQueryResult({ data: [], error: null })
    mockQueryResult({
      data: [
        {
          id: 'gr-new',
          project_id: 'proj-1',
          delivery_note_id: null,
          user_id: 'user-1',
          receipt_date: '2026-01-15',
          receipt_type: 'delivery',
          status: 'received',
          notes: null,
          goods_receipt_items: [],
        },
      ],
      error: null,
    })

    const result = await createGoodsReceipt({
      projectId: 'proj-1',
      receiptType: 'delivery',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe('gr-new')
    }
  })

  it('creates goods receipt with items', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: {
        id: 'gr-new',
        project_id: 'proj-1',
        delivery_note_id: null,
        user_id: 'user-1',
        receipt_date: '2026-01-15',
        receipt_type: 'delivery',
        status: 'pending',
        notes: null,
        created_at: '2026-01-15',
        updated_at: '2026-01-15',
        goods_receipt_items: [],
      },
      error: null,
    })
    mockQueryResult({ data: null, error: null })
    mockQueryResult({
      data: { id: 'item-1', quantity: 2, quantity_delivered: 0 },
      error: null,
    })
    mockQueryResult({ data: null, error: null })
    mockQueryResult({
      data: [{ id: 'item-1', quantity: 2, quantity_delivered: 1, delivery_status: 'partially_delivered' }],
      error: null,
    })
    mockQueryResult({ data: null, error: null })
    mockQueryResult({
      data: [
        {
          id: 'gr-new',
          project_id: 'proj-1',
          delivery_note_id: null,
          user_id: 'user-1',
          receipt_date: '2026-01-15',
          receipt_type: 'delivery',
          status: 'received',
          notes: null,
          goods_receipt_items: [{ project_item_id: 'item-1', quantity_received: 1 }],
        },
      ],
      error: null,
    })

    const result = await createGoodsReceipt({
      projectId: 'proj-1',
      receiptType: 'delivery',
      items: [{ projectItemId: 'item-1', quantityReceived: 1, quantityExpected: 1 }],
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe('gr-new')
    }
  })

  it('returns INTERNAL when goods_receipt_items insert fails', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: {
        id: 'gr-new',
        project_id: 'proj-1',
        delivery_note_id: null,
        user_id: 'user-1',
        receipt_date: '2026-01-15',
        receipt_type: 'delivery',
        status: 'pending',
        notes: null,
        created_at: '2026-01-15',
        updated_at: '2026-01-15',
        goods_receipt_items: [],
      },
      error: null,
    })
    mockQueryResult({ data: null, error: { message: 'item insert failed' } })

    const result = await createGoodsReceipt({
      projectId: 'proj-1',
      receiptType: 'delivery',
      items: [{ projectItemId: 'item-1', quantityReceived: 1, quantityExpected: 1 }],
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INTERNAL')
  })
})

describe('getCustomerDeliveryNotes', () => {
  it('returns unauthorized when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await getCustomerDeliveryNotes()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('UNAUTHORIZED')
    }
  })

  it('returns customer delivery notes', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: [
        {
          id: 'cdn-1',
          project_id: 'proj-1',
          user_id: 'user-1',
          delivery_note_number: 'LS-2026-0001',
          delivery_date: '2026-01-15',
          status: 'completed',
        },
      ],
      error: null,
    })

    const result = await getCustomerDeliveryNotes()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0].deliveryNoteNumber).toBe('LS-2026-0001')
    }
  })
})

describe('getCustomerDeliveryNote', () => {
  it('returns unauthorized when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await getCustomerDeliveryNote('cdn-1')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('UNAUTHORIZED')
    }
  })

  it('returns customer delivery note when found', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: {
        id: 'cdn-1',
        project_id: 'proj-1',
        user_id: 'user-1',
        delivery_note_number: 'LS-2026-0001',
        delivery_date: '2026-01-15',
        status: 'completed',
      },
      error: null,
    })

    const result = await getCustomerDeliveryNote('cdn-1')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.deliveryNoteNumber).toBe('LS-2026-0001')
    }
  })
})

describe('createCustomerDeliveryNote', () => {
  it('returns unauthorized when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await createCustomerDeliveryNote({
      projectId: 'proj-1',
      deliveryDate: '2026-01-15',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('UNAUTHORIZED')
    }
  })

  it('creates customer delivery note when user authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: {
        id: 'cdn-new',
        project_id: 'proj-1',
        user_id: 'user-1',
        delivery_note_number: 'LS-2026-0001',
        delivery_date: '2026-01-15',
        status: 'draft',
      },
      error: null,
    })

    const result = await createCustomerDeliveryNote({
      projectId: 'proj-1',
      deliveryNoteNumber: 'LS-2026-0001',
      deliveryDate: '2026-01-15',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe('cdn-new')
      expect(result.data.deliveryNoteNumber).toBe('LS-2026-0001')
    }
  })

  it('returns INTERNAL on insert error', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: null, error: { message: 'constraint' } })

    const result = await createCustomerDeliveryNote({
      projectId: 'proj-1',
      deliveryNoteNumber: 'LS-1',
      deliveryDate: '2026-01-15',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INTERNAL')
  })

  it('returns INTERNAL with table hint when error code is 42P01', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: null,
      error: { code: '42P01', message: 'relation "customer_delivery_notes" does not exist' },
    })

    const result = await createCustomerDeliveryNote({
      projectId: 'proj-1',
      deliveryNoteNumber: 'LS-1',
      deliveryDate: '2026-01-15',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('INTERNAL')
      expect(result.message).toContain('existiert noch nicht')
      expect(result.message).toContain('customer_delivery_notes')
    }
  })

  it('returns INTERNAL with table hint when error message includes "does not exist"', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: null,
      error: { message: 'table customer_delivery_notes does not exist' },
    })

    const result = await createCustomerDeliveryNote({
      projectId: 'proj-1',
      deliveryNoteNumber: 'LS-1',
      deliveryDate: '2026-01-15',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('INTERNAL')
      expect(result.message).toContain('existiert noch nicht')
    }
  })
})

describe('updateCustomerDeliveryNote', () => {
  it('returns unauthorized when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await updateCustomerDeliveryNote('cdn-1', { status: 'signed' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('UNAUTHORIZED')
    }
  })

  it('updates customer delivery note', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: {
        id: 'cdn-1',
        project_id: 'proj-1',
        user_id: 'user-1',
        delivery_note_number: 'LS-2026-0001',
        delivery_date: '2026-01-15',
        status: 'signed',
      },
      error: null,
    })

    const result = await updateCustomerDeliveryNote('cdn-1', { status: 'signed' })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.status).toBe('signed')
  })

  it('returns INTERNAL on update error', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: null, error: { message: 'error' } })

    const result = await updateCustomerDeliveryNote('cdn-1', { status: 'signed' })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INTERNAL')
  })
})

describe('addCustomerSignature', () => {
  it('returns unauthorized when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await addCustomerSignature('cdn-1', 'sig-base64', 'Max Mustermann')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('UNAUTHORIZED')
    }
  })

  it('adds signature and returns updated note', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: {
        id: 'cdn-1',
        project_id: 'proj-1',
        user_id: 'user-1',
        delivery_note_number: 'LS-2026-0001',
        delivery_date: '2026-01-15',
        status: 'signed',
        customer_signature: 'sig-base64',
        signed_by: 'Max Mustermann',
      },
      error: null,
    })

    const result = await addCustomerSignature('cdn-1', 'sig-base64', 'Max Mustermann')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.status).toBe('signed')
      expect(result.data.signedBy).toBe('Max Mustermann')
    }
  })
})

describe('deleteDeliveryNote', () => {
  it('succeeds when user authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: { ...baseDeliveryNote }, error: null })
    mockQueryResult({ data: null, error: null })
    mockQueryResult({ data: null, error: null })

    await expect(deleteDeliveryNote('dn-1')).resolves.toEqual({ ok: true, data: undefined })
  })

  it('returns NOT_FOUND when note does not exist', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: null, error: { code: 'PGRST116' } })

    const result = await deleteDeliveryNote('nonexistent')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('NOT_FOUND')
  })
})

describe('deleteCustomerDeliveryNote', () => {
  it('succeeds when user authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: {
        id: 'cdn-1',
        project_id: 'proj-1',
        user_id: 'user-1',
        delivery_note_number: 'LS-2026-0001',
        delivery_date: '2026-01-15',
        status: 'completed',
      },
      error: null,
    })
    mockQueryResult({ data: null, error: null })

    await expect(deleteCustomerDeliveryNote('cdn-1')).resolves.toEqual({
      ok: true,
      data: undefined,
    })
  })

  it('returns NOT_FOUND when note does not exist', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: null, error: { code: 'PGRST116' } })

    const result = await deleteCustomerDeliveryNote('nonexistent')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('NOT_FOUND')
  })

  it('returns INTERNAL when delete fails', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: {
        id: 'cdn-1',
        project_id: 'proj-1',
        user_id: 'user-1',
        delivery_note_number: 'LS-2026-0001',
        delivery_date: '2026-01-15',
        status: 'completed',
      },
      error: null,
    })
    mockQueryResult({ data: null, error: { message: 'FK constraint' } })

    const result = await deleteCustomerDeliveryNote('cdn-1')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INTERNAL')
  })
})
