import type { DocumentSignals, InboundDocumentKind } from './types'

const AB_KEYWORDS = ['auftragsbestaetigung', 'auftragsbestätigung', 'bestellbestaetigung', 'bestellbestätigung']
const DELIVERY_NOTE_KEYWORDS = ['lieferschein', 'liefer-schein', 'delivery note']
const INVOICE_KEYWORDS = ['rechnung', 'invoice', 'eingangsrechnung', 'lieferantenrechnung']

function normalize(value: string): string {
  return value.toLowerCase().replace(/[ä]/g, 'ae').replace(/[ö]/g, 'oe').replace(/[ü]/g, 'ue').replace(/[ß]/g, 'ss')
}

function containsAny(haystack: string, keywords: string[]): boolean {
  return keywords.some((keyword) => haystack.includes(keyword))
}

function detectKindFromText(combined: string): InboundDocumentKind {
  if (containsAny(combined, AB_KEYWORDS) || /\bab\b/i.test(combined)) {
    return 'ab'
  }

  if (containsAny(combined, DELIVERY_NOTE_KEYWORDS)) {
    return 'supplier_delivery_note'
  }

  if (containsAny(combined, INVOICE_KEYWORDS)) {
    return 'supplier_invoice'
  }

  return 'unknown'
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function extractByRegex(source: string, pattern: RegExp): string[] {
  const matches: string[] = []
  let next = pattern.exec(source)
  while (next) {
    if (next[1]) {
      matches.push(next[1])
    } else if (next[0]) {
      matches.push(next[0])
    }
    next = pattern.exec(source)
  }
  return dedupe(matches)
}

function pickBusinessToken(values: string[]): string | undefined {
  return values.find((value) => {
    const normalized = value.trim().toLowerCase()
    if (!normalized) {
      return false
    }

    if (normalized === 'nr' || normalized === 'no' || normalized === 'nummer') {
      return false
    }

    return /[0-9]/.test(normalized) || normalized.includes('-')
  })
}

function extractDate(source: string, pattern: RegExp): string | undefined {
  const match = source.match(pattern)
  if (!match || !match[1]) {
    return undefined
  }
  return match[1]
}

export function extractHeuristicSignals(input: {
  fileName: string
  subject: string
  bodyText: string
}): DocumentSignals {
  const combinedNormalized = normalize(`${input.fileName} ${input.subject} ${input.bodyText}`)
  const kind = detectKindFromText(combinedNormalized)

  const rawOrderNumbers = extractByRegex(
    `${input.subject} ${input.bodyText}`,
    /\b([A-Z0-9]{3,}-L[A-Z0-9]{2,})\b/gi,
  )

  const rawProjectOrderNumbers = extractByRegex(
    `${input.subject} ${input.bodyText}`,
    /\b([A-Z]{1,4}-\d{3,}(?:-\d{1,3})?)\b/gi,
  )

  const abNumber = pickBusinessToken(
    extractByRegex(
      `${input.subject} ${input.bodyText}`,
      /\b(?:AB(?:[-\s]*(?:Nr|No|Nummer))?)[-\s:#]*([A-Z0-9\-/]{2,})\b/gi,
    ),
  )
  const deliveryNoteNumber = extractByRegex(
    `${input.subject} ${input.bodyText}`,
    /\b(?:LS|LIEFERSCHEIN|DELIVERY\s*NOTE)[-\s:#]*([A-Z0-9\-/]{3,})\b/gi,
  )[0]
  const invoiceNumber = extractByRegex(
    `${input.subject} ${input.bodyText}`,
    /\b(?:RE|RG|RECHNUNG|INVOICE)[-\s:#]*([A-Z0-9\-/]{3,})\b/gi,
  )[0]

  const confirmedDeliveryDate = extractDate(
    `${input.subject} ${input.bodyText}`,
    /(?:liefertermin|lieferdatum|delivery\s*date)[^\d]*(\d{4}-\d{2}-\d{2})/i,
  )

  const deliveryDate = extractDate(
    `${input.subject} ${input.bodyText}`,
    /(?:lieferschein|lieferung|delivery)[^\d]*(\d{4}-\d{2}-\d{2})/i,
  )

  const invoiceDate = extractDate(
    `${input.subject} ${input.bodyText}`,
    /(?:rechnungsdatum|invoice\s*date)[^\d]*(\d{4}-\d{2}-\d{2})/i,
  )

  const dueDate = extractDate(
    `${input.subject} ${input.bodyText}`,
    /(?:faelligkeit|fälligkeit|due\s*date)[^\d]*(\d{4}-\d{2}-\d{2})/i,
  )

  let confidence = 0.4
  if (kind !== 'unknown') {
    confidence += 0.25
  }
  if (rawOrderNumbers.length > 0 || rawProjectOrderNumbers.length > 0) {
    confidence += 0.2
  }
  if (abNumber || deliveryNoteNumber || invoiceNumber) {
    confidence += 0.15
  }

  return {
    kind,
    confidence: Math.min(0.95, confidence),
    orderNumbers: rawOrderNumbers,
    projectOrderNumbers: rawProjectOrderNumbers,
    abNumber,
    deliveryNoteNumber,
    invoiceNumber,
    confirmedDeliveryDate,
    deliveryDate,
    invoiceDate,
    dueDate,
    warnings: [],
    source: 'heuristic',
  }
}
