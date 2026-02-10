import { z } from 'zod'

export const DocumentTypeSchema = z.enum(['invoice', 'delivery_note', 'order'])
export type DocumentType = z.infer<typeof DocumentTypeSchema>

const ProjectItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.coerce.number().finite(),
  unit: z.string().optional(),
  pricePerUnit: z.coerce.number().finite().optional(),
  netTotal: z.coerce.number().finite().optional(),
  taxRate: z.coerce.number().finite().optional(),
})

const ProjectSchema = z.object({
  id: z.string().min(1),
  customerName: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  orderNumber: z.string().optional(),
  customerId: z.string().optional(),
  items: z.array(ProjectItemSchema).optional(),
})

const InvoiceSchema = z.object({
  id: z.string().min(1),
  invoiceNumber: z.string().min(1),
  type: z.string().min(1),
  amount: z.coerce.number().finite(),
  date: z.string().min(1),
  description: z.string().optional(),
  isPaid: z.boolean().optional(),
  paidDate: z.string().optional(),
})

const DeliveryNoteItemSchema = z.object({
  position: z.coerce.number().int().nonnegative(),
  description: z.string().min(1),
  quantity: z.coerce.number().finite(),
  unit: z.string().optional(),
})

const DeliveryNoteSchema = z.object({
  id: z.string().min(1),
  deliveryNoteNumber: z.string().min(1),
  deliveryDate: z.string().min(1),
  deliveryAddress: z.string().optional(),
  items: z.array(DeliveryNoteItemSchema).optional(),
})

export const PublishRequestSchema = z
  .object({
    documentType: DocumentTypeSchema,
    projectId: z.string().min(1),
    invoice: InvoiceSchema.optional(),
    deliveryNote: DeliveryNoteSchema.optional(),
    appendAgb: z.boolean().optional(),
    project: ProjectSchema,
  })
  .superRefine((value, ctx) => {
    if (value.project.id !== value.projectId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['project', 'id'],
        message: 'project.id must match projectId',
      })
    }

    if (value.documentType === 'invoice' && !value.invoice) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['invoice'],
        message: 'invoice is required when documentType is invoice',
      })
    }

    if (value.documentType === 'delivery_note' && !value.deliveryNote) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['deliveryNote'],
        message: 'deliveryNote is required when documentType is delivery_note',
      })
    }
  })

export type PublishRequest = z.infer<typeof PublishRequestSchema>

export type PortalDocumentType = 'RECHNUNGEN' | 'LIEFERSCHEINE' | 'KAUFVERTRAG'
