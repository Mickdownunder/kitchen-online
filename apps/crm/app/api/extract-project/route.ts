import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI, Type } from '@google/genai'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
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

    const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
    if (companyError || !companyId) {
      return NextResponse.json({ error: 'Keine Firma zugeordnet' }, { status: 403 })
    }

    const { data: hasPermission, error: permError } = await supabase.rpc('has_permission', {
      p_permission_code: 'edit_projects',
    })
    if (permError || !hasPermission) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // Prüfe API-Key
    if (!process.env.GEMINI_API_KEY) {
      logger.error('GEMINI_API_KEY is not configured', { component: 'extract-project' })
      return NextResponse.json({ error: 'KI-API-Key ist nicht konfiguriert' }, { status: 500 })
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

    // Validiere Eingabedaten
    const { base64Data, mimeType } = await request.json()

    if (!base64Data) {
      return NextResponse.json({ error: 'base64Data ist erforderlich' }, { status: 400 })
    }

    if (!mimeType) {
      return NextResponse.json({ error: 'mimeType ist erforderlich' }, { status: 400 })
    }

    logger.debug('Starting AI extraction', { component: 'extract-project' })

    // AI-Anfrage
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          {
            text: 'Extrahiere Kunden- und Projektdaten für einen Neuauftrag aus diesem Dokument. Extrahiere alle verfügbaren Informationen: Kundenname, Adresse, Telefon, E-Mail, Auftragsnummer, Gesamtbetrag und Notizen. Antworte im JSON-Format.',
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            customerName: { type: Type.STRING },
            address: { type: Type.STRING },
            phone: { type: Type.STRING },
            email: { type: Type.STRING },
            orderNumber: { type: Type.STRING },
            totalAmount: { type: Type.NUMBER },
            notes: { type: Type.STRING },
          },
          required: ['customerName'],
        },
      },
    })

    logger.debug('AI response received', { component: 'extract-project' })

    // Parse Response
    let extracted: {
      customerName?: string
      orderNumber?: string
      totalAmount?: number
      notes?: string
      [key: string]: unknown
    } = {}

    try {
      // Prüfe ob response.text existiert
      if (response.text) {
        extracted = JSON.parse(response.text)
      } else {
        logger.warn('No text in response, using empty object', { component: 'extract-project' })
        extracted = {}
      }

      // Validiere extrahierte Daten
      if (!extracted.customerName) {
        extracted.customerName = 'Unbekannter Kunde'
      }
      if (!extracted.totalAmount || isNaN(extracted.totalAmount)) {
        extracted.totalAmount = 0
      }

      logger.info('Successfully extracted project data', {
        component: 'extract-project',
        customerName: extracted.customerName,
        hasOrderNumber: !!extracted.orderNumber,
        totalAmount: extracted.totalAmount,
      })

      return NextResponse.json(extracted)
    } catch (parseError: unknown) {
      logger.error(
        'Parse error',
        {
          component: 'extract-project',
          hasText: !!response.text,
          responseKeys: Object.keys(response),
        },
        parseError as Error
      )

      // Fallback: Versuche minimales Objekt zurückzugeben
      return NextResponse.json({
        customerName: 'Unbekannter Kunde',
        totalAmount: 0,
        notes: 'Fehler beim Parsen der KI-Antwort. Bitte Daten manuell eingeben.',
      })
    }
  } catch (error: unknown) {
    const errObj = error as Error & { code?: string; status?: number }
    logger.error(
      'Extraction failed',
      {
        component: 'extract-project',
        errorCode: errObj?.code,
        errorStatus: errObj?.status,
      },
      errObj
    )

    return NextResponse.json(
      {
        error: errObj?.message || 'Fehler beim Extrahieren der Projektdaten',
        details: process.env.NODE_ENV === 'development' ? errObj?.stack : undefined,
      },
      { status: 500 }
    )
  }
}
