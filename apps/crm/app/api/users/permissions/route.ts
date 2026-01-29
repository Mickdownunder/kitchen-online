import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateRequest } from '@/lib/middleware/validateRequest'
// upsertRolePermissionSchema removed - using inline validation
import { z } from 'zod'
import { logger } from '@/lib/utils/logger'

// GET: Get permissions catalog and current role permissions
export async function GET() {
  const apiLogger = logger.api('/api/users/permissions', 'GET')
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

    // Get permissions catalog
    const { data: permissions, error: permError } = await supabase
      .from('permissions')
      .select('*')
      .order('sort_order')

    if (permError) {
      logger.warn(
        'Error fetching permissions',
        {
          component: 'api/users/permissions',
        },
        permError as Error
      )
    }

    // Get role permissions matrix for this company
    const { data: rolePermissions, error: rpError } = await supabase
      .from('role_permissions')
      .select('*')
      .eq('company_id', companyId)

    if (rpError) {
      logger.warn(
        'Error fetching role permissions',
        {
          component: 'api/users/permissions',
        },
        rpError as Error
      )
    }

    apiLogger.end(startTime, 200)
    return NextResponse.json({
      companyId,
      permissions: permissions || [],
      rolePermissions: rolePermissions || [],
    })
  } catch (error: unknown) {
    apiLogger.error(error as Error, 500)
    logger.error(
      'Permissions API error',
      {
        component: 'api/users/permissions',
      },
      error as Error
    )
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Serverfehler' },
      { status: 500 }
    )
  }
}

// POST: Update role permission (checkbox toggle)
export async function POST(request: NextRequest) {
  const apiLogger = logger.api('/api/users/permissions', 'POST')
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

    const { data: currentCompanyId, error: companyError } =
      await supabase.rpc('get_current_company_id')
    if (companyError || !currentCompanyId) {
      apiLogger.error(new Error('No company assigned'), 403)
      return NextResponse.json({ error: 'Keine Firma zugeordnet' }, { status: 403 })
    }

    // Validate request body
    const bodySchema = z.object({
      companyId: z.string().uuid('Ungültige Firmen-ID'),
      role: z.enum(['geschaeftsfuehrer', 'administration', 'buchhaltung', 'verkaeufer', 'monteur']),
      permissionCode: z.string().min(1, 'Berechtigungscode ist erforderlich'),
      allowed: z.boolean(),
    })

    const validation = await validateRequest(request, bodySchema)
    if (validation.error) {
      apiLogger.end(startTime, 400)
      return validation.error
    }

    const { companyId, role, permissionCode, allowed } = validation.data

    const { error } = await supabase.rpc('upsert_role_permission', {
      p_company_id: companyId,
      p_role: role,
      p_permission_code: permissionCode,
      p_allowed: allowed,
    })

    if (error) {
      logger.error(
        'Error updating permission',
        {
          component: 'api/users/permissions',
          role,
          permissionCode,
        },
        error as Error
      )
      apiLogger.end(startTime, 400)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    apiLogger.end(startTime, 200)
    logger.info('Role permission updated', {
      component: 'api/users/permissions',
      role,
      permissionCode,
      allowed,
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    apiLogger.error(error as Error, 500)
    logger.error(
      'Update permission API error',
      {
        component: 'api/users/permissions',
      },
      error as Error
    )
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Serverfehler' },
      { status: 500 }
    )
  }
}
