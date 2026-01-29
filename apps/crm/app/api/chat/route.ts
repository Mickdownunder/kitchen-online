import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import type { CustomerProject } from '@/types'
import { agentTools } from '@/lib/ai/agentTools'
import { buildProjectSummary } from '@/lib/ai/projectSummary'
import { buildSystemInstruction } from '@/lib/ai/systemInstruction'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

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
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    // Check company context
    const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
    if (companyError || !companyId) {
      apiLogger.error(new Error('No company assigned'), 403)
      return NextResponse.json({ error: 'Keine Firma zugeordnet' }, { status: 403 })
    }

    // Check permission - AI can mutate data, so requires edit_projects
    const { data: hasPermission, error: permError } = await supabase.rpc('has_permission', {
      p_permission_code: 'edit_projects',
    })
    if (permError || !hasPermission) {
      apiLogger.error(new Error('No permission'), 403)
      return NextResponse.json(
        { error: 'Keine Berechtigung zur Nutzung des AI-Assistenten' },
        { status: 403 }
      )
    }

    const { message, projects } = (await request.json()) as {
      message: string
      projects?: CustomerProject[]
      chatId?: string
    }

    if (!process.env.GEMINI_API_KEY) {
      apiLogger.error(new Error('GEMINI_API_KEY is not configured'), 500)
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 })
    }

    logger.info('Chat API request received', {
      component: 'api/chat',
      projectsCount: projects?.length || 0,
      messageLength: message.length,
    })

    const projectSummary = buildProjectSummary(projects)

    // Use flash model for faster responses
    const useFlashModel =
      !message.toLowerCase().includes('komplex') &&
      !message.toLowerCase().includes('detailliert') &&
      message.length < 1000
    const model = useFlashModel ? 'gemini-3-flash-preview' : 'gemini-3-pro-preview'

    logger.debug('Using AI model', {
      component: 'api/chat',
      model,
      messageLength: message.length,
      useFlashModel,
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
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process chat message',
        duration: `${duration}ms`,
      },
      { status: 500 }
    )
  }
}
