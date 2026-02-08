import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { rateLimit } from '@/lib/middleware/rateLimit'
import { apiErrors } from '@/lib/utils/errorHandling'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const EXTRACT_PROMPT = `Dieses Dokument ist eine Eingangsrechnung (Lieferantenrechnung).
Extrahiere folgende Daten und gib NUR ein gültiges JSON-Objekt zurück (kein anderer Text, kein Markdown):
- supplierName: Name des Lieferanten/Rechnungsstellers (string)
- supplierUid: UID-Nummer falls auf der Rechnung (string, z.B. ATU12345678), sonst null
- invoiceNumber: Rechnungsnummer (string)
- invoiceDate: Rechnungsdatum im Format YYYY-MM-DD (string)
- dueDate: Fälligkeitsdatum im Format YYYY-MM-DD falls erkennbar, sonst null (string|null)
- netAmount: Netto-Betrag in EUR als Zahl (number)
- taxRate: MwSt-Satz als Zahl (20, 13, 10 oder 0) (number)
- category: Eine der Kategorien: material, subcontractor, tools, rent, insurance, vehicle, office, marketing, other (string)

Beispiel: {"supplierName":"Muster GmbH","supplierUid":"ATU12345678","invoiceNumber":"RE-2026-001","invoiceDate":"2026-01-15","dueDate":"2026-01-29","netAmount":1000.00,"taxRate":20,"category":"material"}`

export interface AnalyzeSupplierInvoiceResult {
  supplierName?: string
  supplierUid?: string | null
  invoiceNumber?: string
  invoiceDate?: string
  dueDate?: string | null
  netAmount?: number
  taxRate?: number
  category?: string
}

function parseAnalyzeResponse(text: string): AnalyzeSupplierInvoiceResult {
  const trimmed = text.trim()
  let jsonStr = trimmed
  const codeMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeMatch) jsonStr = codeMatch[1].trim()
  const parsed = JSON.parse(jsonStr) as Record<string, unknown>
  const category = parsed.category as string | undefined
  const validCategories = [
    'material',
    'subcontractor',
    'tools',
    'rent',
    'insurance',
    'vehicle',
    'office',
    'marketing',
    'other',
  ]
  return {
    supplierName: typeof parsed.supplierName === 'string' ? parsed.supplierName : undefined,
    supplierUid:
      typeof parsed.supplierUid === 'string' ? parsed.supplierUid : parsed.supplierUid === null ? null : undefined,
    invoiceNumber: typeof parsed.invoiceNumber === 'string' ? parsed.invoiceNumber : undefined,
    invoiceDate: typeof parsed.invoiceDate === 'string' ? parsed.invoiceDate : undefined,
    dueDate:
      typeof parsed.dueDate === 'string' ? parsed.dueDate : parsed.dueDate === null ? null : undefined,
    netAmount: typeof parsed.netAmount === 'number' ? parsed.netAmount : Number(parsed.netAmount) || undefined,
    taxRate: typeof parsed.taxRate === 'number' ? parsed.taxRate : Number(parsed.taxRate) || undefined,
    category:
      typeof category === 'string' && validCategories.includes(category) ? category : undefined,
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return apiErrors.unauthorized()
    }

    const limitCheck = await rateLimit(request, user.id)
    if (limitCheck && !limitCheck.allowed) {
      return apiErrors.rateLimit(limitCheck.resetTime)
    }

    const { data: hasPermission, error: permError } = await supabase.rpc('has_permission', {
      p_permission_code: 'menu_accounting',
    })
    if (permError || !hasPermission) {
      return apiErrors.forbidden()
    }

    if (!process.env.GEMINI_API_KEY) {
      return apiErrors.internal(new Error('GEMINI_API_KEY ist nicht konfiguriert'), { component: 'supplier-invoice-analyze' })
    }

    const body = await request.json()
    const { base64Data, mimeType } = body as { base64Data?: string; mimeType?: string }

    if (!base64Data || !mimeType) {
      return apiErrors.badRequest()
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: EXTRACT_PROMPT },
          ],
        },
      ],
    })

    const text = response.text || ''
    let result: AnalyzeSupplierInvoiceResult
    try {
      result = parseAnalyzeResponse(text)
    } catch (parseError) {
      logger.error(
        'Supplier invoice analyze parse error',
        { component: 'supplier-invoice-analyze', text: text.slice(0, 300) },
        parseError as Error
      )
      return apiErrors.badRequest()
    }

    return NextResponse.json(result)
  } catch (error) {
    logger.error('Supplier invoice analyze error', { component: 'supplier-invoice-analyze' }, error as Error)
    return apiErrors.internal(error as Error, { component: 'supplier-invoice-analyze' })
  }
}
