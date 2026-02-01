/**
 * Status-bezogene Hilfsfunktionen
 *
 * Zentrale Stelle für alle Projekt-Status Logik
 */

import { ProjectStatus } from '@/types'

/**
 * Status-Farben Mapping
 * Gibt die Tailwind-Klassen für einen Projektstatus zurück
 */
const STATUS_COLORS: Record<ProjectStatus, string> = {
  [ProjectStatus.LEAD]: 'bg-amber-100 text-amber-700 border-amber-200',
  [ProjectStatus.PLANNING]: 'bg-slate-100 text-slate-700 border-slate-200',
  [ProjectStatus.MEASURING]: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  [ProjectStatus.ORDERED]: 'bg-purple-100 text-purple-700 border-purple-200',
  [ProjectStatus.DELIVERY]: 'bg-blue-100 text-blue-700 border-blue-200',
  [ProjectStatus.INSTALLATION]: 'bg-orange-100 text-orange-700 border-orange-200',
  [ProjectStatus.COMPLETED]: 'bg-green-100 text-green-700 border-green-200',
  [ProjectStatus.COMPLAINT]: 'bg-red-100 text-red-700 border-red-200',
}

/**
 * Status-Labels (deutsch)
 */
const STATUS_LABELS: Record<ProjectStatus, string> = {
  [ProjectStatus.LEAD]: 'Lead',
  [ProjectStatus.PLANNING]: 'Planung',
  [ProjectStatus.MEASURING]: 'Aufmaß',
  [ProjectStatus.ORDERED]: 'Bestellt',
  [ProjectStatus.DELIVERY]: 'Lieferung',
  [ProjectStatus.INSTALLATION]: 'Montage',
  [ProjectStatus.COMPLETED]: 'Abgeschlossen',
  [ProjectStatus.COMPLAINT]: 'Reklamation',
}

/**
 * Default-Farbe für unbekannte Status
 */
const DEFAULT_STATUS_COLOR = 'bg-slate-100 text-slate-700 border-slate-200'

/**
 * Gibt die Tailwind-Klassen für einen Projektstatus zurück
 * @param status - Der Projektstatus
 * @returns Tailwind-Klassen String
 */
export const getStatusColor = (status: ProjectStatus): string => {
  return STATUS_COLORS[status] ?? DEFAULT_STATUS_COLOR
}

/**
 * Gibt ein lesbares Label für einen Status zurück
 * @param status - Der Projektstatus
 * @returns Deutsches Label
 */
export const getStatusLabel = (status: ProjectStatus): string => {
  return STATUS_LABELS[status] ?? String(status)
}

/**
 * Prüft ob ein Status als "Lead" gilt
 * Berücksichtigt sowohl enum als auch Raw-DB-Werte
 */
export const isLeadStatus = (status: ProjectStatus | string): boolean => {
  const statusStr = String(status)
  return statusStr === ProjectStatus.LEAD || statusStr === 'Lead'
}

/**
 * Prüft ob ein Status als "abgeschlossen" gilt
 */
export const isCompletedStatus = (status: ProjectStatus | string): boolean => {
  const statusStr = String(status)
  return statusStr === ProjectStatus.COMPLETED || statusStr === 'Abgeschlossen'
}

/**
 * Gibt die Status-Reihenfolge für Sortierung zurück
 * Niedrigere Zahlen = weiter vorne im Workflow
 */
export const getStatusOrder = (status: ProjectStatus): number => {
  const order: Record<ProjectStatus, number> = {
    [ProjectStatus.LEAD]: 0,
    [ProjectStatus.PLANNING]: 1,
    [ProjectStatus.MEASURING]: 2,
    [ProjectStatus.ORDERED]: 3,
    [ProjectStatus.DELIVERY]: 4,
    [ProjectStatus.INSTALLATION]: 5,
    [ProjectStatus.COMPLETED]: 6,
    [ProjectStatus.COMPLAINT]: 7,
  }
  return order[status] ?? 99
}

/**
 * Lieferschein-Status Farben (für DeliveryNoteList)
 */
export type DeliveryNoteStatus = 'pending' | 'partial' | 'complete' | 'cancelled'

const DELIVERY_NOTE_STATUS_COLORS: Record<DeliveryNoteStatus, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  partial: 'border-blue-200 bg-blue-50 text-blue-700',
  complete: 'border-green-200 bg-green-50 text-green-700',
  cancelled: 'border-red-200 bg-red-50 text-red-700',
}

/**
 * Gibt die Tailwind-Klassen für einen Lieferschein-Status zurück
 */
export const getDeliveryNoteStatusColor = (status: string): string => {
  return (
    DELIVERY_NOTE_STATUS_COLORS[status as DeliveryNoteStatus] ??
    'border-slate-200 bg-slate-50 text-slate-700'
  )
}
