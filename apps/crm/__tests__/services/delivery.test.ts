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
  it('returns empty array when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await getDeliveryNotes()

    expect(result).toEqual([])
  })

  it('returns mapped delivery notes when user authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: [{ ...baseDeliveryNote }],
      error: null,
    })

    const result = await getDeliveryNotes()

    expect(result).toHaveLength(1)
    expect(result[0].supplierName).toBe('Lieferant GmbH')
  })

  it('returns empty array when query errors', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: null, error: { message: 'DB error' } })

    const result = await getDeliveryNotes()

    expect(result).toEqual([])
  })
})

describe('getDeliveryNote', () => {
  it('returns null when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await getDeliveryNote('dn-1')

    expect(result).toBeNull()
  })

  it('returns delivery note when found', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: { ...baseDeliveryNote }, error: null })

    const result = await getDeliveryNote('dn-1')

    expect(result).not.toBeNull()
    expect(result?.supplierName).toBe('Lieferant GmbH')
  })

  it('returns null when PGRST116 (not found)', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: null, error: { code: 'PGRST116' } })

    const result = await getDeliveryNote('nonexistent')

    expect(result).toBeNull()
  })
})

describe('createDeliveryNote', () => {
  it('throws when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    await expect(
      createDeliveryNote({
        supplierName: 'X',
        supplierDeliveryNoteNumber: 'LS-1',
        deliveryDate: '2026-01-01',
      })
    ).rejects.toThrow('Not authenticated')
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

    expect(result.id).toBe('dn-new')
    expect(result.supplierName).toBe('Lieferant GmbH')
  })
})

describe('updateDeliveryNote', () => {
  it('throws when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    await expect(
      updateDeliveryNote('dn-1', { supplierName: 'Updated' })
    ).rejects.toThrow('Not authenticated')
  })

  it('updates delivery note', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({
      data: { ...baseDeliveryNote, supplier_name: 'Updated GmbH' },
      error: null,
    })

    const result = await updateDeliveryNote('dn-1', { supplierName: 'Updated GmbH' })

    expect(result.supplierName).toBe('Updated GmbH')
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

    expect(result.matchedProjectId).toBe('proj-1')
    expect(result.status).toBe('matched')
  })
})

describe('getGoodsReceipts', () => {
  it('returns empty array when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await getGoodsReceipts()

    expect(result).toEqual([])
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

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('gr-1')
    expect(result[0].receiptType).toBe('delivery')
  })
})

describe('createGoodsReceipt', () => {
  it('throws when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    await expect(
      createGoodsReceipt({
        projectId: 'proj-1',
        receiptType: 'delivery',
      })
    ).rejects.toThrow('Not authenticated')
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

    expect(result.id).toBe('gr-new')
  })
})

describe('getCustomerDeliveryNotes', () => {
  it('returns empty array when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await getCustomerDeliveryNotes()

    expect(result).toEqual([])
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

    expect(result).toHaveLength(1)
    expect(result[0].deliveryNoteNumber).toBe('LS-2026-0001')
  })
})

describe('getCustomerDeliveryNote', () => {
  it('returns null when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await getCustomerDeliveryNote('cdn-1')

    expect(result).toBeNull()
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

    expect(result).not.toBeNull()
    expect(result?.deliveryNoteNumber).toBe('LS-2026-0001')
  })
})

describe('createCustomerDeliveryNote', () => {
  it('throws when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    await expect(
      createCustomerDeliveryNote({
        projectId: 'proj-1',
        deliveryDate: '2026-01-15',
      })
    ).rejects.toThrow('Not authenticated')
  })
})

describe('updateCustomerDeliveryNote', () => {
  it('throws when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    await expect(
      updateCustomerDeliveryNote('cdn-1', { status: 'signed' })
    ).rejects.toThrow('Not authenticated')
  })
})

describe('addCustomerSignature', () => {
  it('throws when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    await expect(
      addCustomerSignature('cdn-1', 'sig-base64', 'Max Mustermann')
    ).rejects.toThrow('Not authenticated')
  })
})

describe('deleteDeliveryNote', () => {
  it('succeeds when user authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockQueryResult({ data: { ...baseDeliveryNote }, error: null })
    mockQueryResult({ data: null, error: null })
    mockQueryResult({ data: null, error: null })

    await expect(deleteDeliveryNote('dn-1')).resolves.toBeUndefined()
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

    await expect(deleteCustomerDeliveryNote('cdn-1')).resolves.toBeUndefined()
  })
})
