import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createInviteAndSendEmail } from '@/lib/supabase/admin'
import { validateRequest } from '@/lib/middleware/validateRequest'
import { inviteUserSchema } from '@/lib/validations/users'
import { logger } from '@/lib/utils/logger'
import { rateLimit } from '@/lib/middleware/rateLimit'
import { logAuditEvent } from '@/lib/supabase/services/audit'
import { apiErrors } from '@/lib/utils/errorHandling'

export async function POST(request: NextRequest) {
  const apiLogger = logger.api('/api/users/invite', 'POST')
  const startTime = apiLogger.start()

  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      apiLogger.error(new Error('Not authenticated'), 401)
      return apiErrors.unauthorized()
    }

    // Rate limiting (stricter for invite endpoint)
    const limitCheck = await rateLimit(request, user.id)
    if (!limitCheck || !limitCheck.allowed) {
      apiLogger.end(startTime, 429)
      const resetTime = limitCheck?.resetTime || Date.now() + 60000
      return apiErrors.rateLimit(resetTime)
    }

    const { data: canManage, error: canManageError } = await supabase.rpc('can_manage_users')
    if (canManageError || !canManage) {
      apiLogger.error(new Error('No permission'), 403)
      return apiErrors.forbidden()
    }

    const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
    if (companyError || !companyId) {
      apiLogger.error(new Error('No company assigned'), 403)
      return apiErrors.forbidden()
    }

    // Validate request body
    const validation = await validateRequest(request, inviteUserSchema)
    if (validation.error) {
      apiLogger.end(startTime, 400)
      return validation.error
    }

    const { email, role } = validation.data

    // Create invite and send email
    const result = await createInviteAndSendEmail(companyId, email, role, user.id)

    if (!result.success) {
      apiLogger.error(new Error(result.error || 'Failed to create invite'), 400)
      return apiErrors.badRequest()
    }

    apiLogger.end(startTime, 200)
    logger.info('User invite created', {
      component: 'api/users/invite',
      email,
      role,
      inviteId: result.inviteId,
    })

    // Audit logging
    try {
      await logAuditEvent({
        action: 'user.invited',
        entityType: 'users',
        entityId: result.inviteId || undefined,
        changes: {
          after: {
            email,
            role,
          },
        },
      })
    } catch (auditError) {
      // Don't fail invite if audit logging fails
      logger.warn(
        'Audit logging failed for user invite',
        {
          component: 'api/users/invite',
        },
        auditError as Error
      )
    }

    return NextResponse.json({
      success: true,
      message: `Einladung an ${email} gesendet`,
      inviteId: result.inviteId,
    })
  } catch (error: unknown) {
    apiLogger.error(error as Error, 500)
    logger.error(
      'Invite API error',
      {
        component: 'api/users/invite',
      },
      error as Error
    )
    return apiErrors.internal(error as Error, { component: 'api/users/invite' })
  }
}
