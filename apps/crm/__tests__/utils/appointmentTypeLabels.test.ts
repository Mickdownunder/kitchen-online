import {
  getAppointmentTypeColorKey,
  getAppointmentTypeLabel,
  resolveDeliveryKind,
} from '@/lib/utils/appointmentTypeLabels'

describe('resolveDeliveryKind', () => {
  it('prioritizes explicit project delivery type', () => {
    expect(resolveDeliveryKind({ projectDeliveryType: 'pickup' })).toBe('Abholung')
    expect(resolveDeliveryKind({ projectDeliveryType: 'delivery' })).toBe('Lieferung')
  })

  it('falls back to notes when project type is not available', () => {
    expect(resolveDeliveryKind({ notes: 'Abholung für Auftrag K-12' })).toBe('Abholung')
    expect(resolveDeliveryKind({ notes: 'Lieferung im 3. Stock' })).toBe('Lieferung')
  })

  it('defaults to Lieferung for generic delivery appointments', () => {
    expect(resolveDeliveryKind()).toBe('Lieferung')
  })
})

describe('getAppointmentTypeLabel', () => {
  it('returns regular labels for non-delivery types', () => {
    expect(getAppointmentTypeLabel('Consultation')).toBe('Beratung / Planung')
    expect(getAppointmentTypeLabel('Installation')).toBe('Montage')
  })

  it('returns delivery labels context-aware', () => {
    expect(getAppointmentTypeLabel('Delivery')).toBe('Lieferung')
    expect(getAppointmentTypeLabel('Delivery', { projectDeliveryType: 'pickup' })).toBe('Abholung')
  })
})

describe('getAppointmentTypeColorKey', () => {
  it('maps delivery to the matching calendar color key', () => {
    expect(getAppointmentTypeColorKey('Delivery')).toBe('Lieferung')
    expect(getAppointmentTypeColorKey('Delivery', { notes: 'Abholung Termin' })).toBe('Delivery')
  })
})
