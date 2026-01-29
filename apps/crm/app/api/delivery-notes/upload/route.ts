import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createDeliveryNote } from '@/lib/supabase/services'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// WICHTIG: Next.js 15 benötigt diese Konfiguration für große Dateien
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 Sekunden für große Dateien
export const dynamic = 'force-dynamic' // Verhindert Caching, das FormData-Parsing stören könnte

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

    // Check company context
    const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
    if (companyError || !companyId) {
      return NextResponse.json({ error: 'Keine Firma zugeordnet' }, { status: 403 })
    }

    // Check permission
    const { data: hasPermission, error: permError } = await supabase.rpc('has_permission', {
      p_permission_code: 'edit_projects',
    })
    if (permError || !hasPermission) {
      return NextResponse.json(
        { error: 'Keine Berechtigung zum Hochladen von Lieferscheinen' },
        { status: 403 }
      )
    }

    // Akzeptiere JSON mit Base64-Daten (zuverlässiger als FormData für große Dateien)
    const body = await request.json()
    const { base64Data, mimeType, supplierName, deliveryDate } = body

    if (!base64Data || !mimeType) {
      return NextResponse.json({ error: 'base64Data and mimeType are required' }, { status: 400 })
    }

    logger.debug('Base64 data received', {
      component: 'delivery-notes-api',
      dataLength: base64Data.length,
    })

    // OCR: Extract text from image/PDF
    const ocrResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            {
              text: 'Extrahiere den kompletten Text aus diesem Lieferschein. Gib ALLEN Text aus, inklusive aller Positionen, Mengen, Preise, etc.',
            },
          ],
        },
      ],
    })

    const rawText = ocrResponse.text || ''

    // Analyze the extracted text
    const analyzeResponse = await fetch(`${request.nextUrl.origin}/api/delivery-notes/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText, supplierName }),
    })

    const { analysis, matching } = await analyzeResponse.json()

    // Create delivery note (getCurrentUser is called inside createDeliveryNote)
    const deliveryNote = await createDeliveryNote({
      supplierName: analysis.supplierName || supplierName || 'Unbekannt',
      supplierDeliveryNoteNumber: analysis.deliveryNoteNumber || `LS-${Date.now()}`,
      deliveryDate: analysis.deliveryDate || deliveryDate || new Date().toISOString().split('T')[0],
      receivedDate: new Date().toISOString(),
      status: matching.confidence > 0.8 ? 'matched' : 'received',
      aiMatched: matching.confidence > 0.8,
      aiConfidence: matching.confidence,
      matchedProjectId: matching.projectId || undefined,
      rawText,
      items:
        analysis.items?.map(
          (
            item: {
              positionNumber?: number
              description?: string
              modelNumber?: string
              manufacturer?: string
              quantityOrdered?: number
              quantityReceived?: number
              unit?: string
            },
            index: number
          ) => ({
            id: '', // Placeholder
            deliveryNoteId: '', // Will be set by service
            positionNumber: item.positionNumber || index + 1,
            description: item.description || '',
            modelNumber: item.modelNumber,
            manufacturer: item.manufacturer,
            quantityOrdered: item.quantityOrdered || item.quantityReceived || 0,
            quantityReceived: item.quantityReceived || item.quantityOrdered || 0,
            unit: item.unit || 'Stk',
            aiMatched: false,
            status: 'received' as const,
            createdAt: new Date().toISOString(),
          })
        ) || [],
    })

    return NextResponse.json({
      deliveryNote,
      analysis,
      matching,
    })
  } catch (error: unknown) {
    logger.error('Delivery note upload error', { component: 'delivery-notes-api' }, error as Error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload delivery note' },
      { status: 500 }
    )
  }
}
