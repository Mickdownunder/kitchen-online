import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { roundTo2Decimals } from '@/lib/utils/priceCalculations'
import { rateLimit } from '@/lib/middleware/rateLimit'
import { apiErrors } from '@/lib/utils/errorHandling'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const EXTRACT_PROMPT = `Dieses Dokument ist ein Bank-Kontoauszug oder eine Monatsübersicht.
Extrahiere ALLE Buchungszeilen (Kontobewegungen). Für jede Zeile:
- date: Datum im Format YYYY-MM-DD
- amount: Betrag als Zahl; bei Einnahmen/Gutschrift positiv, bei Ausgaben/Abbuchung negativ (Vorzeichen wichtig!)
- reference: Verwendungszweck / Buchungstext (alles was als Beschreibung steht)
Gib NUR ein gültiges JSON-Array zurück, kein anderes Text. Beispiel:
[{"date":"2026-01-15","amount":-120.50,"reference":"Lieferant XY"},{"date":"2026-01-16","amount":500.00,"reference":"Zahlung Kunde"}]`

function parseTransactionsFromResponse(text: string): { date: string; amount: number; reference: string }[] {
  const trimmed = text.trim()
  // Entferne ggf. Markdown-Codeblock
  let jsonStr = trimmed
  const codeMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeMatch) jsonStr = codeMatch[1].trim()
  const parsed = JSON.parse(jsonStr) as unknown
  if (!Array.isArray(parsed)) return []
  return parsed
    .filter(
      (row: unknown): row is { date?: string; amount?: number; reference?: string } =>
        row !== null && typeof row === 'object'
    )
    .map(row => ({
      date: typeof row.date === 'string' ? row.date : new Date().toISOString().split('T')[0],
      amount: typeof row.amount === 'number' ? row.amount : Number(row.amount) || 0,
      reference: typeof row.reference === 'string' ? row.reference : String(row.reference || ''),
    }))
    .filter(row => row.date && row.amount !== 0)
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
      return apiErrors.internal(new Error('GEMINI_API_KEY ist nicht konfiguriert'), { component: 'bank-import-pdf' })
    }

    const body = await request.json()
    const { base64Data, mimeType, bankAccountId } = body as {
      base64Data?: string
      mimeType?: string
      bankAccountId?: string | null
    }

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
    let transactions: { date: string; amount: number; reference: string }[]
    try {
      transactions = parseTransactionsFromResponse(text)
    } catch (parseError) {
      logger.error('Bank PDF parse error', { component: 'bank-import-pdf', text: text.slice(0, 500) }, parseError as Error)
      return apiErrors.badRequest()
    }

    if (transactions.length === 0) {
      return NextResponse.json(
        { error: 'Keine Buchungszeilen im PDF gefunden.', imported: 0 },
        { status: 200 }
      )
    }

    const rows = transactions.map(t => ({
      user_id: user.id,
      bank_account_id: bankAccountId || null,
      transaction_date: t.date,
      amount: roundTo2Decimals(t.amount),
      reference: t.reference || null,
      counterparty_name: null,
      counterparty_iban: null,
    }))

    const { data: inserted, error: insertError } = await supabase
      .from('bank_transactions')
      .insert(rows)
      .select('id, transaction_date, amount, reference')

    if (insertError) {
      logger.error('Bank transactions insert error', { component: 'bank-import-pdf' }, insertError as Error)
      return apiErrors.internal(insertError as Error, { component: 'bank-import-pdf' })
    }

    return NextResponse.json({
      success: true,
      imported: inserted?.length ?? 0,
      transactions: inserted ?? [],
    })
  } catch (error) {
    logger.error('Bank import PDF error', { component: 'bank-import-pdf' }, error as Error)
    return apiErrors.internal(error as Error, { component: 'bank-import-pdf' })
  }
}
