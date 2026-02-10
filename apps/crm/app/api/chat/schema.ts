import { z } from 'zod'

export const MAX_CHAT_MESSAGE_LENGTH = 10_000
export const MAX_CHAT_PROJECTS = 500

const ChatProjectSchema = z
  .object({
    id: z.string().min(1),
    customerName: z.string().optional(),
    orderNumber: z.string().optional(),
    status: z.string().optional(),
    totalAmount: z.coerce.number().finite().optional(),
    netAmount: z.coerce.number().finite().optional(),
    taxAmount: z.coerce.number().finite().optional(),
    isDepositPaid: z.boolean().optional(),
    isFinalPaid: z.boolean().optional(),
  })
  .passthrough()

export const ChatRequestSchema = z.object({
  message: z.string().max(MAX_CHAT_MESSAGE_LENGTH).default(''),
  projects: z.array(ChatProjectSchema).max(MAX_CHAT_PROJECTS).default([]),
})

export type ChatRequest = z.infer<typeof ChatRequestSchema>
