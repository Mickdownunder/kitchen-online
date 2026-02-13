import type { SupabaseClient } from '@supabase/supabase-js'
import { fail, ok, type ServiceResult } from '@/lib/types/service'
import type { Database } from '@/types/database.types'
import type { Task, TaskPriority, TaskSource, TaskStatus } from '@/types'
import { supabase } from '../client'
import { getCurrentUser } from './auth'
import { getCurrentCompanyId } from './permissions'

type DbClient = SupabaseClient<Database>
type TaskRow = Database['public']['Tables']['tasks']['Row']
type TaskInsert = Database['public']['Tables']['tasks']['Insert']
type TaskUpdate = Database['public']['Tables']['tasks']['Update']

interface DbErrorLike {
  message?: string
  code?: string
  details?: string
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  const dbError = (error || {}) as DbErrorLike
  const parts: string[] = []

  if (typeof dbError.message === 'string' && dbError.message.trim().length > 0) {
    parts.push(dbError.message.trim())
  }
  if (typeof dbError.details === 'string' && dbError.details.trim().length > 0) {
    parts.push(dbError.details.trim())
  }
  if (typeof dbError.code === 'string' && dbError.code.trim().length > 0) {
    parts.push(`Code: ${dbError.code.trim()}`)
  }

  return parts.length > 0 ? parts.join(' | ') : fallback
}

function mapTaskFromDb(row: TaskRow): Task {
  return {
    id: row.id,
    companyId: row.company_id,
    userId: row.user_id,
    assignedUserId: row.assigned_user_id || undefined,
    completedByUserId: row.completed_by_user_id || undefined,
    projectId: row.project_id || undefined,
    title: row.title,
    description: row.description || undefined,
    status: row.status as TaskStatus,
    priority: row.priority as TaskPriority,
    source: row.source as TaskSource,
    dueAt: row.due_at || undefined,
    completedAt: row.completed_at || undefined,
    metadata:
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

interface TaskMutationInput {
  companyId: string
  userId: string
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  source?: TaskSource
  dueAt?: string
  assignedUserId?: string
  projectId?: string
  metadata?: Record<string, unknown>
}

interface TaskListFilters {
  statuses?: TaskStatus[]
  includeCompleted?: boolean
  dueBefore?: string
  dueAfter?: string
  assignedUserId?: string
  limit?: number
}

function normalizeTaskInsert(input: TaskMutationInput): TaskInsert {
  return {
    company_id: input.companyId,
    user_id: input.userId,
    title: input.title,
    description: input.description || null,
    status: input.status || 'open',
    priority: input.priority || 'normal',
    source: input.source || 'manual',
    due_at: input.dueAt || null,
    assigned_user_id: input.assignedUserId || null,
    project_id: input.projectId || null,
    metadata: (input.metadata || {}) as TaskInsert['metadata'],
  }
}

function normalizeTaskUpdate(input: {
  title?: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  dueAt?: string | null
  assignedUserId?: string | null
  completedByUserId?: string | null
  projectId?: string | null
  metadata?: Record<string, unknown>
}): TaskUpdate {
  const update: TaskUpdate = {}

  if (input.title !== undefined) update.title = input.title
  if (input.description !== undefined) update.description = input.description
  if (input.status !== undefined) update.status = input.status
  if (input.priority !== undefined) update.priority = input.priority
  if (input.dueAt !== undefined) update.due_at = input.dueAt
  if (input.assignedUserId !== undefined) update.assigned_user_id = input.assignedUserId
  if (input.completedByUserId !== undefined) update.completed_by_user_id = input.completedByUserId
  if (input.projectId !== undefined) update.project_id = input.projectId
  if (input.metadata !== undefined) update.metadata = input.metadata as TaskUpdate['metadata']

  if (input.status === 'completed') {
    update.completed_at = new Date().toISOString()
  }
  if (input.status && input.status !== 'completed') {
    update.completed_at = null
  }

  return update
}

export async function listTasksForCompany(
  client: DbClient,
  companyId: string,
  filters: TaskListFilters = {},
): Promise<ServiceResult<Task[]>> {
  try {
    const limit = Number.isFinite(filters.limit) ? Math.max(1, Math.min(200, filters.limit || 100)) : 100

    let query = client
      .from('tasks')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (filters.statuses && filters.statuses.length > 0) {
      query = query.in('status', filters.statuses)
    } else if (filters.includeCompleted !== true) {
      query = query.neq('status', 'completed')
    }

    if (filters.assignedUserId) {
      query = query.eq('assigned_user_id', filters.assignedUserId)
    }

    if (filters.dueBefore) {
      query = query.lte('due_at', filters.dueBefore)
    }
    if (filters.dueAfter) {
      query = query.gte('due_at', filters.dueAfter)
    }

    const { data, error } = await query
    if (error) {
      return fail('INTERNAL', toErrorMessage(error, 'Tasks konnten nicht geladen werden.'), error)
    }

    return ok((data || []).map(mapTaskFromDb))
  } catch (error) {
    return fail('INTERNAL', toErrorMessage(error, 'Tasks konnten nicht geladen werden.'), error)
  }
}

export async function createTaskForCompany(
  client: DbClient,
  input: TaskMutationInput,
): Promise<ServiceResult<Task>> {
  try {
    const { data, error } = await client
      .from('tasks')
      .insert(normalizeTaskInsert(input))
      .select('*')
      .single()

    if (error) {
      return fail('INTERNAL', toErrorMessage(error, 'Task konnte nicht erstellt werden.'), error)
    }

    return ok(mapTaskFromDb(data))
  } catch (error) {
    return fail('INTERNAL', toErrorMessage(error, 'Task konnte nicht erstellt werden.'), error)
  }
}

export async function updateTaskForCompany(
  client: DbClient,
  companyId: string,
  taskId: string,
  input: Parameters<typeof normalizeTaskUpdate>[0],
): Promise<ServiceResult<Task>> {
  try {
    const update = normalizeTaskUpdate(input)

    const { data, error } = await client
      .from('tasks')
      .update(update)
      .eq('id', taskId)
      .eq('company_id', companyId)
      .select('*')
      .single()

    if (error) {
      const code = (error as DbErrorLike).code
      if (code === 'PGRST116') {
        return fail('NOT_FOUND', `Task ${taskId} wurde nicht gefunden.`)
      }
      return fail('INTERNAL', toErrorMessage(error, 'Task konnte nicht aktualisiert werden.'), error)
    }

    return ok(mapTaskFromDb(data))
  } catch (error) {
    return fail('INTERNAL', toErrorMessage(error, 'Task konnte nicht aktualisiert werden.'), error)
  }
}

export async function deleteTaskForCompany(
  client: DbClient,
  companyId: string,
  taskId: string,
): Promise<ServiceResult<void>> {
  try {
    const { error } = await client
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('company_id', companyId)

    if (error) {
      return fail('INTERNAL', toErrorMessage(error, 'Task konnte nicht gelöscht werden.'), error)
    }

    return ok(undefined)
  } catch (error) {
    return fail('INTERNAL', toErrorMessage(error, 'Task konnte nicht gelöscht werden.'), error)
  }
}

export async function getTasks(filters: TaskListFilters = {}): Promise<ServiceResult<Task[]>> {
  const user = await getCurrentUser()
  if (!user) {
    return fail('UNAUTHORIZED', 'Nicht authentifiziert.')
  }

  const companyId = await getCurrentCompanyId()
  if (!companyId) {
    return fail('FORBIDDEN', 'Keine Firma zugeordnet.')
  }

  return listTasksForCompany(supabase as unknown as DbClient, companyId, filters)
}

export async function createTask(
  input: Omit<TaskMutationInput, 'companyId' | 'userId'>,
): Promise<ServiceResult<Task>> {
  const user = await getCurrentUser()
  if (!user) {
    return fail('UNAUTHORIZED', 'Nicht authentifiziert.')
  }

  const companyId = await getCurrentCompanyId()
  if (!companyId) {
    return fail('FORBIDDEN', 'Keine Firma zugeordnet.')
  }

  return createTaskForCompany(supabase as unknown as DbClient, {
    ...input,
    companyId,
    userId: user.id,
  })
}

export async function updateTask(
  taskId: string,
  input: Parameters<typeof normalizeTaskUpdate>[0],
): Promise<ServiceResult<Task>> {
  const companyId = await getCurrentCompanyId()
  if (!companyId) {
    return fail('FORBIDDEN', 'Keine Firma zugeordnet.')
  }

  return updateTaskForCompany(supabase as unknown as DbClient, companyId, taskId, input)
}

export async function deleteTask(taskId: string): Promise<ServiceResult<void>> {
  const companyId = await getCurrentCompanyId()
  if (!companyId) {
    return fail('FORBIDDEN', 'Keine Firma zugeordnet.')
  }

  return deleteTaskForCompany(supabase as unknown as DbClient, companyId, taskId)
}
