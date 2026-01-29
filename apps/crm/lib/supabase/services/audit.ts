import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

/**
 * Audit logging service
 * Logs important actions for compliance and debugging
 */

export interface AuditLogInput {
  action: string // e.g., 'project.created', 'user.invited', 'payment.recorded'
  entityType: string // e.g., 'project', 'user', 'invoice'
  entityId?: string
  changes?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    before?: Record<string, any>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    after?: Record<string, any>
  }
  ipAddress?: string
  userAgent?: string
  requestId?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any> // Audit metadata can vary
}

/**
 * Log an audit event
 */
export async function logAuditEvent(input: AuditLogInput, userId?: string): Promise<string | null> {
  try {
    const supabase = await createClient()

    // Get user if not provided
    if (!userId) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      userId = user?.id
    }

    if (!userId) {
      logger.warn('Cannot log audit event: no user ID', {
        component: 'audit',
        action: input.action,
      })
      return null
    }

    // Get request context (if available)
    const ipAddress = input.ipAddress || 'unknown'
    const userAgent = input.userAgent || 'unknown'

    // Call RPC function
    const { data, error } = await supabase.rpc('log_audit_event', {
      p_user_id: userId,
      p_action: input.action,
      p_entity_type: input.entityType,
      p_entity_id: input.entityId || null,
      p_changes: input.changes
        ? {
            before: input.changes.before,
            after: input.changes.after,
          }
        : null,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_request_id: input.requestId || null,
      p_metadata: input.metadata || null,
    })

    if (error) {
      logger.error(
        'Failed to log audit event',
        {
          component: 'audit',
          action: input.action,
        },
        error
      )
      return null
    }

    return data as string
  } catch (error) {
    logger.error(
      'Error logging audit event',
      {
        component: 'audit',
        action: input.action,
      },
      error as Error
    )
    return null
  }
}

/**
 * Get audit logs with filtering
 */
export interface GetAuditLogsOptions {
  limit?: number
  offset?: number
  action?: string
  entityType?: string
  entityId?: string
  startDate?: Date
  endDate?: Date
}

export interface AuditLog {
  id: string
  userId: string | null
  companyId: string | null
  action: string
  entityType: string
  entityId: string | null
  changes: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    before?: Record<string, any>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    after?: Record<string, any>
  } | null
  ipAddress: string | null
  userAgent: string | null
  requestId: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any> | null // Audit metadata can vary
  createdAt: string
  userEmail: string | null
  userName: string | null
}

export async function getAuditLogs(options: GetAuditLogsOptions = {}): Promise<AuditLog[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('get_audit_logs', {
      p_limit: options.limit || 100,
      p_offset: options.offset || 0,
      p_action: options.action || null,
      p_entity_type: options.entityType || null,
      p_entity_id: options.entityId || null,
      p_start_date: options.startDate?.toISOString() || null,
      p_end_date: options.endDate?.toISOString() || null,
    })

    if (error) {
      logger.error(
        'Failed to get audit logs',
        {
          component: 'audit',
        },
        error
      )
      return []
    }

    return (data || []) as AuditLog[]
  } catch (error) {
    logger.error(
      'Error getting audit logs',
      {
        component: 'audit',
      },
      error as Error
    )
    return []
  }
}
