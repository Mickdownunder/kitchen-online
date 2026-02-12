type DeliveryKind = 'Lieferung' | 'Abholung'

interface AppointmentLabelOptions {
  projectDeliveryType?: 'delivery' | 'pickup'
  notes?: string | null
  defaultDeliveryKind?: DeliveryKind
}

const TYPE_LABELS: Record<string, string> = {
  Consultation: 'Beratung / Planung',
  FirstMeeting: 'Erstgespräch',
  Measurement: 'Aufmaß',
  Installation: 'Montage',
  Service: 'Service / Wartung',
  ReMeasurement: 'Nachmessung',
  Other: 'Sonstiges',
}

export function resolveDeliveryKind(options: AppointmentLabelOptions = {}): DeliveryKind {
  const { projectDeliveryType, notes, defaultDeliveryKind = 'Lieferung' } = options

  if (projectDeliveryType === 'pickup') return 'Abholung'
  if (projectDeliveryType === 'delivery') return 'Lieferung'

  const normalizedNotes = (notes || '').toLowerCase()
  if (normalizedNotes.includes('abhol')) return 'Abholung'
  if (normalizedNotes.includes('liefer')) return 'Lieferung'

  return defaultDeliveryKind
}

export function getAppointmentTypeLabel(type: string, options: AppointmentLabelOptions = {}): string {
  if (type === 'Delivery') {
    return resolveDeliveryKind(options)
  }

  return TYPE_LABELS[type] || type
}

export function getAppointmentTypeColorKey(type: string, options: AppointmentLabelOptions = {}): string {
  if (type === 'Delivery') {
    return resolveDeliveryKind(options) === 'Abholung' ? 'Delivery' : 'Lieferung'
  }

  return type
}
