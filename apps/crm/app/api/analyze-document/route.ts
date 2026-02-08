import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/middleware/rateLimit'
import { apiErrors } from '@/lib/utils/errorHandling'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export async function POST(request: NextRequest) {
  try {
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

    if (!process.env.GEMINI_API_KEY) {
      return apiErrors.internal(new Error('GEMINI_API_KEY is not configured'), { component: 'analyze-document' })
    }

    const { base64Data, mimeType, prompt } = await request.json()
    if (!base64Data || !mimeType) {
      return apiErrors.badRequest()
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            {
              text: `Extrahiere ALLES für den Chef: Artikel, EK-Preise, Lieferdatum, Auftragsnummer. Nutzer-Frage: ${prompt}`,
            },
          ],
        },
      ],
    })

    return NextResponse.json({ analysis: response.text })
  } catch (error: unknown) {
    return apiErrors.internal(error as Error, { component: 'analyze-document' })
  }
}
