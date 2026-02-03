import { supabase } from '../client'
import { Article } from '@/types'
import { getCurrentUser } from './auth'
import { logger } from '@/lib/utils/logger'

export async function getArticles(category?: string): Promise<Article[]> {
  try {
    // Validate Supabase client is initialized
    if (!supabase) {
      logger.error('[getArticles] Supabase client not initialized', { component: 'articles' })
      return []
    }

    let query = supabase
      .from('articles')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (category && category !== 'all') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = query.eq('category', category as any)
    }

    const { data, error } = await query

    if (error) {
      const errObj = error as Error
      const isAborted =
        errObj?.name === 'AbortError' ||
        String(errObj?.message ?? '')
          .toLowerCase()
          .includes('aborted')
      if (isAborted) {
        return []
      }
      logger.error('[getArticles] Supabase error', { component: 'articles' }, error as Error)
      return []
    }

    if (!data || !Array.isArray(data)) {
      return []
    }

    return data.map(mapArticleFromDB)
  } catch (err: unknown) {
    const errObj = err as Error
    const isAborted =
      errObj?.name === 'AbortError' ||
      String(errObj?.message ?? '')
        .toLowerCase()
        .includes('aborted')
    if (isAborted) {
      return []
    }
    logger.error('[getArticles] Unexpected error', { component: 'articles' }, err as Error)
    return []
  }
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

/**
 * Artikelstamm: paginierte Liste mit Suche, Filter und Sortierung (server-seitig).
 */
export async function getArticlesPaginated(
  params: GetArticlesPaginatedParams = {}
): Promise<GetArticlesPaginatedResult> {
  try {
    if (!supabase) {
      logger.error('[getArticlesPaginated] Supabase client not initialized', { component: 'articles' })
      return { data: [], total: 0 }
    }

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = query.eq('category', category as any)
    }

    if (search) {
      const pattern = `%${search.replace(/%/g, '\\%')}%`
      query = query.or(
        `name.ilike.${pattern},sku.ilike.${pattern},manufacturer.ilike.${pattern},model_number.ilike.${pattern}`
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
      const errObj = error as Error
      if (
        errObj?.name === 'AbortError' ||
        String(errObj?.message ?? '').toLowerCase().includes('aborted')
      ) {
        return { data: [], total: 0 }
      }
      logger.error('[getArticlesPaginated] Supabase error', { component: 'articles' }, error as Error)
      return { data: [], total: 0 }
    }

    const total = typeof count === 'number' ? count : 0
    const items = Array.isArray(data) ? data.map(mapArticleFromDB) : []
    return { data: items, total }
  } catch (err: unknown) {
    const errObj = err as Error
    if (
      errObj?.name === 'AbortError' ||
      String(errObj?.message ?? '').toLowerCase().includes('aborted')
    ) {
      return { data: [], total: 0 }
    }
    logger.error('[getArticlesPaginated] Unexpected error', { component: 'articles' }, err as Error)
    return { data: [], total: 0 }
  }
}

/**
 * Leichte Suche für Artikelauswahl (z. B. im Auftrag): begrenzte Treffer, server-seitig.
 */
export async function getArticlesSearch(search: string, limit = 50): Promise<Article[]> {
  try {
    if (!supabase) {
      logger.error('[getArticlesSearch] Supabase client not initialized', { component: 'articles' })
      return []
    }

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
        `name.ilike.${pattern},sku.ilike.${pattern},manufacturer.ilike.${pattern},model_number.ilike.${pattern}`
      )
    }

    const { data, error } = await query

    if (error) {
      const errObj = error as Error
      if (
        errObj?.name === 'AbortError' ||
        String(errObj?.message ?? '').toLowerCase().includes('aborted')
      ) {
        return []
      }
      logger.error('[getArticlesSearch] Supabase error', { component: 'articles' }, error as Error)
      return []
    }

    return Array.isArray(data) ? data.map(mapArticleFromDB) : []
  } catch (err: unknown) {
    const errObj = err as Error
    if (
      errObj?.name === 'AbortError' ||
      String(errObj?.message ?? '').toLowerCase().includes('aborted')
    ) {
      return []
    }
    logger.error('[getArticlesSearch] Unexpected error', { component: 'articles' }, err as Error)
    return []
  }
}

export async function getArticle(id: string): Promise<Article | null> {
  const { data, error } = await supabase.from('articles').select('*').eq('id', id).single()

  if (error) throw error
  return data ? mapArticleFromDB(data) : null
}

export async function createArticle(
  article: Omit<Article, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Article> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('articles')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      user_id: user.id,
      sku: article.sku,
      manufacturer: article.manufacturer,
      model_number: article.modelNumber,
      category: article.category,
      name: article.name,
      description: article.description,
      specifications: article.specifications || {},
      default_purchase_price: article.defaultPurchasePrice,
      default_sale_price: article.defaultSalePrice,
      tax_rate: String(article.taxRate),
      unit: article.unit,
      in_stock: article.inStock ?? true,
      stock_quantity: article.stockQuantity || 0,
      is_active: article.isActive ?? true,
    } as any)
    .select()
    .single()

  if (error) throw error
  return mapArticleFromDB(data)
}

export async function updateArticle(id: string, article: Partial<Article>): Promise<Article> {
  const { data, error } = await supabase
    .from('articles')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({
      sku: article.sku,
      manufacturer: article.manufacturer,
      model_number: article.modelNumber,
      category: article.category,
      name: article.name,
      description: article.description,
      specifications: article.specifications,
      default_purchase_price: article.defaultPurchasePrice,
      default_sale_price: article.defaultSalePrice,
      tax_rate: article.taxRate ? String(article.taxRate) : undefined,
      unit: article.unit,
      in_stock: article.inStock,
      stock_quantity: article.stockQuantity,
      is_active: article.isActive,
    } as any)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return mapArticleFromDB(data)
}

export async function deleteArticle(id: string): Promise<void> {
  // Soft delete by setting is_active to false
  const { error } = await supabase.from('articles').update({ is_active: false }).eq('id', id)

  if (error) throw error
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
export async function findOrCreateArticleFromItem(item: ItemLike): Promise<string | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const desc = (item.description || '').trim()
  if (!desc) return null

  const nameForMatch = desc.split('\n')[0].trim() || desc

  const { data: existing } = await supabase
    .from('articles')
    .select('id')
    .eq('name', nameForMatch)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (existing?.id) return existing.id

  const unit = (item.unit === 'Stk' || item.unit === 'Pkg' || item.unit === 'Std' || item.unit === 'Paush' || item.unit === 'm' || item.unit === 'm²' || item.unit === 'lfm')
    ? item.unit
    : 'Stk'
  const taxRate = (item.taxRate === 10 || item.taxRate === 13 || item.taxRate === 20) ? item.taxRate : 20
  const sku = (item.modelNumber && /^[A-Z0-9-]+$/i.test(item.modelNumber))
    ? item.modelNumber
    : `ART-${Date.now().toString().slice(-8)}`

  // Vor dem Anlegen: auch nach SKU suchen (Unique-Constraint), sonst Duplikat-Fehler beim Speichern
  const { data: existingBySku } = await supabase
    .from('articles')
    .select('id')
    .eq('sku', sku)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  if (existingBySku?.id) return existingBySku.id

  const newArticle = await createArticle({
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

  return newArticle.id
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapArticleFromDB(dbArticle: Record<string, any>): Article {
  if (!dbArticle || typeof dbArticle !== 'object') {
    throw new Error('Invalid article data')
  }

  return {
    id: dbArticle.id,
    userId: dbArticle.user_id,
    sku: dbArticle.sku || '',
    manufacturer: dbArticle.manufacturer || null,
    modelNumber: dbArticle.model_number || null,
    category: dbArticle.category || 'Other',
    name: dbArticle.name || '',
    description: dbArticle.description || null,
    specifications: dbArticle.specifications || {},
    defaultPurchasePrice: dbArticle.default_purchase_price
      ? parseFloat(String(dbArticle.default_purchase_price))
      : 0,
    defaultSalePrice: dbArticle.default_sale_price
      ? parseFloat(String(dbArticle.default_sale_price))
      : 0,
    taxRate: (dbArticle.tax_rate ? parseInt(String(dbArticle.tax_rate)) : 20) as 10 | 13 | 20,
    unit: dbArticle.unit || 'Stk',
    inStock: dbArticle.in_stock ?? true,
    stockQuantity: dbArticle.stock_quantity || 0,
    isActive: dbArticle.is_active ?? true,
    createdAt: dbArticle.created_at || new Date().toISOString(),
    updatedAt: dbArticle.updated_at || new Date().toISOString(),
  }
}
