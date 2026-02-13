import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { apiErrors } from '@/lib/utils/errorHandling'
import { deleteTaskForCompany, updateTaskForCompany } from '@/lib/supabase/services/tasks'
import { requireVoiceRouteAccess } from '@/lib/voice/routeAccess'

const UpdateTaskSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).nullable().optional(),
    status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).optional(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
    dueAt: z.string().datetime().nullable().optional(),
    assignedUserId: z.string().uuid().nullable().optional(),
    projectId: z.string().uuid().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Mindestens ein Feld muss aktualisiert werden.',
  })

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const access = await requireVoiceRouteAccess({ request, requireInboxPermission: true })
    if (access instanceof Response) {
      return access
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const parsed = UpdateTaskSchema.safeParse(body)

    if (!parsed.success) {
      return apiErrors.validation({
        component: 'api/tasks/[id]',
        validationMessage: parsed.error.issues[0]?.message || 'Ungültige Eingabedaten.',
      })
    }

    const result = await updateTaskForCompany(access.serviceSupabase, access.companyId, id, {
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.status,
      priority: parsed.data.priority,
      dueAt: parsed.data.dueAt,
      assignedUserId: parsed.data.assignedUserId,
      projectId: parsed.data.projectId,
      completedByUserId:
        parsed.data.status === 'completed'
          ? access.user.id
          : parsed.data.status != null
            ? null
            : undefined,
    })

    if (!result.ok) {
      if (result.code === 'NOT_FOUND') {
        return apiErrors.notFound({ component: 'api/tasks/[id]', id })
      }
      return apiErrors.internal(new Error(result.message), { component: 'api/tasks/[id]' })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    return apiErrors.internal(error as Error, { component: 'api/tasks/[id]' })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const access = await requireVoiceRouteAccess({ request, requireInboxPermission: true })
    if (access instanceof Response) {
      return access
    }

    const { id } = await params
    const result = await deleteTaskForCompany(access.serviceSupabase, access.companyId, id)

    if (!result.ok) {
      return apiErrors.internal(new Error(result.message), { component: 'api/tasks/[id]' })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return apiErrors.internal(error as Error, { component: 'api/tasks/[id]' })
  }
}
