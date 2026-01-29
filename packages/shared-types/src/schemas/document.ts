import { z } from 'zod'

// ============================================
// Document Schemas
// ============================================

/**
 * Dokument-Typen (für Kunden sichtbar)
 */
export const CustomerDocumentTypeSchema = z.enum([
  'PLANE',
  'INSTALLATIONSPLANE',
  'KAUFVERTRAG',
  'RECHNUNGEN',
  'LIEFERSCHEINE',
  'AUSMESSBERICHT',
  'KUNDEN_DOKUMENT',
])

export type CustomerDocumentType = z.infer<typeof CustomerDocumentTypeSchema>

/**
 * Alle Dokument-Typen (intern)
 */
export const DocumentTypeSchema = z.enum([
  'AUSMESSBERICHT',
  'ANGEBOT',
  'KAUFVERTRAG',
  'PLANE',
  'INSTALLATIONSPLANE',
  'MONTAGEBILDER',
  'LIEFERSCHEINE',
  'RECHNUNGEN',
  'DIVERSE',
  'REKLAMATIONEN',
  'KUNDEN_DOKUMENT',
  'GUTSCHRIFT',
])

export type DocumentType = z.infer<typeof DocumentTypeSchema>

/**
 * Dokument (Customer View)
 */
export const CustomerDocumentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: CustomerDocumentTypeSchema,
  fileUrl: z.string().url(),
  createdAt: z.string().datetime(),
  canDelete: z.boolean(), // true wenn KUNDEN_DOKUMENT und selbst hochgeladen
})

export type CustomerDocument = z.infer<typeof CustomerDocumentSchema>

/**
 * Upload Response
 */
export const DocumentUploadResponseSchema = z.object({
  success: z.boolean(),
  document: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      createdAt: z.string().datetime(),
    })
    .optional(),
  error: z.string().optional(),
})

export type DocumentUploadResponse = z.infer<typeof DocumentUploadResponseSchema>

/**
 * Upload Limits
 */
export const DOCUMENT_UPLOAD_LIMITS = {
  maxSizeBytes: 10 * 1024 * 1024, // 10 MB
  allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/heic'],
  allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.heic'],
} as const
