import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateRequest } from '@/lib/middleware/validateRequest'
import { updateMemberRoleSchema } from '@/lib/validations/users'
import { logger } from '@/lib/utils/logger'
import { validateQuery } from '@/lib/middleware/validateRequest'
import { z } from 'zod'

// GET: List company members
export async function GET() {
  const apiLogger = logger.api('/api/users/members', 'GET')
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
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { data: canManage, error: canManageError } = await supabase.rpc('can_manage_users')
    if (canManageError || !canManage) {
      apiLogger.error(new Error('No permission'), 403)
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
    if (companyError || !companyId) {
      apiLogger.error(new Error('No company assigned'), 403)
      return NextResponse.json({ error: 'Keine Firma zugeordnet' }, { status: 403 })
    }

    // Get members via RPC (handles company scoping automatically)

    const { data: members, error: membersError } = await supabase.rpc('get_company_members')

    if (membersError) {
      logger.error(
        'RPC get_company_members failed',
        {
          component: 'api/users/members',
        },
        membersError as Error
      )
      apiLogger.end(startTime, 500)
      return NextResponse.json({ error: 'Fehler beim Laden der Mitglieder' }, { status: 500 })
    }

    // Get pending invites
    const { data: invites, error: invitesError } = await supabase.rpc(
      'get_pending_invites_for_company'
    )

    if (invitesError) {
      logger.warn(
        'Error fetching invites',
        {
          component: 'api/users/members',
        },
        invitesError as Error
      )
      // Don't fail if invites fail, just return empty
    }

    apiLogger.end(startTime, 200)
    return NextResponse.json({
      members: members || [],
      pendingInvites: invites || [],
    })
  } catch (error: unknown) {
    apiLogger.error(error as Error, 500)
    logger.error(
      'Members API error',
      {
        component: 'api/users/members',
      },
      error as Error
    )
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Serverfehler' },
      { status: 500 }
    )
  }
}

// PATCH: Update member role/status
export async function PATCH(request: NextRequest) {
  const apiLogger = logger.api('/api/users/members', 'PATCH')
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
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { data: canManage, error: canManageError } = await supabase.rpc('can_manage_users')
    if (canManageError || !canManage) {
      apiLogger.error(new Error('No permission'), 403)
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
    if (companyError || !companyId) {
      apiLogger.error(new Error('No company assigned'), 403)
      return NextResponse.json({ error: 'Keine Firma zugeordnet' }, { status: 403 })
    }

    // Validate request body
    const validation = await validateRequest(request, updateMemberRoleSchema)
    if (validation.error) {
      apiLogger.end(startTime, 400)
      return validation.error
    }

    const { memberId, role } = validation.data
    const isActive = 'isActive' in validation.data ? validation.data.isActive : undefined

    // Update via RPC
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.rpc('update_member_role', {
      p_member_id: memberId,
      p_role: role || undefined,
      p_is_active: isActive !== undefined ? isActive : undefined,
    } as any)

    if (error) {
      logger.error(
        'Error updating member',
        {
          component: 'api/users/members',
          memberId,
        },
        error
      )
      apiLogger.end(startTime, 400)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Fehler' },
        { status: 400 }
      )
    }

    apiLogger.end(startTime, 200)
    logger.info('Member updated', {
      component: 'api/users/members',
      memberId,
      role,
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    apiLogger.error(error as Error, 500)
    logger.error(
      'Update member API error',
      {
        component: 'api/users/members',
      },
      error as Error
    )
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Serverfehler' },
      { status: 500 }
    )
  }
}

// DELETE: Remove/deactivate member
export async function DELETE(request: NextRequest) {
  const apiLogger = logger.api('/api/users/members', 'DELETE')
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
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { data: canManage, error: canManageError } = await supabase.rpc('can_manage_users')
    if (canManageError || !canManage) {
      apiLogger.error(new Error('No permission'), 403)
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
    if (companyError || !companyId) {
      apiLogger.error(new Error('No company assigned'), 403)
      return NextResponse.json({ error: 'Keine Firma zugeordnet' }, { status: 403 })
    }

    // Validate query parameters
    const querySchema = z
      .object({
        memberId: z.string().uuid().optional(),
        inviteId: z.string().uuid().optional(),
      })
      .refine(data => data.memberId || data.inviteId, {
        message: 'Entweder memberId oder inviteId ist erforderlich',
      })

    const queryValidation = validateQuery(request, querySchema)
    if (queryValidation.error) {
      apiLogger.end(startTime, 400)
      return queryValidation.error
    }

    const { memberId, inviteId } = queryValidation.data

    if (memberId) {
      // Remove member
      const { error } = await supabase.rpc('remove_member', {
        p_member_id: memberId,
      })

      if (error) {
        logger.error(
          'Error removing member',
          {
            component: 'api/users/members',
            memberId,
          },
          error
        )
        apiLogger.end(startTime, 400)
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Fehler' },
          { status: 400 }
        )
      }
    } else if (inviteId) {
      // Delete pending invite
      const { error } = await supabase.rpc('delete_pending_invite', {
        p_invite_id: inviteId,
      })

      if (error) {
        logger.error(
          'Error deleting invite',
          {
            component: 'api/users/members',
            inviteId,
          },
          error
        )
        apiLogger.end(startTime, 400)
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Fehler' },
          { status: 400 }
        )
      }
    }

    apiLogger.end(startTime, 200)
    logger.info('Member/invite deleted', {
      component: 'api/users/members',
      memberId,
      inviteId,
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    apiLogger.error(error as Error, 500)
    logger.error(
      'Delete API error',
      {
        component: 'api/users/members',
      },
      error as Error
    )
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Serverfehler' },
      { status: 500 }
    )
  }
}
