import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export async function GET(request: NextRequest) {
  try {
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
