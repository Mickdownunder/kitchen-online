import type { Row } from '@/lib/types/service'
import type { InstallationReservation } from '@/types'

export const INSTALLATION_RESERVATION_MIGRATION_HINT =
  'Montage-Reservierungstabellen fehlen. Bitte Migration ausführen: 20260211123000_installation_reservations.sql (z. B. mit `pnpm --filter @kitchen/db migrate`).'

export const PLAN_DOCUMENT_TYPES = ['PLANE', 'INSTALLATIONSPLANE'] as const
export const PLAN_DOCUMENT_TYPE_SET = new Set<string>(PLAN_DOCUMENT_TYPES)

export interface PostgrestErrorLike {
  code?: string
  message?: string
  details?: string
  hint?: string
}

export type InstallationReservationRow = Row<'installation_reservations'>

export function normalizeDateInput(value: string | null | undefined): string | null {
  const trimmed = String(value || '').trim()
  if (!trimmed) {
    return null
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
    return null
  }

  return parsed.toISOString().slice(0, 10)
}

export function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export function isReservationSchemaMissing(error: unknown): boolean {
  const err = (error || {}) as PostgrestErrorLike
  const code = String(err.code || '').toUpperCase()
  const blob = [err.message, err.details, err.hint].filter(Boolean).join(' ').toLowerCase()

  if (code === '42P01' || code === 'PGRST204' || code === 'PGRST205') {
    return blob.includes('installation_reservations') || code === '42P01'
  }

  return blob.includes('installation_reservations') && blob.includes('does not exist')
}

export function mapInstallationReservation(row: InstallationReservationRow): InstallationReservation {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    supplierOrderId: row.supplier_order_id || undefined,
    installerCompany: row.installer_company,
    installerContact: row.installer_contact || undefined,
    installerEmail: row.installer_email,
    requestedInstallationDate: row.requested_installation_date || undefined,
    requestNotes: row.request_notes || undefined,
    planDocumentIds: row.plan_document_ids || [],
    requestEmailSubject: row.request_email_subject || undefined,
    requestEmailTo: row.request_email_to || undefined,
    requestEmailMessage: row.request_email_message || undefined,
    requestEmailSentAt: row.request_email_sent_at || undefined,
    confirmationReference: row.confirmation_reference || undefined,
    confirmationDate: row.confirmation_date || undefined,
    confirmationNotes: row.confirmation_notes || undefined,
    confirmationDocumentUrl: row.confirmation_document_url || undefined,
    confirmationDocumentName: row.confirmation_document_name || undefined,
    confirmationDocumentMimeType: row.confirmation_document_mime_type || undefined,
    status: row.status as InstallationReservation['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function normalizeUniqueIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) {
    return []
  }

  const seen = new Set<string>()
  const output: string[] = []

  ids.forEach((entry) => {
    const value = String(entry || '').trim()
    if (!value || seen.has(value)) {
      return
    }
    seen.add(value)
    output.push(value)
  })

  return output
}
