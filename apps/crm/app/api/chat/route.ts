import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { agentTools } from '@/lib/ai/agentTools'
import { buildSystemInstruction } from '@/lib/ai/systemInstruction'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { rateLimit } from '@/lib/middleware/rateLimit'
import { apiErrors } from '@/lib/utils/errorHandling'
import { parseChatRequest } from './request'
import { buildProjectSummaryFromSupabase } from './summaryContext'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
const MODEL = 'gemini-3-flash-preview'

type ServerClient = Awaited<ReturnType<typeof createClient>>

interface AuthorizedChatContext {
  supabase: ServerClient
  userId: string
}

async function authorizeChatRequest(
  request: NextRequest,
): Promise<AuthorizedChatContext | Response> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return apiErrors.unauthorized()
  }

  const limitCheck = await rateLimit(request, user.id)
  if (limitCheck && !limitCheck.allowed) {
    return apiErrors.rateLimit(limitCheck.resetTime)
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

  return {
    supabase,
    userId: user.id,
  }
}

export async function POST(request: NextRequest) {
  const apiLogger = logger.api('/api/chat', 'POST')
  const startTime = apiLogger.start()

  try {
    const auth = await authorizeChatRequest(request)
    if (auth instanceof Response) {
      return auth
    }

    if (!process.env.GEMINI_API_KEY) {
      apiLogger.error(new Error('GEMINI_API_KEY is not configured'), 500)
      return apiErrors.internal(new Error('GEMINI_API_KEY is not configured'), { component: 'chat' })
    }

    const body = await request.json()
    const parsedRequest = parseChatRequest(body)
    if (!parsedRequest.ok) {
      apiLogger.error(new Error(parsedRequest.message), 400)
      return apiErrors.validation({
        component: 'api/chat',
        validationMessage: parsedRequest.message,
      })
    }

    logger.info('Chat API request received', {
      component: 'api/chat',
      projectsCount: parsedRequest.data.projects.length,
      messageLength: parsedRequest.data.message.length,
    })

    const projectSummary = await buildProjectSummaryFromSupabase(
      auth.supabase,
      parsedRequest.data.projects,
    )

    logger.debug('Using AI model', {
      component: 'api/chat',
      model: MODEL,
      messageLength: parsedRequest.data.message.length,
    })

    const chat = ai.chats.create({
      model: MODEL,
      config: {
        systemInstruction: buildSystemInstruction({ projectSummary, variant: 'route' }),
        tools: [{ functionDeclarations: agentTools }],
      },
    })

    const response = await chat.sendMessage({ message: parsedRequest.data.message })
    const duration = Date.now() - startTime

    apiLogger.end(startTime, 200)
    logger.info('Chat API response received', {
      component: 'api/chat',
      duration: `${duration}ms`,
      hasFunctionCalls: Boolean(response.functionCalls?.length),
    })

    const functionCalls =
      response.functionCalls?.map((functionCall) => ({
        id: functionCall.id || Date.now().toString(),
        name: functionCall.name || 'unknown',
        args: functionCall.args || {},
      })) || []

    return NextResponse.json({
      text: response.text || '',
      functionCalls,
      duration: `${duration}ms`,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    apiLogger.error(error as Error, 500)
    logger.error(
      'Chat API error',
      {
        component: 'api/chat',
        duration: `${duration}ms`,
      },
      error as Error,
    )
    return apiErrors.internal(error as Error, { component: 'chat' })
  }
}
