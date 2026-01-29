'use server'

import { GoogleGenAI, Type } from '@google/genai'
import { createDeliveryNote, getProjects } from '@/lib/supabase/services'
import { logger } from '@/lib/utils/logger'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export async function uploadDeliveryNote(formData: FormData) {
  try {
    const file = formData.get('file') as File

    if (!file || !(file instanceof File)) {
      throw new Error('File is required and must be a File object')
    }

    logger.debug('File received', {
      component: 'delivery-notes',
      action: 'upload',
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    })

    // Konvertiere File zu Base64
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Data = buffer.toString('base64')
    const mimeType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')
    const supplierName = formData.get('supplierName')?.toString()
    const deliveryDate = formData.get('deliveryDate')?.toString()

    logger.debug('Base64 conversion complete', {
      component: 'delivery-notes',
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

    // Analyze the extracted text (direkt in Server Action, kein HTTP-Call nötig)
    const projects = await getProjects()

    // AI Analysis: Extract delivery note data
    const analysisResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            text: `Analysiere diesen Lieferschein-Text und extrahiere strukturierte Daten:

Lieferschein-Text:
${rawText}

${supplierName ? `Lieferant: ${supplierName}` : ''}

Extrahiere:
1. Lieferant-Name (falls nicht gegeben)
2. Lieferschein-Nummer
3. Lieferdatum (Format: YYYY-MM-DD)
4. Alle Positionen mit:
   - Position-Nummer
   - Artikel-Beschreibung
   - Modellnummer (falls vorhanden)
   - Hersteller
   - Bestellte Menge
   - Gelieferte Menge
   - Einheit

Antworte im JSON-Format.`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            supplierName: { type: Type.STRING, description: 'Name des Lieferanten' },
            deliveryNoteNumber: { type: Type.STRING, description: 'Lieferschein-Nummer' },
            deliveryDate: { type: Type.STRING, description: 'Lieferdatum im Format YYYY-MM-DD' },
            items: {
              type: Type.ARRAY,
              description: 'Liste der Positionen',
              items: {
                type: Type.OBJECT,
                properties: {
                  positionNumber: { type: Type.NUMBER },
                  description: { type: Type.STRING },
                  modelNumber: { type: Type.STRING },
                  manufacturer: { type: Type.STRING },
                  quantityOrdered: { type: Type.NUMBER },
                  quantityReceived: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                },
              },
            },
          },
          required: ['supplierName', 'deliveryNoteNumber', 'items'],
        },
      },
    })

    const analysis = JSON.parse(analysisResponse.text || '{}')

    // AI Matching: Find best matching project
    const matchingResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            text: `Finde den passenden Auftrag für diesen Lieferschein:

Lieferschein:
- Lieferant: ${analysis.supplierName}
- Lieferschein-Nr: ${analysis.deliveryNoteNumber}
- Artikel: ${analysis.items?.map((i: { description?: string; modelNumber?: string }) => `${i.description} (${i.modelNumber || 'keine Modellnummer'})`).join(', ')}

Verfügbare Aufträge:
${projects
  .map(
    p =>
      `- ID: ${p.id}, Kunde: ${p.customerName}, Auftrag: ${p.orderNumber}, Status: ${p.status}, Artikel: ${p.items?.map(i => `${i.description} (${i.modelNumber || 'keine'})`).join(', ')}`
  )
  .join('\n')}

Finde den besten Match basierend auf:
1. Lieferant (falls bekannt)
2. Artikel-Modellnummern
3. Artikel-Beschreibungen
4. Mengen

Antworte mit projectId und confidence (0.0-1.0).`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            projectId: { type: Type.STRING, description: 'ID des passenden Projekts' },
            confidence: { type: Type.NUMBER, description: 'Confidence-Score 0.0-1.0' },
            matchedItems: {
              type: Type.ARRAY,
              description: 'Zuordnung der Lieferschein-Positionen zu Projekt-Artikeln',
              items: {
                type: Type.OBJECT,
                properties: {
                  deliveryNoteItemIndex: { type: Type.NUMBER },
                  projectItemId: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                },
              },
            },
            reasoning: { type: Type.STRING, description: 'Begründung für den Match' },
          },
        },
      },
    })

    const matching = JSON.parse(matchingResponse.text || '{}')
    const matchingResult = {
      projectId: matching.projectId || null,
      confidence: matching.confidence || 0,
      matchedItems: matching.matchedItems || [],
      reasoning: matching.reasoning || '',
    }

    // Create delivery note (getCurrentUser is called inside createDeliveryNote)
    const deliveryNote = await createDeliveryNote({
      supplierName: analysis.supplierName || supplierName || 'Unbekannt',
      supplierDeliveryNoteNumber: analysis.deliveryNoteNumber || `LS-${Date.now()}`,
      deliveryDate: analysis.deliveryDate || deliveryDate || new Date().toISOString().split('T')[0],
      receivedDate: new Date().toISOString(),
      status: matchingResult.confidence > 0.8 ? 'matched' : 'received',
      aiMatched: matchingResult.confidence > 0.8,
      aiConfidence: matchingResult.confidence,
      matchedProjectId: matchingResult.projectId || undefined,
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

    return {
      success: true,
      deliveryNote,
      analysis,
      matching: matchingResult,
    }
  } catch (error: unknown) {
    logger.error('Delivery note upload error', { component: 'delivery-notes' }, error as Error)
    throw new Error(error instanceof Error ? error.message : 'Failed to upload delivery note')
  }
}
