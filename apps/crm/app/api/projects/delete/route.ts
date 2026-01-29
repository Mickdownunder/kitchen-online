import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuditEvent } from '@/lib/supabase/services/audit'
import { logger } from '@/lib/utils/logger'

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Fehlende Parameter: id ist erforderlich' },
        { status: 400 }
      )
    }

    const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
    if (companyError || !companyId) {
      return NextResponse.json({ error: 'Keine Firma zugeordnet' }, { status: 403 })
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
      return NextResponse.json(
        { error: 'Keine Berechtigung zum Löschen von Projekten' },
        { status: 403 }
      )
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
        return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
      }

      // TODO: Re-enable soft delete after applying migration: supabase/migrations/20260126113814_add_deleted_at_to_projects.sql
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

      // Logge Audit-Event
      try {
        await logAuditEvent({
          action: 'project.deleted',
          entityType: 'project',
          entityId: id,
          changes: {
            before: {
              customerName: projectData.customer_name,
              orderNumber: projectData.order_number,
              status: projectData.status,
              totalAmount: projectData.total_amount,
            },
            after: undefined,
          },
          metadata: {
            deletedAt: new Date().toISOString(),
            deletedBy: user.id,
          },
        })
      } catch (auditError) {
        logger.warn(
          'Fehler beim Loggen des Audit-Events',
          {
            component: 'api/projects/delete',
          },
          auditError as Error
        )
        // Nicht abbrechen, Löschung war erfolgreich
      }

      logger.info('Projekt gelöscht (soft delete)', {
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
        return NextResponse.json({ error: errMsg }, { status: 404 })
      }

      return NextResponse.json(
        { error: errMsg || 'Fehler beim Löschen des Projekts' },
        { status: 500 }
      )
    }
  } catch (error: unknown) {
    logger.error(
      'Unerwarteter Fehler beim Löschen des Projekts',
      {
        component: 'api/projects/delete',
      },
      error as Error
    )
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Serverfehler' },
      { status: 500 }
    )
  }
}
