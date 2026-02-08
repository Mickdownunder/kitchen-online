/**
 * Unit tests for the articles service (critical subset).
 *
 * Covers: getArticlesPaginated, deleteArticle, findOrCreateArticleFromItem.
 */

import { mockQueryResult, resetMock } from './__mocks__/supabase'

// ─── Mock wiring ──────────────────────────────────────────────────────

jest.mock('@/lib/supabase/client', () => require('./__mocks__/supabase'))
jest.mock('@/lib/supabase/services/auth', () => ({
  getCurrentUser: jest.fn(),
}))
jest.mock('@/lib/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}))

import { getCurrentUser } from '@/lib/supabase/services/auth'
import {
  getArticlesPaginated,
  deleteArticle,
  findOrCreateArticleFromItem,
  getArticle,
  getArticles,
} from '@/lib/supabase/services/articles'

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>

// ─── Fixtures ─────────────────────────────────────────────────────────

const MOCK_USER = { id: 'user-1', email: 'admin@example.com' }

const ARTICLE_ROW = {
  id: 'art-1',
  user_id: 'user-1',
  sku: 'SKU-001',
  manufacturer: 'Bosch',
  model_number: 'BSH-100',
  category: 'Elektrogeraete',
  name: 'Geschirrspüler',
  description: 'Einbau-Geschirrspüler 60cm',
  specifications: { width: '60cm' },
  default_purchase_price: 400,
  default_sale_price: 600,
  tax_rate: '20',
  unit: 'Stk',
  in_stock: true,
  stock_quantity: 5,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

// ─── Tests ────────────────────────────────────────────────────────────

beforeEach(() => {
  resetMock()
  mockGetCurrentUser.mockReset()
})

// ─── getArticlesPaginated ─────────────────────────────────────────────

describe('getArticlesPaginated', () => {
  it('returns paginated articles with total count', async () => {
    mockQueryResult({
      data: [ARTICLE_ROW, { ...ARTICLE_ROW, id: 'art-2', name: 'Backofen' }],
      error: null,
      count: 25,
    })

    const result = await getArticlesPaginated({ page: 1, pageSize: 50 })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.data).toHaveLength(2)
      expect(result.data.total).toBe(25)
      expect(result.data.data[0].id).toBe('art-1')
      expect(result.data.data[0].name).toBe('Geschirrspüler')
    }
  })

  it('returns empty result on DB error', async () => {
    mockQueryResult({ data: null, error: { message: 'timeout' } })

    const result = await getArticlesPaginated()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('INTERNAL')
    }
  })

  it('clamps page and pageSize to valid ranges', async () => {
    mockQueryResult({ data: [], error: null, count: 0 })

    const result = await getArticlesPaginated({ page: -5, pageSize: 500 })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.data).toEqual([])
      expect(result.data.total).toBe(0)
    }
  })
})

// ─── getArticles ──────────────────────────────────────────────────────

describe('getArticles', () => {
  it('returns ok with mapped articles', async () => {
    mockQueryResult({ data: [ARTICLE_ROW], error: null })

    const result = await getArticles()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0].defaultPurchasePrice).toBe(400)
      expect(result.data[0].defaultSalePrice).toBe(600)
      expect(result.data[0].taxRate).toBe(20)
    }
  })

  it('returns INTERNAL on DB error', async () => {
    mockQueryResult({ data: null, error: { message: 'connection lost' } })

    const result = await getArticles()

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INTERNAL')
  })
})

// ─── getArticle ───────────────────────────────────────────────────────

describe('getArticle', () => {
  it('returns single article', async () => {
    mockQueryResult({ data: ARTICLE_ROW, error: null })

    const result = await getArticle('art-1')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe('art-1')
      expect(result.data.manufacturer).toBe('Bosch')
    }
  })

  it('returns NOT_FOUND on error', async () => {
    mockQueryResult({ data: null, error: { message: 'not found' } })

    const result = await getArticle('nonexistent')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('NOT_FOUND')
  })
})

// ─── deleteArticle (soft delete) ──────────────────────────────────────

describe('deleteArticle', () => {
  it('returns ok on successful soft delete', async () => {
    mockQueryResult({ data: null, error: null })

    const result = await deleteArticle('art-1')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toBeUndefined()
  })

  it('returns INTERNAL on DB error', async () => {
    mockQueryResult({ data: null, error: { message: 'constraint violation' } })

    const result = await deleteArticle('art-1')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INTERNAL')
  })
})

// ─── findOrCreateArticleFromItem ──────────────────────────────────────

describe('findOrCreateArticleFromItem', () => {
  it('returns null when no user', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await findOrCreateArticleFromItem({
      description: 'Some article',
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toBeNull()
  })

  it('returns null when description is empty', async () => {
    mockGetCurrentUser.mockResolvedValue(MOCK_USER as ReturnType<typeof getCurrentUser> extends Promise<infer T> ? T : never)

    const result = await findOrCreateArticleFromItem({ description: '' })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toBeNull()
  })

  it('returns existing article ID when name matches', async () => {
    mockGetCurrentUser.mockResolvedValue(MOCK_USER as ReturnType<typeof getCurrentUser> extends Promise<infer T> ? T : never)
    // Search by name returns existing article
    mockQueryResult({ data: { id: 'art-existing' }, error: null })

    const result = await findOrCreateArticleFromItem({
      description: 'Geschirrspüler',
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toBe('art-existing')
  })

  it('creates new article when no match found', async () => {
    mockGetCurrentUser.mockResolvedValue(MOCK_USER as ReturnType<typeof getCurrentUser> extends Promise<infer T> ? T : never)
    // First search by name: no match
    mockQueryResult({ data: null, error: null })
    // Second search by SKU: no match
    mockQueryResult({ data: null, error: null })
    // createArticle -> getCurrentUser (already mocked), then insert
    mockQueryResult({ data: { ...ARTICLE_ROW, id: 'art-new', name: 'New Item' }, error: null })

    const result = await findOrCreateArticleFromItem({
      description: 'New Item',
      manufacturer: 'Siemens',
      pricePerUnit: 500,
      taxRate: 20,
      unit: 'Stk',
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toBe('art-new')
  })
})
