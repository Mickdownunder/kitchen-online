import { extractEmailDomain, normalizeEmail } from './encoding'
import {
  INBOUND_PREASSIGN_CONFIDENCE_THRESHOLD,
  INBOUND_REVIEW_CONFIDENCE_THRESHOLD,
} from './constants'
import type { AssignmentDecision, DocumentSignals, SupplierOrderCandidate } from './types'

export interface SupplierOrderMatchRow {
  orderId: string
  orderNumber: string
  projectId: string
  projectOrderNumber: string | null
  supplierName: string | null
  supplierOrderEmail: string | null
  supplierEmail: string | null
}

function includesNormalized(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

function scoreCandidate(input: {
  row: SupplierOrderMatchRow
  signals: DocumentSignals
  senderEmail: string | null
  searchableText: string
}): SupplierOrderCandidate {
  const reasons: string[] = []
  let score = 0

  const normalizedOrderNumbers = new Set(input.signals.orderNumbers.map((value) => value.toLowerCase()))
  const normalizedProjectNumbers = new Set(input.signals.projectOrderNumbers.map((value) => value.toLowerCase()))

  if (normalizedOrderNumbers.has(input.row.orderNumber.toLowerCase())) {
    score += 0.7
    reasons.push('Bestellnummer passt exakt')
  }

  if (
    input.row.projectOrderNumber &&
    normalizedProjectNumbers.has(input.row.projectOrderNumber.toLowerCase())
  ) {
    score += 0.3
    reasons.push('Auftragsnummer passt exakt')
  }

  const senderDomain = extractEmailDomain(input.senderEmail)
  const supplierOrderDomain = extractEmailDomain(input.row.supplierOrderEmail)
  const supplierMailDomain = extractEmailDomain(input.row.supplierEmail)

  if (senderDomain && (senderDomain === supplierOrderDomain || senderDomain === supplierMailDomain)) {
    score += 0.1
    reasons.push('Absender-Domain passt zum Lieferanten')
  }

  if (input.row.supplierName && includesNormalized(input.searchableText, input.row.supplierName)) {
    score += 0.1
    reasons.push('Lieferantenname im Dokument gefunden')
  }

  if (input.signals.kind === 'ab' && input.signals.abNumber) {
    score += 0.05
    reasons.push('AB-Muster erkannt')
  }

  if (input.signals.kind === 'supplier_delivery_note' && input.signals.deliveryNoteNumber) {
    score += 0.05
    reasons.push('Lieferscheinmuster erkannt')
  }

  return {
    orderId: input.row.orderId,
    orderNumber: input.row.orderNumber,
    projectId: input.row.projectId,
    projectOrderNumber: input.row.projectOrderNumber,
    supplierName: input.row.supplierName,
    supplierOrderEmail: normalizeEmail(input.row.supplierOrderEmail),
    supplierEmail: normalizeEmail(input.row.supplierEmail),
    score: Math.min(1, Number(score.toFixed(4))),
    reasons,
  }
}

export function buildAssignmentDecision(input: {
  signals: DocumentSignals
  senderEmail: string | null
  searchableText: string
  candidates: SupplierOrderMatchRow[]
}): AssignmentDecision {
  const ranked = input.candidates
    .map((row) =>
      scoreCandidate({
        row,
        signals: input.signals,
        senderEmail: input.senderEmail,
        searchableText: input.searchableText,
      }),
    )
    .sort((left, right) => right.score - left.score)

  const top = ranked[0]

  if (!top || top.score < INBOUND_REVIEW_CONFIDENCE_THRESHOLD) {
    return {
      status: 'needs_review',
      confidence: top?.score || input.signals.confidence,
      candidates: ranked.slice(0, 5),
    }
  }

  if (top.score >= INBOUND_PREASSIGN_CONFIDENCE_THRESHOLD) {
    return {
      status: 'preassigned',
      confidence: top.score,
      assignedSupplierOrderId: top.orderId,
      assignedProjectId: top.projectId,
      candidates: ranked.slice(0, 5),
    }
  }

  return {
    status: 'needs_review',
    confidence: top.score,
    assignedSupplierOrderId: top.orderId,
    assignedProjectId: top.projectId,
    candidates: ranked.slice(0, 5),
  }
}
