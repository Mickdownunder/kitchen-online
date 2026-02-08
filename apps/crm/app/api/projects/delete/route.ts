import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { apiErrors } from '@/lib/utils/errorHandling'

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return apiErrors.unauthorized()
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return apiErrors.badRequest({ component: 'api/projects/delete' })
    }

    const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
    if (companyError || !companyId) {
      return apiErrors.forbidden({ component: 'api/projects/delete' })
    }

    // KRITISCH: Permission-Check - prüfe ob User die Berechtigung hat, Projekte zu löschen
    const { data: canDelete, error: permError } = await supabase.rpc('has_permission', {
      p_permission_code: 'delete_projects',
    })

    if (permError || !canDelete) {
      if (permError) {
        logger.error(
          'Permission check failed',
          {
            component: 'api/projects/delete',
            userId: user.id,
            projectId: id,
          },
          permError
        )
      }
      return apiErrors.forbidden({ component: 'api/projects/delete', userId: user.id, projectId: id })
    }

    try {
      // Hole das Projekt vor dem Löschen für Audit-Log
      const { data: projectData, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single()

      if (fetchError || !projectData) {
        return apiErrors.notFound({ component: 'api/projects/delete', projectId: id })
      }

      // NOTE: Re-enable soft delete after applying migration: supabase/migrations/20260126113814_add_deleted_at_to_projects.sql
      // Soft Delete: Setze deleted_at Timestamp
      // const { error: deleteError } = await supabase
      //   .from('projects')
      //   .update({ deleted_at: new Date().toISOString() })
      //   .eq('id', id)

      // Temporary: Hard delete until migration is applied
      const { error: deleteError } = await supabase.from('projects').delete().eq('id', id)

      if (deleteError) {
        logger.error(
          'Fehler beim Löschen des Projekts',
          {
            component: 'api/projects/delete',
            projectId: id,
          },
          deleteError
        )
        throw deleteError
      }

      // Audit-Eintrag direkt schreiben (Service-Client, gleiche company_id wie beim Lesen – zuverlässig)
      const companyIdStr = typeof companyId === 'string' ? companyId : String(companyId ?? '')
      const serviceSupabase = await createServiceClient()
      const { error: auditError } = await serviceSupabase.from('audit_logs').insert({
        user_id: user.id,
        company_id: companyIdStr,
        action: 'project.deleted',
        entity_type: 'project',
        entity_id: id,
        changes: {
          before: {
            customerName: projectData.customer_name,
            orderNumber: projectData.order_number,
            status: projectData.status,
            totalAmount: projectData.total_amount,
          },
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        request_id: null,
        metadata: { deletedAt: new Date().toISOString(), deletedBy: user.id },
      })
      if (auditError) {
        logger.error('Audit-Eintrag bei Projekt-Löschung fehlgeschlagen', {
          component: 'api/projects/delete',
          projectId: id,
          message: auditError.message,
          code: auditError.code,
        }, auditError)
      }

      logger.info('Projekt gelöscht', {
        component: 'api/projects/delete',
        projectId: id,
        orderNumber: projectData.order_number,
        userId: user.id,
      })

      return NextResponse.json({
        success: true,
        message: 'Projekt erfolgreich gelöscht',
        orderNumber: projectData.order_number,
      })
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unbekannter Fehler'
      logger.error(
        'Fehler beim Löschen des Projekts',
        {
          component: 'api/projects/delete',
          projectId: id,
        },
        error as Error
      )

      if (errMsg.includes('nicht gefunden')) {
        return apiErrors.notFound({ component: 'api/projects/delete', projectId: id })
      }

      return apiErrors.internal(error as Error, { component: 'api/projects/delete', projectId: id })
    }
  } catch (error: unknown) {
    logger.error(
      'Unerwarteter Fehler beim Löschen des Projekts',
      {
        component: 'api/projects/delete',
      },
      error as Error
    )
    return apiErrors.internal(error as Error, { component: 'api/projects/delete' })
  }
}
