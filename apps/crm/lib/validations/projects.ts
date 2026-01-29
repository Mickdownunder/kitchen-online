import { z } from 'zod'

/**
 * Validation schemas for Projects
 */

export const projectStatusSchema = z.enum([
  'PLANNING',
  'MEASURED',
  'ORDERED',
  'IN_PRODUCTION',
  'READY_FOR_DELIVERY',
  'DELIVERED',
  'INSTALLED',
  'COMPLETED',
  'COMPLAINT',
  'CANCELLED',
])

export const createProjectSchema = z.object({
  customerName: z.string().min(1, 'Kundenname ist erforderlich').max(200),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Ungültige E-Mail-Adresse').optional().or(z.literal('')),
  totalAmount: z.number().min(0).optional().default(0),
  netAmount: z.number().min(0).optional(),
  taxAmount: z.number().min(0).optional(),
  orderNumber: z.string().optional(),
  salespersonName: z.string().optional(),
  status: projectStatusSchema.optional(),
  depositAmount: z.number().min(0).optional(),
  isDepositPaid: z.boolean().optional().default(false),
  isFinalPaid: z.boolean().optional().default(false),
  notes: z.string().optional(),
})

export const updateProjectSchema = createProjectSchema.partial()

export const projectIdSchema = z.object({
  projectId: z.string().uuid('Ungültige Projekt-ID'),
})

export const addItemToProjectSchema = z.object({
  projectId: z.string().uuid('Ungültige Projekt-ID'),
  description: z.string().min(1, 'Beschreibung ist erforderlich').max(500),
  quantity: z.number().positive('Menge muss größer als 0 sein'),
  unit: z.string().optional(),
  pricePerUnit: z.number().min(0).optional().default(0),
  purchasePricePerUnit: z.number().min(0).optional(),
  taxRate: z.enum(['10', '13', '20']).optional().default('20'),
  modelNumber: z.string().optional(),
  manufacturer: z.string().optional(),
})

export const updateItemSchema = z.object({
  projectId: z.string().uuid('Ungültige Projekt-ID'),
  itemId: z.string().min(1, 'Artikel-ID ist erforderlich'),
  description: z.string().min(1).max(500).optional(),
  quantity: z.number().positive().optional(),
  pricePerUnit: z.number().min(0).optional(),
  purchasePricePerUnit: z.number().min(0).optional(),
  taxRate: z.enum(['10', '13', '20']).optional(),
})

export const createPartialPaymentSchema = z.object({
  projectId: z.string().uuid('Ungültige Projekt-ID'),
  amount: z.number().positive('Betrag muss größer als 0 sein'),
  description: z.string().optional(),
  invoiceNumber: z.string().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum muss im Format YYYY-MM-DD sein')
    .optional(),
})

export const createFinalInvoiceSchema = z.object({
  projectId: z.string().uuid('Ungültige Projekt-ID'),
  invoiceNumber: z.string().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type AddItemToProjectInput = z.infer<typeof addItemToProjectSchema>
export type UpdateItemInput = z.infer<typeof updateItemSchema>
export type CreatePartialPaymentInput = z.infer<typeof createPartialPaymentSchema>
export type CreateFinalInvoiceInput = z.infer<typeof createFinalInvoiceSchema>
