import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { apiErrors } from '@/lib/utils/errorHandling'
import { createTaskForCompany, listTasksForCompany } from '@/lib/supabase/services/tasks'
import { requireVoiceRouteAccess } from '@/lib/voice/routeAccess'

const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  dueAt: z.string().datetime().optional(),
  assignedUserId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
})

function startOfTodayIso(): string {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now.toISOString()
}

function endOfTodayIso(): string {
  const now = new Date()
  now.setHours(23, 59, 59, 999)
  return now.toISOString()
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireVoiceRouteAccess({ request, requireInboxPermission: true })
    if (access instanceof Response) {
      return access
    }

    const preset = request.nextUrl.searchParams.get('preset') || 'open'
    const limitRaw = request.nextUrl.searchParams.get('limit')
    const limit = Number.parseInt(limitRaw || '120', 10)

    if (preset === 'today') {
      const result = await listTasksForCompany(access.serviceSupabase, access.companyId, {
        statuses: ['open', 'in_progress'],
        dueAfter: startOfTodayIso(),
        dueBefore: endOfTodayIso(),
        limit,
      })

      if (!result.ok) {
        return apiErrors.internal(new Error(result.message), { component: 'api/tasks' })
      }

      return NextResponse.json({ success: true, data: result.data })
    }

    if (preset === 'overdue') {
      const result = await listTasksForCompany(access.serviceSupabase, access.companyId, {
        statuses: ['open', 'in_progress'],
        dueBefore: new Date().toISOString(),
        limit,
      })

      if (!result.ok) {
        return apiErrors.internal(new Error(result.message), { component: 'api/tasks' })
      }

      return NextResponse.json({ success: true, data: result.data })
    }

    if (preset === 'completed') {
      const result = await listTasksForCompany(access.serviceSupabase, access.companyId, {
        statuses: ['completed'],
        includeCompleted: true,
        limit,
      })

      if (!result.ok) {
        return apiErrors.internal(new Error(result.message), { component: 'api/tasks' })
      }

      return NextResponse.json({ success: true, data: result.data })
    }

    if (preset === 'all') {
      const result = await listTasksForCompany(access.serviceSupabase, access.companyId, {
        includeCompleted: true,
        limit,
      })

      if (!result.ok) {
        return apiErrors.internal(new Error(result.message), { component: 'api/tasks' })
      }

      return NextResponse.json({ success: true, data: result.data })
    }

    const result = await listTasksForCompany(access.serviceSupabase, access.companyId, {
      statuses: ['open', 'in_progress'],
      limit,
    })

    if (!result.ok) {
      return apiErrors.internal(new Error(result.message), { component: 'api/tasks' })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    return apiErrors.internal(error as Error, { component: 'api/tasks' })
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireVoiceRouteAccess({ request, requireInboxPermission: true })
    if (access instanceof Response) {
      return access
    }

    const body = await request.json().catch(() => ({}))
    const parsed = CreateTaskSchema.safeParse(body)
    if (!parsed.success) {
      return apiErrors.validation({
        component: 'api/tasks',
        validationMessage: parsed.error.issues[0]?.message || 'Ungültige Eingabedaten.',
      })
    }

    const result = await createTaskForCompany(access.serviceSupabase, {
      companyId: access.companyId,
      userId: access.user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority,
      dueAt: parsed.data.dueAt,
      assignedUserId: parsed.data.assignedUserId,
      projectId: parsed.data.projectId,
      source: 'manual',
    })

    if (!result.ok) {
      return apiErrors.internal(new Error(result.message), { component: 'api/tasks' })
    }

    return NextResponse.json({ success: true, data: result.data }, { status: 201 })
  } catch (error) {
    return apiErrors.internal(error as Error, { component: 'api/tasks' })
  }
}
