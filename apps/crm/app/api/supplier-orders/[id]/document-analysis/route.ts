import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI, Type } from '@google/genai'
import { createClient } from '@/lib/supabase/server'
import { apiErrors } from '@/lib/utils/errorHandling'

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024
const ALLOWED_KINDS = new Set(['ab', 'supplier_delivery_note'])
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

type SupplierDocumentKind = 'ab' | 'supplier_delivery_note'

function sanitizeDate(value: string | undefined): string | undefined {
  if (!value) {
    return undefined
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }

  const dotDate = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(trimmed)
  if (dotDate) {
    const day = dotDate[1].padStart(2, '0')
    const month = dotDate[2].padStart(2, '0')
    const year = dotDate[3]
    return `${year}-${month}-${day}`
  }

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) {
    return undefined
  }

  return parsed.toISOString().slice(0, 10)
}

function toText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

async function ensureOrderAccess(supplierOrderId: string): Promise<{ userId: string } | NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return apiErrors.unauthorized({ component: 'api/supplier-orders/document-analysis' })
  }

  if (user.app_metadata?.role === 'customer') {
    return apiErrors.forbidden({ component: 'api/supplier-orders/document-analysis' })
  }

  const { data: hasPermission, error: permissionError } = await supabase.rpc('has_permission', {
    p_permission_code: 'edit_projects',
  })

  if (permissionError || !hasPermission) {
    return apiErrors.forbidden({ component: 'api/supplier-orders/document-analysis' })
  }

  const { data: orderRow, error: orderError } = await supabase
    .from('supplier_orders')
    .select('id')
    .eq('id', supplierOrderId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (orderError) {
    return apiErrors.internal(new Error(orderError.message), {
      component: 'api/supplier-orders/document-analysis',
    })
  }

  if (!orderRow?.id) {
    return apiErrors.notFound({
      component: 'api/supplier-orders/document-analysis',
      supplierOrderId,
    })
  }

  return { userId: user.id }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: supplierOrderId } = await params

    if (!process.env.GEMINI_API_KEY) {
      return apiErrors.internal(new Error('GEMINI_API_KEY is not configured'), {
        component: 'api/supplier-orders/document-analysis',
      })
    }

    const accessResult = await ensureOrderAccess(supplierOrderId)
    if (accessResult instanceof NextResponse) {
      return accessResult
    }

    const formData = await request.formData()
    const kind = String(formData.get('kind') || '').trim() as SupplierDocumentKind
    const file = formData.get('file')

    if (!ALLOWED_KINDS.has(kind)) {
      return NextResponse.json(
        { success: false, error: 'Ungültiger Dokumenttyp.' },
        { status: 400 },
      )
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Datei fehlt.' }, { status: 400 })
    }

    if (!file.size || file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Datei ist leer oder größer als 15 MB.' },
        { status: 400 },
      )
    }

    const base64Data = Buffer.from(await file.arrayBuffer()).toString('base64')
    const mimeType = file.type || 'application/pdf'

    if (kind === 'ab') {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              { inlineData: { data: base64Data, mimeType } },
              {
                text: `Analysiere diese Auftragsbestaetigung (AB) und extrahiere:
- AB-Nummer
- bestaetigter Liefertermin (YYYY-MM-DD)
- Abweichungen
- Notiz

Antworte streng als JSON mit Feldern:
abNumber, confirmedDeliveryDate, deviationSummary, notes

Wenn ein Feld nicht sicher ist: leerer String.`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              abNumber: { type: Type.STRING },
              confirmedDeliveryDate: { type: Type.STRING },
              deviationSummary: { type: Type.STRING },
              notes: { type: Type.STRING },
            },
          },
        },
      })

      const raw = JSON.parse(response.text || '{}') as Record<string, unknown>
      return NextResponse.json({
        success: true,
        data: {
          kind: 'ab',
          abNumber: toText(raw.abNumber),
          confirmedDeliveryDate: sanitizeDate(toText(raw.confirmedDeliveryDate)),
          deviationSummary: toText(raw.deviationSummary),
          notes: toText(raw.notes),
        },
      })
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            {
              text: `Analysiere diesen Lieferanten-Lieferschein und extrahiere:
- Lieferschein-Nummer
- Lieferscheindatum (YYYY-MM-DD)
- Notiz (optional)

Antworte streng als JSON mit Feldern:
deliveryNoteNumber, deliveryDate, notes

Wenn ein Feld nicht sicher ist: leerer String.`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            deliveryNoteNumber: { type: Type.STRING },
            deliveryDate: { type: Type.STRING },
            notes: { type: Type.STRING },
          },
        },
      },
    })

    const raw = JSON.parse(response.text || '{}') as Record<string, unknown>
    return NextResponse.json({
      success: true,
      data: {
        kind: 'supplier_delivery_note',
        deliveryNoteNumber: toText(raw.deliveryNoteNumber),
        deliveryDate: sanitizeDate(toText(raw.deliveryDate)),
        notes: toText(raw.notes),
      },
    })
  } catch (error) {
    return apiErrors.internal(error as Error, {
      component: 'api/supplier-orders/document-analysis',
    })
  }
}
