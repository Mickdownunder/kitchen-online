import { z } from 'zod'

// ============================================
// Auth Schemas
// ============================================

/**
 * Login mit Projektcode
 */
export const LoginSchema = z.object({
  accessCode: z
    .string()
    .min(6, 'Zugangscode muss mindestens 6 Zeichen haben')
    .max(20, 'Zugangscode darf maximal 20 Zeichen haben')
    .regex(/^[A-Z0-9-]+$/i, 'Ungültiges Format'),
})

export type LoginInput = z.infer<typeof LoginSchema>

/**
 * Session Claims (in Supabase JWT)
 */
export const CustomerSessionClaimsSchema = z.object({
  project_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  role: z.literal('customer'),
})

export type CustomerSessionClaims = z.infer<typeof CustomerSessionClaimsSchema>

/**
 * Login Response
 */
export const LoginResponseSchema = z.object({
  success: z.boolean(),
  session: z
    .object({
      access_token: z.string(),
      refresh_token: z.string(),
      expires_in: z.number(),
    })
    .optional(),
  user: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .optional(),
  error: z.string().optional(),
})

export type LoginResponse = z.infer<typeof LoginResponseSchema>
