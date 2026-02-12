import type {
  InboundCandidate,
  InboundDocumentKind,
  InboundInboxItem,
  InboundProcessingStatus,
  InboundSignals,
  InboundStatusPreset,
} from '@/components/accounting/inboundInbox.types'

const INBOUND_KINDS = new Set<InboundDocumentKind>(['ab', 'supplier_delivery_note', 'supplier_invoice', 'unknown'])
const INBOUND_STATUSES = new Set<InboundProcessingStatus>([
  'received',
  'classified',
  'preassigned',
  'needs_review',
  'confirmed',
  'rejected',
  'failed',
])

const STATUS_PRESETS: Record<InboundStatusPreset, InboundProcessingStatus[]> = {
  open: ['received', 'classified', 'preassigned', 'needs_review', 'failed'],
  review: ['preassigned', 'needs_review', 'failed'],
  done: ['confirmed', 'rejected'],
  all: [],
}

export const INBOUND_KIND_LABELS: Record<InboundDocumentKind, string> = {
  ab: 'AB',
  supplier_delivery_note: 'Lieferschein',
  supplier_invoice: 'Eingangsrechnung',
  unknown: 'Unbekannt',
}

export const INBOUND_STATUS_LABELS: Record<InboundProcessingStatus, string> = {
  received: 'Eingegangen',
  classified: 'Klassifiziert',
  preassigned: 'Vorzugewiesen',
  needs_review: 'Prüfen',
  confirmed: 'Bestätigt',
  rejected: 'Abgelehnt',
  failed: 'Fehlgeschlagen',
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  return value as Record<string, unknown>
}

function asString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function asNumber(value: unknown): number | undefined {
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

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
}

export function toKind(value: unknown): InboundDocumentKind {
  if (typeof value === 'string' && INBOUND_KINDS.has(value as InboundDocumentKind)) {
    return value as InboundDocumentKind
  }
  return 'unknown'
}

export function toStatus(value: unknown): InboundProcessingStatus {
  if (typeof value === 'string' && INBOUND_STATUSES.has(value as InboundProcessingStatus)) {
    return value as InboundProcessingStatus
  }
  return 'needs_review'
}

export function getStatusesForPreset(preset: InboundStatusPreset): InboundProcessingStatus[] {
  return STATUS_PRESETS[preset]
}

export function parseInboundSignals(item: InboundInboxItem | null): InboundSignals {
  if (!item) {
    return { warnings: [] }
  }

  const extracted = asRecord(item.extracted_payload)
  const rawSignals = asRecord(extracted?.signals)

  return {
    kind: toKind(rawSignals?.kind ?? item.document_kind),
    abNumber: asString(rawSignals?.abNumber),
    confirmedDeliveryDate: asString(rawSignals?.confirmedDeliveryDate),
    deliveryNoteNumber: asString(rawSignals?.deliveryNoteNumber),
    deliveryDate: asString(rawSignals?.deliveryDate),
    supplierName: asString(rawSignals?.supplierName),
    invoiceNumber: asString(rawSignals?.invoiceNumber),
    invoiceDate: asString(rawSignals?.invoiceDate),
    dueDate: asString(rawSignals?.dueDate),
    netAmount: asNumber(rawSignals?.netAmount),
    taxRate: asNumber(rawSignals?.taxRate),
    category: asString(rawSignals?.category),
    deliveryWeek: asString(rawSignals?.deliveryWeek),
    warnings: asStringArray(rawSignals?.warnings),
  }
}

export function parseInboundCandidates(raw: unknown): InboundCandidate[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw.reduce<InboundCandidate[]>((accumulator, entry) => {
      const candidate = asRecord(entry)
      if (!candidate) {
        return accumulator
      }

      const orderId = asString(candidate.orderId)
      if (!orderId) {
        return accumulator
      }

      accumulator.push({
        orderId,
        orderNumber: asString(candidate.orderNumber),
        projectId: asString(candidate.projectId),
        projectOrderNumber: asString(candidate.projectOrderNumber) || null,
        supplierName: asString(candidate.supplierName) || null,
        score: asNumber(candidate.score),
        reasons: asStringArray(candidate.reasons),
      })

      return accumulator
    }, [])
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '-'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }
  return date.toLocaleString('de-DE')
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '-'
  }
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleDateString('de-DE')
}

export function formatConfidence(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '-'
  }
  return `${Math.round(value * 100)}%`
}

export function formatFileSize(value: number | null | undefined): string {
  if (!value || value <= 0) {
    return '-'
  }

  if (value < 1024) {
    return `${value} B`
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}
