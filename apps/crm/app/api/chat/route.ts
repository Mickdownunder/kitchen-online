import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import type { CustomerProject } from '@/types'
import { agentTools } from '@/lib/ai/agentTools'
import { buildProjectSummary } from '@/lib/ai/projectSummary'
import { buildSystemInstruction } from '@/lib/ai/systemInstruction'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { rateLimit } from '@/lib/middleware/rateLimit'
import { apiErrors } from '@/lib/utils/errorHandling'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export async function POST(request: NextRequest) {
  const apiLogger = logger.api('/api/chat', 'POST')
  const startTime = apiLogger.start()

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      apiLogger.error(new Error('Not authenticated'), 401)
      return apiErrors.unauthorized()
    }

    const limitCheck = await rateLimit(request, user.id)
    if (limitCheck && !limitCheck.allowed) {
      return apiErrors.rateLimit(limitCheck.resetTime)
    }

    if (user.app_metadata?.role === 'customer') {
      apiLogger.error(new Error('No permission - customer role'), 403)
      return apiErrors.forbidden()
    }

    // GEMINI_API_KEY vor Body prüfen (fail fast)
    if (!process.env.GEMINI_API_KEY) {
      apiLogger.error(new Error('GEMINI_API_KEY is not configured'), 500)
      return apiErrors.internal(new Error('GEMINI_API_KEY is not configured'), { component: 'chat' })
    }

    // Check company context
    const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
    if (companyError || !companyId) {
      apiLogger.error(new Error('No company assigned'), 403)
      return apiErrors.forbidden()
    }

    // Check permission - AI can mutate data, so requires edit_projects
    const { data: hasPermission, error: permError } = await supabase.rpc('has_permission', {
      p_permission_code: 'edit_projects',
    })
    if (permError || !hasPermission) {
      apiLogger.error(new Error('No permission'), 403)
      return apiErrors.forbidden()
    }

    const body = (await request.json()) as {
      message: string
      projects?: CustomerProject[]
      chatId?: string
    }
    const message = typeof body.message === 'string' ? body.message : ''
    const projectList = Array.isArray(body.projects) ? body.projects : []

    const MAX_MESSAGE_LENGTH = 10_000
    const MAX_PROJECTS = 500
    if (message.length > MAX_MESSAGE_LENGTH) {
      apiLogger.error(new Error('Message too long'), 400)
      return apiErrors.validation()
    }
    if (projectList.length > MAX_PROJECTS) {
      apiLogger.error(new Error('Too many projects'), 400)
      return apiErrors.validation()
    }

    logger.info('Chat API request received', {
      component: 'api/chat',
      projectsCount: projectList.length,
      messageLength: message.length,
    })

    const projectIds = projectList.map(p => p.id).filter(Boolean)
    let invoicesForSummary: import('@/types').Invoice[] = []
    if (projectIds.length > 0) {
      const { data: invoicesRows } = await supabase
        .from('invoices')
        .select('id, project_id, type, invoice_number, amount, is_paid, net_amount, tax_amount, tax_rate, invoice_date, due_date, paid_date, description, notes, schedule_type, reminders, created_at, updated_at, user_id')
        .in('project_id', projectIds)
      if (invoicesRows?.length) {
        invoicesForSummary = invoicesRows.map((row: Record<string, unknown>) => ({
          id: String(row.id),
          userId: String(row.user_id ?? ''),
          projectId: String(row.project_id ?? ''),
          type: String(row.type ?? 'partial'),
          invoiceNumber: String(row.invoice_number ?? ''),
          amount: Number(row.amount ?? 0),
          netAmount: Number(row.net_amount ?? 0),
          taxAmount: Number(row.tax_amount ?? 0),
          taxRate: Number(row.tax_rate ?? 20),
          isPaid: Boolean(row.is_paid),
          invoiceDate: row.invoice_date ? String(row.invoice_date) : '',
          dueDate: row.due_date ? String(row.due_date) : undefined,
          paidDate: row.paid_date ? String(row.paid_date) : undefined,
          description: row.description ? String(row.description) : undefined,
          notes: row.notes ? String(row.notes) : undefined,
          scheduleType: row.schedule_type ? String(row.schedule_type) : undefined,
          reminders: Array.isArray(row.reminders) ? row.reminders : [],
          createdAt: row.created_at ? String(row.created_at) : undefined,
          updatedAt: row.updated_at ? String(row.updated_at) : undefined,
        })) as import('@/types').Invoice[]
      }
    }

    const projectSummary = buildProjectSummary(projectList, invoicesForSummary)

    // Use Flash model for all requests (fast + capable)
    const model = 'gemini-3-flash-preview'

    logger.debug('Using AI model', {
      component: 'api/chat',
      model,
      messageLength: message.length,
    })

    const chat = ai.chats.create({
      model,
      config: {
        systemInstruction: buildSystemInstruction({ projectSummary, variant: 'route' }),
        tools: [{ functionDeclarations: agentTools }],
      },
    })

    const response = await chat.sendMessage({ message })
    const duration = Date.now() - startTime

    apiLogger.end(startTime, 200)
    logger.info('Chat API response received', {
      component: 'api/chat',
      duration: `${duration}ms`,
      hasFunctionCalls: !!response.functionCalls?.length,
    })

    const functionCalls =
      response.functionCalls?.map(fc => ({
        id: fc.id || Date.now().toString(),
        name: fc.name || 'unknown',
        args: fc.args || {},
      })) || []

    return NextResponse.json({
      text: response.text || '',
      functionCalls,
      duration: `${duration}ms`,
    })
  } catch (error: unknown) {
    const duration = Date.now() - startTime
    apiLogger.error(error as Error, 500)
    logger.error(
      'Chat API error',
      {
        component: 'api/chat',
        duration: `${duration}ms`,
      },
      error as Error
    )
    return apiErrors.internal(error as Error, { component: 'chat' })
  }
}
