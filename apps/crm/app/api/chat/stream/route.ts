import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { rateLimit } from '@/lib/middleware/rateLimit'
import { apiErrors } from '@/lib/utils/errorHandling'
import { buildChatStreamContext } from './context'
import { parseChatStreamRequest } from './request'
import { createChatStreamResponse } from './sse'

export const runtime = 'nodejs'
export const maxDuration = 60

type ServerClient = Awaited<ReturnType<typeof createClient>>

interface AuthorizedContext {
  supabase: ServerClient
  userId: string
  companyId: string
}

async function authorizeRequest(request: NextRequest): Promise<AuthorizedContext | Response> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return apiErrors.unauthorized()
  }

  if (user.app_metadata?.role === 'customer') {
    return apiErrors.forbidden()
  }

  const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
  if (companyError || !companyId) {
    return apiErrors.forbidden()
  }

  const { data: hasPermission, error: permError } = await supabase.rpc('has_permission', {
    p_permission_code: 'edit_projects',
  })
  if (permError || !hasPermission) {
    return apiErrors.forbidden()
  }

  const limitCheck = await rateLimit(request, user.id)
  if (limitCheck && !limitCheck.allowed) {
    return apiErrors.rateLimit(limitCheck.resetTime)
  }

  return {
    supabase,
    userId: user.id,
    companyId,
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const auth = await authorizeRequest(request)
    if (auth instanceof Response) {
      return auth
    }

    if (!process.env.GEMINI_API_KEY) {
      return apiErrors.internal(new Error('GEMINI_API_KEY is not configured'), {
        component: 'chat-stream',
      })
    }

    const bodyText = await request.text()
    const parseResult = parseChatStreamRequest(bodyText)

    if (!parseResult.ok) {
      if (parseResult.kind === 'parse') {
        logger.error(
          'Chat Stream API JSON parse error',
          {
            component: 'api/chat/stream',
            message: parseResult.message,
          },
          new Error(parseResult.message),
        )
        return apiErrors.badRequest()
      }

      return apiErrors.validation()
    }

    logger.info('Chat Stream API request body size', {
      component: 'api/chat/stream',
      bodySizeMB: parseResult.bodySizeMB.toFixed(2),
    })

    if (parseResult.bodySizeMB > 10) {
      logger.warn('Chat Stream API request body sehr gross', {
        component: 'api/chat/stream',
        bodySizeMB: parseResult.bodySizeMB.toFixed(2),
      })
    }

    logger.info('Chat Stream API request received', {
      component: 'api/chat/stream',
      projectsCount: parseResult.data.projects.length,
    })

    const { projectSummary, appointmentsSummary } = await buildChatStreamContext(
      auth.supabase,
      auth.companyId,
      parseResult.data.projects,
    )

    return createChatStreamResponse({
      message: parseResult.data.message,
      chatHistory: parseResult.data.chatHistory,
      projectSummary,
      appointmentsSummary,
      supabase: auth.supabase,
      userId: auth.userId,
      requestStartedAt: startTime,
    })
  } catch (error) {
    logger.error(
      'Chat Stream API error',
      {
        component: 'api/chat/stream',
      },
      error as Error,
    )
    return apiErrors.internal(error as Error, { component: 'chat-stream' })
  }
}
