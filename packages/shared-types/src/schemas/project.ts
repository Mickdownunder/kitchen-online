import { z } from 'zod'

// ============================================
// Project Schemas
// ============================================

/**
 * Projekt Status
 */
export const ProjectStatusSchema = z.enum([
  'Termin vereinbart',
  'In Planung',
  'Angebot erstellt',
  'Auftrag erteilt',
  'In Produktion',
  'Lieferung geplant',
  'Geliefert',
  'Montage geplant',
  'Montiert',
  'Abgeschlossen',
  'Storniert',
])

export type ProjectStatus = z.infer<typeof ProjectStatusSchema>

/**
 * Projekt (Customer View - eingeschränkt)
 */
export const CustomerProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  status: ProjectStatusSchema,
  orderNumber: z.string().nullable(),
  createdAt: z.string().datetime(),
})

export type CustomerProject = z.infer<typeof CustomerProjectSchema>

/**
 * Dashboard Summary Response
 */
export const ProjectDashboardSchema = z.object({
  success: z.boolean(),
  data: z.object({
    project: z.object({
      name: z.string(),
      status: ProjectStatusSchema,
      orderNumber: z.string().nullable(),
    }),
    customer: z.object({
      name: z.string(),
    }),
    salesperson: z
      .object({
        name: z.string(),
        email: z.string().email(),
        phone: z.string().nullable(),
      })
      .nullable(),
    nextAppointment: z
      .object({
        title: z.string(),
        startTime: z.string().datetime(),
      })
      .nullable(),
    stats: z.object({
      documentsCount: z.number(),
      openTicketsCount: z.number(),
      upcomingAppointmentsCount: z.number(),
    }),
  }),
})

export type ProjectDashboard = z.infer<typeof ProjectDashboardSchema>
