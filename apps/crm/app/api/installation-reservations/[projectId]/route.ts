import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiErrors } from '@/lib/utils/errorHandling'
import {
  INSTALLATION_RESERVATION_MIGRATION_HINT,
  PLAN_DOCUMENT_TYPES,
  isReservationSchemaMissing,
  mapInstallationReservation,
  type InstallationReservationRow,
} from '../helpers'

interface ProjectScopeRow {
  id: string
}

interface PlanDocumentRow {
  id: string
  name: string
  mime_type: string
  file_size: number | null
  type: string | null
  uploaded_at: string | null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return apiErrors.unauthorized({ component: 'api/installation-reservations/get' })
    }

    if (user.app_metadata?.role === 'customer') {
      return apiErrors.forbidden({ component: 'api/installation-reservations/get' })
    }

    const { data: hasPermission, error: permissionError } = await supabase.rpc('has_permission', {
      p_permission_code: 'edit_projects',
    })

    if (permissionError || !hasPermission) {
      return apiErrors.forbidden({ component: 'api/installation-reservations/get' })
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (projectError) {
      return apiErrors.internal(new Error(projectError.message), {
        component: 'api/installation-reservations/get',
      })
    }

    if (!(project as ProjectScopeRow | null)?.id) {
      return apiErrors.notFound({ component: 'api/installation-reservations/get', projectId })
    }

    const [reservationResult, planDocumentsResult] = await Promise.all([
      supabase
        .from('installation_reservations')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('documents')
        .select('id, name, mime_type, file_size, type, uploaded_at')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .in('type', [...PLAN_DOCUMENT_TYPES])
        .order('uploaded_at', { ascending: false }),
    ])

    if (reservationResult.error && !isReservationSchemaMissing(reservationResult.error)) {
      return apiErrors.internal(new Error(reservationResult.error.message), {
        component: 'api/installation-reservations/get',
      })
    }

    if (planDocumentsResult.error) {
      return apiErrors.internal(new Error(planDocumentsResult.error.message), {
        component: 'api/installation-reservations/get',
      })
    }

    const reservation = reservationResult.data
      ? mapInstallationReservation(reservationResult.data as InstallationReservationRow)
      : null

    return NextResponse.json({
      success: true,
      data: {
        reservation,
        reservationSchemaMissing:
          Boolean(reservationResult.error) && isReservationSchemaMissing(reservationResult.error),
        migrationHint:
          reservationResult.error && isReservationSchemaMissing(reservationResult.error)
            ? INSTALLATION_RESERVATION_MIGRATION_HINT
            : null,
        planDocuments: ((planDocumentsResult.data || []) as PlanDocumentRow[]).map((doc) => ({
          id: doc.id,
          name: doc.name,
          mimeType: doc.mime_type,
          fileSize: doc.file_size,
          type: doc.type,
          uploadedAt: doc.uploaded_at,
        })),
      },
    })
  } catch (error) {
    return apiErrors.internal(error as Error, {
      component: 'api/installation-reservations/get',
    })
  }
}
