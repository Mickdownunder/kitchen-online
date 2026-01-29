import { z } from 'zod'

/**
 * Validation schemas for Users & Authentication
 */

// New RBAC roles (German role names used in the system)
const companyMemberRoleEnum = z.enum([
  'geschaeftsfuehrer',
  'administration',
  'buchhaltung',
  'verkaeufer',
  'monteur',
])

export const inviteUserSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  role: companyMemberRoleEnum,
})

export const updateMemberRoleSchema = z.object({
  memberId: z.string().uuid('Ungültige Mitglieds-ID'),
  role: companyMemberRoleEnum.optional(),
  isActive: z.boolean().optional(),
})

export const updateMemberActiveSchema = z.object({
  memberId: z.string().uuid('Ungültige Mitglieds-ID'),
  isActive: z.boolean(),
})

export const upsertRolePermissionSchema = z.object({
  role: companyMemberRoleEnum,
  permissionCode: z.string().min(1, 'Berechtigungscode ist erforderlich'),
  allowed: z.boolean(),
})

export const upsertUserPermissionSchema = z.object({
  userId: z.string().uuid('Ungültige Benutzer-ID'),
  permissionCode: z.string().min(1, 'Berechtigungscode ist erforderlich'),
  allowed: z.boolean(),
})

export const deleteMemberSchema = z
  .object({
    memberId: z.string().uuid('Ungültige Mitglieds-ID').optional(),
    inviteId: z.string().uuid('Ungültige Einladungs-ID').optional(),
  })
  .refine(data => data.memberId || data.inviteId, {
    message: 'Entweder memberId oder inviteId ist erforderlich',
  })

export const upsertRolePermissionBodySchema = z.object({
  companyId: z.string().uuid('Ungültige Firmen-ID'),
  role: companyMemberRoleEnum,
  permissionCode: z.string().min(1, 'Berechtigungscode ist erforderlich'),
  allowed: z.boolean(),
})

export type InviteUserInput = z.infer<typeof inviteUserSchema>
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>
export type UpdateMemberActiveInput = z.infer<typeof updateMemberActiveSchema>
export type UpsertRolePermissionInput = z.infer<typeof upsertRolePermissionSchema>
export type UpsertUserPermissionInput = z.infer<typeof upsertUserPermissionSchema>
export type DeleteMemberInput = z.infer<typeof deleteMemberSchema>
export type UpsertRolePermissionBodyInput = z.infer<typeof upsertRolePermissionBodySchema>
