import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI, Type } from '@google/genai'
import { createClient } from '@/lib/supabase/server'
import { apiErrors } from '@/lib/utils/errorHandling'
import { normalizeConfidence } from '@/lib/orders/documentAnalysisConfidence'

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024
const ALLOWED_KINDS = new Set(['ab', 'supplier_delivery_note'])
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

type SupplierDocumentKind = 'ab' | 'supplier_delivery_note'

interface SupplierOrderContext {
  orderNumber: string
  supplierName: string
  projectOrderNumber: string
  projectCustomerName: string
  installationDate?: string
  items: Array<{
    description: string
    modelNumber?: string
    manufacturer?: string
    quantity: number
    unit: string
  }>
}

interface SupplierOrderDocumentAnalysisRow {
  id: string
  user_id: string
  order_number: string
  suppliers:
    | {
        name: string | null
      }
    | {
        name: string | null
      }[]
    | null
  projects:
    | {
        order_number: string | null
        customer_name: string | null
        installation_date: string | null
      }
    | {
        order_number: string | null
        customer_name: string | null
        installation_date: string | null
      }[]
    | null
  supplier_order_items:
    | {
        description: string
        model_number: string | null
        manufacturer: string | null
        quantity: number | null
        unit: string | null
      }[]
    | null
}

function relationToSingle<T>(value: T | T[] | null): T | null {
  if (!value) {
    return null
  }
  return Array.isArray(value) ? value[0] || null : value
}

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

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

function parseJsonFromModel(text: string): Record<string, unknown> {
  const raw = text.trim()
  if (!raw) {
    return {}
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    // continue with fallbacks
  }

  const withoutFence = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  try {
    return JSON.parse(withoutFence) as Record<string, unknown>
  } catch {
    // continue with object substring fallback
  }

  const firstBrace = withoutFence.indexOf('{')
  const lastBrace = withoutFence.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const slice = withoutFence.slice(firstBrace, lastBrace + 1)
    try {
      return JSON.parse(slice) as Record<string, unknown>
    } catch {
      return {}
    }
  }

  return {}
}

function averageConfidence(values: number[]): number {
  const usable = values.filter((value) => value > 0)
  if (usable.length === 0) {
    return 0
  }

  return usable.reduce((sum, value) => sum + value, 0) / usable.length
}

function uniqueWarnings(...sources: string[][]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  sources
    .flat()
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .forEach((entry) => {
      if (!seen.has(entry)) {
        seen.add(entry)
        result.push(entry)
      }
    })

  return result
}

function buildOrderContextPrompt(context: SupplierOrderContext): string {
  const items = context.items
    .slice(0, 30)
    .map((item, index) => {
      const extra = [item.modelNumber, item.manufacturer].filter(Boolean).join(' | ')
      return `${index + 1}. ${item.description}${extra ? ` (${extra})` : ''} - ${item.quantity} ${item.unit}`
    })

  return [
    `Bestellung: ${context.orderNumber}`,
    `Lieferant: ${context.supplierName}`,
    `Auftrag: ${context.projectOrderNumber} (${context.projectCustomerName})`,
    `Montage: ${context.installationDate || 'offen'}`,
    'Bestellpositionen:',
    ...items,
  ].join('\n')
}

async function ensureOrderAccess(
  supplierOrderId: string,
): Promise<{ context: SupplierOrderContext } | NextResponse> {
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
    .select(
      `
      id,
      user_id,
      order_number,
      suppliers (name),
      projects (order_number, customer_name, installation_date),
      supplier_order_items (description, model_number, manufacturer, quantity, unit)
    `,
    )
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

  const typedRow = orderRow as SupplierOrderDocumentAnalysisRow
  const supplier = relationToSingle(typedRow.suppliers)
  const project = relationToSingle(typedRow.projects)

  const context: SupplierOrderContext = {
    orderNumber: typedRow.order_number,
    supplierName: supplier?.name || 'Unbekannt',
    projectOrderNumber: project?.order_number || 'Unbekannt',
    projectCustomerName: project?.customer_name || 'Unbekannt',
    installationDate: project?.installation_date || undefined,
    items: (typedRow.supplier_order_items || []).map((item) => ({
      description: item.description,
      modelNumber: item.model_number || undefined,
      manufacturer: item.manufacturer || undefined,
      quantity: Math.max(0, toNumber(item.quantity)),
      unit: item.unit || 'Stk',
    })),
  }

  return { context }
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

    const { context } = accessResult

    const formData = await request.formData()
    const kind = String(formData.get('kind') || '').trim() as SupplierDocumentKind
    const file = formData.get('file')

    if (!ALLOWED_KINDS.has(kind)) {
      return NextResponse.json({ success: false, error: 'Ungültiger Dokumenttyp.' }, { status: 400 })
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
    const contextPrompt = buildOrderContextPrompt(context)

    if (kind === 'ab') {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              { inlineData: { data: base64Data, mimeType } },
              {
                text: `Analysiere diese Lieferanten-Auftragsbestaetigung (AB).

Kontext aus unserem System:
${contextPrompt}

Extrahiere exakt:
- abNumber (AB-Nummer)
- confirmedDeliveryDate (YYYY-MM-DD)
- deviationSummary (kurz, falls Abweichungen vorhanden)
- notes (kurze operative Notiz)

Gib zu jedem Feld eine Confidence 0..1:
- abNumberConfidence
- confirmedDeliveryDateConfidence
- deviationSummaryConfidence
- notesConfidence

Optional warnings[] mit konkreten Risikohinweisen.

Wichtig:
- Nichts erfinden.
- Wenn unsicher, Feld leer lassen und Confidence niedrig setzen.
- Datum nur ISO YYYY-MM-DD.`,
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
              abNumberConfidence: { type: Type.NUMBER },
              confirmedDeliveryDate: { type: Type.STRING },
              confirmedDeliveryDateConfidence: { type: Type.NUMBER },
              deviationSummary: { type: Type.STRING },
              deviationSummaryConfidence: { type: Type.NUMBER },
              notes: { type: Type.STRING },
              notesConfidence: { type: Type.NUMBER },
              warnings: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
          },
        },
      })

      const raw = parseJsonFromModel(response.text || '')
      const abNumber = toText(raw.abNumber)
      const confirmedDeliveryDate = sanitizeDate(toText(raw.confirmedDeliveryDate))
      const deviationSummary = toText(raw.deviationSummary)
      const notes = toText(raw.notes)

      const abNumberConfidence = normalizeConfidence(raw.abNumberConfidence, abNumber ? 0.6 : 0)
      const confirmedDeliveryDateConfidence = normalizeConfidence(
        raw.confirmedDeliveryDateConfidence,
        confirmedDeliveryDate ? 0.6 : 0,
      )
      const deviationSummaryConfidence = normalizeConfidence(
        raw.deviationSummaryConfidence,
        deviationSummary ? 0.5 : 0,
      )
      const notesConfidence = normalizeConfidence(raw.notesConfidence, notes ? 0.5 : 0)

      const hardWarnings: string[] = []
      if (!abNumber) {
        hardWarnings.push('AB-Nummer konnte nicht sicher erkannt werden.')
      }
      if (!confirmedDeliveryDate) {
        hardWarnings.push('Bestätigter Liefertermin fehlt oder ist unklar.')
      }

      if (confirmedDeliveryDate && context.installationDate) {
        const abDate = new Date(`${confirmedDeliveryDate}T00:00:00`)
        const installationDate = new Date(`${context.installationDate.slice(0, 10)}T00:00:00`)
        if (!Number.isNaN(abDate.getTime()) && !Number.isNaN(installationDate.getTime())) {
          if (abDate.getTime() > installationDate.getTime()) {
            hardWarnings.push('Bestätigter Liefertermin liegt nach dem Montage-Termin.')
          }
        }
      }

      const warnings = uniqueWarnings(toStringArray(raw.warnings), hardWarnings)
      const overallConfidence = normalizeConfidence(
        averageConfidence([
          abNumberConfidence,
          confirmedDeliveryDateConfidence,
          deviationSummaryConfidence,
          notesConfidence,
        ]),
      )

      return NextResponse.json({
        success: true,
        data: {
          kind: 'ab',
          abNumber,
          abNumberConfidence,
          confirmedDeliveryDate,
          confirmedDeliveryDateConfidence,
          deviationSummary,
          deviationSummaryConfidence,
          notes,
          notesConfidence,
          overallConfidence,
          warnings,
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
              text: `Analysiere diesen Lieferanten-Lieferschein.

Kontext aus unserem System:
${contextPrompt}

Extrahiere exakt:
- deliveryNoteNumber
- deliveryDate (YYYY-MM-DD)
- supplierNameFromDocument (falls erkennbar)
- notes (kurze operative Notiz)

Gib zu jedem Feld eine Confidence 0..1:
- deliveryNoteNumberConfidence
- deliveryDateConfidence
- supplierNameConfidence
- notesConfidence

Optional warnings[] mit konkreten Risikohinweisen.

Wichtig:
- Nichts erfinden.
- Wenn unsicher, Feld leer lassen und Confidence niedrig setzen.
- Datum nur ISO YYYY-MM-DD.`,
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
            deliveryNoteNumberConfidence: { type: Type.NUMBER },
            deliveryDate: { type: Type.STRING },
            deliveryDateConfidence: { type: Type.NUMBER },
            supplierNameFromDocument: { type: Type.STRING },
            supplierNameConfidence: { type: Type.NUMBER },
            notes: { type: Type.STRING },
            notesConfidence: { type: Type.NUMBER },
            warnings: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
        },
      },
    })

    const raw = parseJsonFromModel(response.text || '')
    const deliveryNoteNumber = toText(raw.deliveryNoteNumber)
    const deliveryDate = sanitizeDate(toText(raw.deliveryDate))
    const notes = toText(raw.notes)
    const supplierNameFromDocument = toText(raw.supplierNameFromDocument)

    const deliveryNoteNumberConfidence = normalizeConfidence(
      raw.deliveryNoteNumberConfidence,
      deliveryNoteNumber ? 0.6 : 0,
    )
    const deliveryDateConfidence = normalizeConfidence(raw.deliveryDateConfidence, deliveryDate ? 0.6 : 0)
    const notesConfidence = normalizeConfidence(raw.notesConfidence, notes ? 0.5 : 0)
    const supplierNameConfidence = normalizeConfidence(
      raw.supplierNameConfidence,
      supplierNameFromDocument ? 0.55 : 0,
    )

    const hardWarnings: string[] = []
    if (!deliveryNoteNumber) {
      hardWarnings.push('Lieferscheinnummer konnte nicht sicher erkannt werden.')
    }
    if (!deliveryDate) {
      hardWarnings.push('Lieferscheindatum fehlt oder ist unklar.')
    }

    if (supplierNameFromDocument && context.supplierName) {
      const expected = context.supplierName.toLowerCase()
      const extracted = supplierNameFromDocument.toLowerCase()
      if (!expected.includes(extracted) && !extracted.includes(expected)) {
        hardWarnings.push('Lieferant im Dokument weicht vom Bestell-Lieferanten ab.')
      }
    }

    const warnings = uniqueWarnings(toStringArray(raw.warnings), hardWarnings)
    const overallConfidence = normalizeConfidence(
      averageConfidence([
        deliveryNoteNumberConfidence,
        deliveryDateConfidence,
        supplierNameConfidence,
        notesConfidence,
      ]),
    )

    return NextResponse.json({
      success: true,
      data: {
        kind: 'supplier_delivery_note',
        deliveryNoteNumber,
        deliveryNoteNumberConfidence,
        deliveryDate,
        deliveryDateConfidence,
        supplierNameFromDocument,
        supplierNameConfidence,
        notes,
        notesConfidence,
        overallConfidence,
        warnings,
      },
    })
  } catch (error) {
    return apiErrors.internal(error as Error, {
      component: 'api/supplier-orders/document-analysis',
    })
  }
}
