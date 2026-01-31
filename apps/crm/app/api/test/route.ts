import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export async function GET() {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

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
      apiKeyConfigured: !!process.env.GEMINI_API_KEY,
    })
  } catch (error: unknown) {
    console.error('Test API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test API',
        apiKeyConfigured: !!process.env.GEMINI_API_KEY,
      },
      { status: 500 }
    )
  }
}
