import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export async function GET() {
  // In Production: Komplett blockieren ohne Informationen zu leaken
  if (process.env.NODE_ENV === 'production') {
    return new Response(null, { status: 404 })
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    if (user.app_metadata?.role === 'customer') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const startTime = Date.now()

    // Test with a simple request
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // Using flash for faster response
      contents: [{ parts: [{ text: 'Say hello in German' }] }],
    })

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      message: response.text || 'No response',
      duration: `${duration}ms`,
    })
  } catch (error: unknown) {
    logger.error('Test API error', { component: 'api/test' }, error as Error)
    // Keine Details in Error-Response
    return NextResponse.json(
      { success: false, error: 'Test fehlgeschlagen' },
      { status: 500 }
    )
  }
}
