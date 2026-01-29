import { z } from 'zod'

// ============================================
// Ticket Schemas
// ============================================

/**
 * Ticket Status
 */
export const TicketStatusSchema = z.enum([
  'OFFEN',
  'IN_BEARBEITUNG',
  'GESCHLOSSEN',
])

export type TicketStatus = z.infer<typeof TicketStatusSchema>

/**
 * Ticket erstellen
 */
export const CreateTicketSchema = z.object({
  subject: z
    .string()
    .min(3, 'Betreff muss mindestens 3 Zeichen haben')
    .max(200, 'Betreff darf maximal 200 Zeichen haben'),
  message: z
    .string()
    .min(10, 'Nachricht muss mindestens 10 Zeichen haben')
    .max(5000, 'Nachricht darf maximal 5000 Zeichen haben'),
})

export type CreateTicketInput = z.infer<typeof CreateTicketSchema>

/**
 * Ticket Nachricht hinzufügen
 */
export const TicketMessageSchema = z.object({
  message: z
    .string()
    .min(1, 'Nachricht darf nicht leer sein')
    .max(5000, 'Nachricht darf maximal 5000 Zeichen haben'),
})

export type TicketMessageInput = z.infer<typeof TicketMessageSchema>

/**
 * Ticket (Customer View)
 */
export const CustomerTicketSchema = z.object({
  id: z.string().uuid(),
  subject: z.string(),
  status: TicketStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  messages: z.array(
    z.object({
      id: z.string().uuid(),
      message: z.string(),
      fileUrl: z.string().nullable(),
      authorId: z.string().uuid(),
      authorName: z.string(),
      isCustomer: z.boolean(),
      createdAt: z.string().datetime(),
    })
  ),
})

export type CustomerTicket = z.infer<typeof CustomerTicketSchema>

/**
 * Ticket Response
 */
export const CreateTicketResponseSchema = z.object({
  success: z.boolean(),
  ticket: z
    .object({
      id: z.string().uuid(),
      subject: z.string(),
      status: TicketStatusSchema,
      createdAt: z.string().datetime(),
    })
    .optional(),
  error: z.string().optional(),
})

export type CreateTicketResponse = z.infer<typeof CreateTicketResponseSchema>
