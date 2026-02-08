/**
 * Client-side audit logging helper
 * Calls the API to log audit events
 */

import { logger } from '@/lib/utils/logger'

export interface AuditLogData {
  action: string
  entityType: string
  entityId?: string
  changes?: {
    before?: Record<string, unknown>
    after?: Record<string, unknown>
  }
  metadata?: Record<string, unknown>
}

/**
 * Log an audit event from the client side
 * This is fire-and-forget - errors are logged but don't affect the main operation
 */
export async function logAudit(data: AuditLogData): Promise<void> {
  try {
    const res = await fetch('/api/audit-logs', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      logger.warn('Audit-Log POST fehlgeschlagen', { component: 'auditLogger', status: res.status, error: errBody?.error ?? res.statusText })
    }
  } catch (error) {
    // Don't throw - audit logging should not break the main operation
    logger.error('Failed to log audit event', { component: 'auditLogger' }, error instanceof Error ? error : new Error(String(error)))
  }
}

// Convenience functions for common actions
export const audit = {
  // Projects
  projectCreated: (projectId: string, projectData: Record<string, unknown>) =>
    logAudit({
      action: 'project.created',
      entityType: 'project',
      entityId: projectId,
      changes: { after: projectData },
    }),

  projectUpdated: (
    projectId: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>
  ) =>
    logAudit({
      action: 'project.updated',
      entityType: 'project',
      entityId: projectId,
      changes: { before, after },
    }),

  projectDeleted: (projectId: string, projectData: Record<string, unknown>) =>
    logAudit({
      action: 'project.deleted',
      entityType: 'project',
      entityId: projectId,
      changes: { before: projectData },
    }),

  // Invoices
  invoiceCreated: (invoiceId: string, invoiceData: Record<string, unknown>) =>
    logAudit({
      action: 'invoice.created',
      entityType: 'invoice',
      entityId: invoiceId,
      changes: { after: invoiceData },
    }),

  invoiceUpdated: (
    invoiceId: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>
  ) =>
    logAudit({
      action: 'invoice.updated',
      entityType: 'invoice',
      entityId: invoiceId,
      changes: { before, after },
    }),

  invoicePaid: (invoiceId: string, paidDate: string) =>
    logAudit({
      action: 'invoice.paid',
      entityType: 'invoice',
      entityId: invoiceId,
      changes: { after: { isPaid: true, paidDate } },
    }),

  invoiceUnpaid: (invoiceId: string) =>
    logAudit({
      action: 'invoice.unpaid',
      entityType: 'invoice',
      entityId: invoiceId,
      changes: { after: { isPaid: false, paidDate: null } },
    }),

  // Company Settings
  companySettingsUpdated: (
    companyId: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>
  ) =>
    logAudit({
      action: 'company_settings.updated',
      entityType: 'company_settings',
      entityId: companyId,
      changes: { before, after },
    }),

  // Users
  userRoleChanged: (
    userId: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>
  ) =>
    logAudit({
      action: 'user.role_changed',
      entityType: 'user',
      entityId: userId,
      changes: { before, after },
    }),

  userDeactivated: (userId: string) =>
    logAudit({
      action: 'user.deactivated',
      entityType: 'user',
      entityId: userId,
    }),

  userActivated: (userId: string) =>
    logAudit({
      action: 'user.activated',
      entityType: 'user',
      entityId: userId,
    }),

  // Delivery Notes
  deliveryNoteCreated: (noteId: string, noteData: Record<string, unknown>) =>
    logAudit({
      action: 'delivery_note.created',
      entityType: 'delivery_note',
      entityId: noteId,
      changes: { after: noteData },
    }),

  deliveryNoteUpdated: (
    noteId: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>
  ) =>
    logAudit({
      action: 'delivery_note.updated',
      entityType: 'delivery_note',
      entityId: noteId,
      changes: { before, after },
    }),
}
