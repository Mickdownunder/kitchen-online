import { GoogleGenAI, Type } from '@google/genai'
import { logger } from '@/lib/utils/logger'
import type { Json } from '@/types/database.types'
import type { DocumentSignals, InboundDocumentKind } from './types'

const modelName = 'gemini-3-flash-preview'

function toKind(value: unknown): InboundDocumentKind {
  if (
    value === 'ab' ||
    value === 'supplier_delivery_note' ||
    value === 'supplier_invoice' ||
    value === 'unknown'
  ) {
    return value
  }
  return 'unknown'
}

function toString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return undefined
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .map((entry) => toString(entry))
    .filter((entry): entry is string => Boolean(entry))
}

function parseModelJson(rawText: string): Record<string, unknown> {
  const trimmed = rawText.trim()
  if (!trimmed) {
    return {}
  }

  try {
    return JSON.parse(trimmed) as Record<string, unknown>
  } catch {
    const codeMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (codeMatch?.[1]) {
      return JSON.parse(codeMatch[1]) as Record<string, unknown>
    }
    throw new Error('Invalid model JSON')
  }
}

export async function extractSignalsWithAI(input: {
  mimeType: string
  base64Data: string
  fileName: string
  subject: string
  senderEmail: string | null
  bodyText: string
}): Promise<DocumentSignals | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return null
  }

  const ai = new GoogleGenAI({ apiKey })

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: input.mimeType,
                data: input.base64Data,
              },
            },
            {
              text: `Du analysierst Lieferanten-Dokumente aus einem CRM-Eingang.

Kontext:
- Dateiname: ${input.fileName}
- Betreff: ${input.subject}
- Absender: ${input.senderEmail || 'unbekannt'}
- Mailtext (Ausschnitt): ${input.bodyText.slice(0, 1200)}

Liefere NUR JSON und klassifiziere:
- kind: ab | supplier_delivery_note | supplier_invoice | unknown
- confidence: 0..1
- orderNumbers: string[]
- projectOrderNumbers: string[]
- abNumber?: string
- deliveryNoteNumber?: string
- invoiceNumber?: string
- supplierName?: string
- confirmedDeliveryDate?: YYYY-MM-DD
- deliveryDate?: YYYY-MM-DD
- invoiceDate?: YYYY-MM-DD
- dueDate?: YYYY-MM-DD
- deliveryWeek?: string
- netAmount?: number
- taxRate?: number
- category?: string
- warnings: string[]

Wichtig:
- Keine Halluzinationen.
- Bei Unsicherheit Felder leer lassen.
- Datumsfelder nur ISO YYYY-MM-DD.`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            kind: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            orderNumbers: { type: Type.ARRAY, items: { type: Type.STRING } },
            projectOrderNumbers: { type: Type.ARRAY, items: { type: Type.STRING } },
            abNumber: { type: Type.STRING },
            deliveryNoteNumber: { type: Type.STRING },
            invoiceNumber: { type: Type.STRING },
            supplierName: { type: Type.STRING },
            confirmedDeliveryDate: { type: Type.STRING },
            deliveryDate: { type: Type.STRING },
            invoiceDate: { type: Type.STRING },
            dueDate: { type: Type.STRING },
            deliveryWeek: { type: Type.STRING },
            netAmount: { type: Type.NUMBER },
            taxRate: { type: Type.NUMBER },
            category: { type: Type.STRING },
            warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
      },
    })

    const raw = parseModelJson(response.text || '')

    return {
      kind: toKind(raw.kind),
      confidence: Math.max(0, Math.min(1, toNumber(raw.confidence) ?? 0.5)),
      orderNumbers: toStringArray(raw.orderNumbers),
      projectOrderNumbers: toStringArray(raw.projectOrderNumbers),
      abNumber: toString(raw.abNumber),
      deliveryNoteNumber: toString(raw.deliveryNoteNumber),
      invoiceNumber: toString(raw.invoiceNumber),
      supplierName: toString(raw.supplierName),
      confirmedDeliveryDate: toString(raw.confirmedDeliveryDate),
      deliveryDate: toString(raw.deliveryDate),
      invoiceDate: toString(raw.invoiceDate),
      dueDate: toString(raw.dueDate),
      deliveryWeek: toString(raw.deliveryWeek),
      netAmount: toNumber(raw.netAmount),
      taxRate: toNumber(raw.taxRate),
      category: toString(raw.category),
      warnings: toStringArray(raw.warnings),
      source: 'ai',
      raw: raw as unknown as Json,
    }
  } catch (error) {
    logger.warn('AI inbound extraction failed - falling back to heuristic detection', {
      component: 'inbound-ai',
    }, error as Error)
    return null
  }
}
