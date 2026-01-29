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
      query = query.eq('category', category)
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
    })
    .select()
    .single()

  if (error) throw error
  return mapArticleFromDB(data)
}

export async function updateArticle(id: string, article: Partial<Article>): Promise<Article> {
  const { data, error } = await supabase
    .from('articles')
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
    })
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
