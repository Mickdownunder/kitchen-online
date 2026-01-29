import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const { base64Data, mimeType, prompt } = await request.json()

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
    console.error('Document analysis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze document' },
      { status: 500 }
    )
  }
}
