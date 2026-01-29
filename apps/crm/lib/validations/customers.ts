import { z } from 'zod'

/**
 * Validation schemas for Customers
 */

export const createCustomerSchema = z
  .object({
    firstName: z.string().min(1, 'Vorname ist erforderlich').max(100).optional(),
    lastName: z.string().min(1, 'Nachname ist erforderlich').max(100).optional(),
    companyName: z.string().max(200).optional(),
    address: z
      .object({
        street: z.string().optional(),
        houseNumber: z.string().optional(),
        postalCode: z.string().optional(),
        city: z.string().optional(),
        country: z.string().optional(),
      })
      .optional(),
    contact: z
      .object({
        phone: z.string().optional(),
        email: z.string().email('Ungültige E-Mail-Adresse').optional().or(z.literal('')),
      })
      .optional(),
    notes: z.string().optional(),
  })
  .refine(data => (data.firstName && data.lastName) || data.companyName, {
    message: 'Entweder Vor- und Nachname oder Firmenname ist erforderlich',
  })

export const updateCustomerSchema = z.object({
  firstName: z.string().min(1, 'Vorname ist erforderlich').max(100).optional(),
  lastName: z.string().min(1, 'Nachname ist erforderlich').max(100).optional(),
  companyName: z.string().max(200).optional(),
  address: z
    .object({
      street: z.string().optional(),
      houseNumber: z.string().optional(),
      postalCode: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  contact: z
    .object({
      phone: z.string().optional(),
      email: z.string().email('Ungültige E-Mail-Adresse').optional().or(z.literal('')),
    })
    .optional(),
  notes: z.string().optional(),
})

export const customerIdSchema = z.object({
  customerId: z.string().uuid('Ungültige Kunden-ID'),
})

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>
