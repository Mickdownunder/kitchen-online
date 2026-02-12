/**
 * Küchenplan-Analyse (DAN, Blanco, Bosch etc.): Extrahiert strukturierte Artikel-Liste aus PDF.
 * Für Nutzung aus der UI; die KI verweist per analyzeKitchenPlan-Tool auf Dokumentenanalyse oder diese API.
 */

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/middleware/rateLimit'
import { apiErrors } from '@/lib/utils/errorHandling'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

const KITCHEN_PLAN_PROMPT = `Dieses Dokument ist ein Küchenplan oder eine Lieferanten-Liste (z.B. DAN, Blanco, Bosch).
Extrahiere ALLE Artikel/Positionen in eine strukturierte Liste.
Für jede Position gib an:
- articleNumber: Artikelnummer / Modellnummer (falls vorhanden)
- description: Bezeichnung
- quantity: Menge (Zahl)
- unit: Einheit (z.B. "Stück", "m", "lfm")
- pricePerUnit: Einzelpreis in Euro (Zahl, falls vorhanden)
- totalPrice: Gesamtpreis in Euro (Zahl, falls vorhanden)
Antworte NUR mit einem gültigen JSON-Array, kein anderer Text. Beispiel:
[{"articleNumber":"XY123","description":"Front","quantity":2,"unit":"Stück","pricePerUnit":45.00,"totalPrice":90.00}]`

export interface KitchenPlanArticle {
  articleNumber?: string
  description: string
  quantity: number
  unit?: string
  pricePerUnit?: number
  totalPrice?: number
}

function parseArticlesFromResponse(text: string): KitchenPlanArticle[] {
  const trimmed = text.trim()
  let jsonStr = trimmed
  const codeMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeMatch) jsonStr = codeMatch[1].trim()
  const parsed = JSON.parse(jsonStr) as unknown
  if (!Array.isArray(parsed)) return []
  return parsed
    .filter(
      (row: unknown): row is Record<string, unknown> =>
        row !== null && typeof row === 'object' && typeof (row as { description?: unknown }).description === 'string',
    )
    .map((row) => ({
      articleNumber: typeof row.articleNumber === 'string' ? row.articleNumber : undefined,
      description: String(row.description),
      quantity: typeof row.quantity === 'number' ? row.quantity : Number(row.quantity) || 0,
      unit: typeof row.unit === 'string' ? row.unit : undefined,
      pricePerUnit:
        typeof row.pricePerUnit === 'number' ? row.pricePerUnit : Number(row.pricePerUnit) || undefined,
      totalPrice: typeof row.totalPrice === 'number' ? row.totalPrice : Number(row.totalPrice) || undefined,
    }))
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

    if (user.app_metadata?.role === 'customer') {
      return apiErrors.forbidden()
    }

    const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
    if (companyError || !companyId) {
      return apiErrors.forbidden()
    }

    const { data: hasPermission, error: permError } = await supabase.rpc('has_permission', {
      p_permission_code: 'edit_projects',
    })
    if (permError || !hasPermission) {
      return apiErrors.forbidden()
    }

    if (!process.env.GEMINI_API_KEY) {
      return apiErrors.internal(new Error('GEMINI_API_KEY is not configured'), {
        component: 'analyze-kitchen-plan',
      })
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
            { text: KITCHEN_PLAN_PROMPT },
          ],
        },
      ],
    })

    const text = response.text || ''
    let articles: KitchenPlanArticle[]
    try {
      articles = parseArticlesFromResponse(text)
    } catch {
      return NextResponse.json(
        { error: 'Extraktion fehlgeschlagen; Antwort war kein gültiges JSON.', articles: [] },
        { status: 200 },
      )
    }

    return NextResponse.json({ articles })
  } catch (error: unknown) {
    return apiErrors.internal(error as Error, { component: 'analyze-kitchen-plan' })
  }
}
