import { z } from 'zod'

/**
 * Validation schemas for Articles
 */

export const articleCategorySchema = z.enum([
  'Kitchen',
  'Appliance',
  'Accessory',
  'Service',
  'Material',
  'Other',
])

export const articleUnitSchema = z.enum(['Stk', 'Pkg', 'Std', 'Paush', 'm', 'm²', 'lfm'])

export const createArticleSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(200),
  sku: z.string().max(100).optional(),
  description: z.string().optional(),
  category: articleCategorySchema.optional().default('Other'),
  unit: articleUnitSchema.optional().default('Stk'),
  defaultPurchasePrice: z.number().min(0).optional().default(0),
  defaultSalePrice: z.number().min(0).optional().default(0),
  taxRate: z.enum(['10', '13', '20']).optional().default('20'),
  manufacturer: z.string().optional(),
  isActive: z.boolean().optional().default(true),
})

export const updateArticleSchema = createArticleSchema.partial()

export const articleIdSchema = z.object({
  articleId: z.string().uuid('Ungültige Artikel-ID'),
})

export type CreateArticleInput = z.infer<typeof createArticleSchema>
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>
