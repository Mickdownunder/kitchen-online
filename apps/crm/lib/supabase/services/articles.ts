import { supabase } from '../client'
import type { Article } from '@/types'
import { getCurrentUser } from './auth'
import type { ServiceResult, Row, Insert, Update } from '@/lib/types/service'
import { ok, fail } from '@/lib/types/service'
import type { Database } from '@/types/database.types'

type ArticleRow = Row<'articles'>
type ArticleInsert = Insert<'articles'>
type ArticleUpdate = Update<'articles'>

type ArticleCategory = Database['public']['Enums']['article_category']
type TaxRate = Database['public']['Enums']['tax_rate']
type UnitType = Database['public']['Enums']['unit_type']

// ─────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────

export async function getArticles(category?: string): Promise<ServiceResult<Article[]>> {
  if (!supabase) return fail('INTERNAL', 'Supabase client not initialized')

  let query = supabase
    .from('articles')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (category && category !== 'all') {
    query = query.eq('category', category as ArticleCategory)
  }

  const { data, error } = await query

  if (error) {
    if (isAbortError(error)) return ok([])
    return fail('INTERNAL', error.message, error)
  }

  return ok((data ?? []).map(mapArticleFromDB))
}

export type ArticleSortField =
  | 'name'
  | 'sku'
  | 'manufacturer'
  | 'category'
  | 'purchasePrice'
  | 'salePrice'
export type ArticleSortDirection = 'asc' | 'desc'

export interface GetArticlesPaginatedParams {
  page?: number
  pageSize?: number
  search?: string
  category?: string
  sortField?: ArticleSortField
  sortDirection?: ArticleSortDirection
}

export interface GetArticlesPaginatedResult {
  data: Article[]
  total: number
}

const EMPTY_PAGINATED: GetArticlesPaginatedResult = { data: [], total: 0 }

/** Artikelstamm: paginierte Liste mit Suche, Filter und Sortierung (server-seitig). */
export async function getArticlesPaginated(
  params: GetArticlesPaginatedParams = {},
): Promise<ServiceResult<GetArticlesPaginatedResult>> {
  if (!supabase) return fail('INTERNAL', 'Supabase client not initialized')

  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(100, Math.max(10, params.pageSize ?? 50))
  const search = (params.search ?? '').trim()
  const category = params.category === 'all' || !params.category ? undefined : params.category
  const sortField = params.sortField ?? 'name'
  const sortDirection = params.sortDirection ?? 'asc'

  const dbSortColumn =
    sortField === 'purchasePrice'
      ? 'default_purchase_price'
      : sortField === 'salePrice'
        ? 'default_sale_price'
        : sortField

  let query = supabase
    .from('articles')
    .select('*', { count: 'exact' })
    .eq('is_active', true)

  if (category) {
    query = query.eq('category', category as ArticleCategory)
  }

  if (search) {
    const pattern = `%${search.replace(/%/g, '\\%')}%`
    query = query.or(
      `name.ilike.${pattern},sku.ilike.${pattern},manufacturer.ilike.${pattern},model_number.ilike.${pattern}`,
    )
  }

  query = query.order(dbSortColumn, {
    ascending: sortDirection === 'asc',
    nullsFirst: false,
  })

  const fromIndex = (page - 1) * pageSize
  const toIndex = fromIndex + pageSize - 1
  const { data, error, count } = await query.range(fromIndex, toIndex)

  if (error) {
    if (isAbortError(error)) return ok(EMPTY_PAGINATED)
    return fail('INTERNAL', error.message, error)
  }

  const total = typeof count === 'number' ? count : 0
  const items = Array.isArray(data) ? data.map(mapArticleFromDB) : []
  return ok({ data: items, total })
}

/** Leichte Suche fuer Artikelauswahl (z.B. im Auftrag): begrenzte Treffer, server-seitig. */
export async function getArticlesSearch(
  search: string,
  limit = 50,
): Promise<ServiceResult<Article[]>> {
  if (!supabase) return fail('INTERNAL', 'Supabase client not initialized')

  const term = (search ?? '').trim()
  let query = supabase
    .from('articles')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })
    .limit(Math.min(100, Math.max(1, limit)))

  if (term) {
    const pattern = `%${term.replace(/%/g, '\\%')}%`
    query = query.or(
      `name.ilike.${pattern},sku.ilike.${pattern},manufacturer.ilike.${pattern},model_number.ilike.${pattern}`,
    )
  }

  const { data, error } = await query

  if (error) {
    if (isAbortError(error)) return ok([])
    return fail('INTERNAL', error.message, error)
  }

  return ok(Array.isArray(data) ? data.map(mapArticleFromDB) : [])
}

export async function getArticle(id: string): Promise<ServiceResult<Article>> {
  const { data, error } = await supabase.from('articles').select('*').eq('id', id).single()

  if (error) return fail('NOT_FOUND', `Article ${id} not found`, error)
  return ok(mapArticleFromDB(data))
}

// ─────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────

export async function createArticle(
  article: Omit<Article, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<ServiceResult<Article>> {
  const user = await getCurrentUser()
  if (!user) return fail('UNAUTHORIZED', 'Not authenticated')

  const insert: ArticleInsert = {
    user_id: user.id,
    sku: article.sku,
    manufacturer: article.manufacturer,
    model_number: article.modelNumber,
    category: article.category as ArticleCategory,
    name: article.name,
    description: article.description,
    specifications: (article.specifications ?? {}) as Record<string, string>,
    default_purchase_price: article.defaultPurchasePrice,
    default_sale_price: article.defaultSalePrice,
    tax_rate: String(article.taxRate) as TaxRate,
    unit: article.unit as UnitType,
    in_stock: article.inStock ?? true,
    stock_quantity: article.stockQuantity ?? 0,
    is_active: article.isActive ?? true,
  }

  const { data, error } = await supabase.from('articles').insert(insert).select().single()

  if (error) return fail('INTERNAL', error.message, error)
  return ok(mapArticleFromDB(data))
}

export async function updateArticle(
  id: string,
  article: Partial<Article>,
): Promise<ServiceResult<Article>> {
  const update: ArticleUpdate = {
    sku: article.sku,
    manufacturer: article.manufacturer,
    model_number: article.modelNumber,
    category: article.category as ArticleCategory | undefined,
    name: article.name,
    description: article.description,
    specifications: article.specifications as Record<string, string> | undefined,
    default_purchase_price: article.defaultPurchasePrice,
    default_sale_price: article.defaultSalePrice,
    tax_rate: article.taxRate ? (String(article.taxRate) as TaxRate) : undefined,
    unit: article.unit as UnitType | undefined,
    in_stock: article.inStock,
    stock_quantity: article.stockQuantity,
    is_active: article.isActive,
  }

  const { data, error } = await supabase
    .from('articles')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return fail('INTERNAL', error.message, error)
  return ok(mapArticleFromDB(data))
}

export async function deleteArticle(id: string): Promise<ServiceResult<void>> {
  // Soft delete
  const { error } = await supabase.from('articles').update({ is_active: false }).eq('id', id)

  if (error) return fail('INTERNAL', error.message, error)
  return ok(undefined)
}

/** Minimal item from Auftragsposition zum Abgleich/Anlegen im Artikelstamm */
export interface ItemLike {
  description: string
  modelNumber?: string
  manufacturer?: string
  pricePerUnit?: number
  purchasePricePerUnit?: number
  taxRate?: number
  unit?: string
}

/**
 * Sucht einen Artikel anhand der Beschreibung (Name) oder legt einen neuen im Artikelstamm an.
 * Wird beim Speichern von Auftragspositionen verwendet, wenn keine articleId gesetzt ist.
 */
export async function findOrCreateArticleFromItem(
  item: ItemLike,
): Promise<ServiceResult<string | null>> {
  const user = await getCurrentUser()
  if (!user) return ok(null)

  const desc = (item.description || '').trim()
  if (!desc) return ok(null)

  const nameForMatch = desc.split('\n')[0].trim() || desc

  const { data: existing } = await supabase
    .from('articles')
    .select('id')
    .eq('name', nameForMatch)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (existing?.id) return ok(existing.id)

  const VALID_UNITS = ['Stk', 'Pkg', 'Std', 'Paush', 'm', 'm²', 'lfm'] as const
  const VALID_TAX_RATES = [10, 13, 20] as const

  const unit = VALID_UNITS.includes(item.unit as (typeof VALID_UNITS)[number])
    ? (item.unit as (typeof VALID_UNITS)[number])
    : 'Stk'
  const taxRate = VALID_TAX_RATES.includes(item.taxRate as (typeof VALID_TAX_RATES)[number])
    ? (item.taxRate as (typeof VALID_TAX_RATES)[number])
    : 20
  const sku =
    item.modelNumber && /^[A-Z0-9-]+$/i.test(item.modelNumber)
      ? item.modelNumber
      : `ART-${Date.now().toString().slice(-8)}`

  // Vor dem Anlegen: auch nach SKU suchen (Unique-Constraint)
  const { data: existingBySku } = await supabase
    .from('articles')
    .select('id')
    .eq('sku', sku)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  if (existingBySku?.id) return ok(existingBySku.id)

  const result = await createArticle({
    name: nameForMatch,
    description: desc,
    sku,
    manufacturer: item.manufacturer ?? undefined,
    modelNumber: item.modelNumber ?? undefined,
    category: 'Other',
    unit,
    taxRate: taxRate as 10 | 13 | 20,
    defaultSalePrice: item.pricePerUnit ?? 0,
    defaultPurchasePrice: item.purchasePricePerUnit ?? 0,
    isActive: true,
  })

  if (!result.ok) return fail('INTERNAL', result.message, result.cause)
  return ok(result.data.id)
}

// ─────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────

function isAbortError(error: unknown): boolean {
  const err = error as { name?: string; message?: string }
  return (
    err?.name === 'AbortError' ||
    String(err?.message ?? '')
      .toLowerCase()
      .includes('aborted')
  )
}

function mapArticleFromDB(row: ArticleRow): Article {
  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    sku: row.sku || '',
    manufacturer: row.manufacturer ?? undefined,
    modelNumber: row.model_number ?? undefined,
    category: row.category as Article['category'],
    name: row.name || '',
    description: row.description ?? undefined,
    specifications: (row.specifications as Record<string, string>) ?? {},
    defaultPurchasePrice: row.default_purchase_price ?? 0,
    defaultSalePrice: row.default_sale_price ?? 0,
    taxRate: (row.tax_rate ? parseInt(String(row.tax_rate)) : 20) as 10 | 13 | 20,
    unit: (row.unit || 'Stk') as Article['unit'],
    inStock: row.in_stock ?? true,
    stockQuantity: row.stock_quantity ?? 0,
    isActive: row.is_active ?? true,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  }
}
