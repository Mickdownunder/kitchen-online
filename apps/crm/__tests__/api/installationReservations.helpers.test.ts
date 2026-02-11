import {
  isReservationSchemaMissing,
  mapInstallationReservation,
  normalizeDateInput,
  normalizeUniqueIds,
  type InstallationReservationRow,
} from '@/app/api/installation-reservations/helpers'

describe('installation reservation helpers', () => {
  it('normalizes date input from dot and iso formats', () => {
    expect(normalizeDateInput('11.02.2026')).toBe('2026-02-11')
    expect(normalizeDateInput('2026-02-11')).toBe('2026-02-11')
    expect(normalizeDateInput('')).toBeNull()
    expect(normalizeDateInput('invalid')).toBeNull()
  })

  it('deduplicates and trims selected ids', () => {
    expect(normalizeUniqueIds([' a ', 'b', 'a', '', null])).toEqual(['a', 'b'])
  })

  it('detects missing installation reservation schema errors', () => {
    expect(
      isReservationSchemaMissing({
        code: 'PGRST205',
        message: "Could not find the table 'public.installation_reservations' in the schema cache",
      }),
    ).toBe(true)

    expect(
      isReservationSchemaMissing({
        code: 'PGRST205',
        message: "Could not find the table 'public.some_other_table' in the schema cache",
      }),
    ).toBe(false)
  })

  it('maps database row to domain model', () => {
    const row: InstallationReservationRow = {
      id: 'res-1',
      user_id: 'user-1',
      project_id: 'proj-1',
      supplier_order_id: 'order-1',
      installer_company: 'Sentup',
      installer_contact: 'Max Mustermann',
      installer_email: 'montage@sentup.at',
      requested_installation_date: '2026-02-20',
      request_notes: 'Bitte Vormittag',
      plan_document_ids: ['doc-1', 'doc-2'],
      request_email_subject: 'Montage-Reservierung Auftrag #A2026-1107',
      request_email_to: 'montage@sentup.at',
      request_email_message: 'Bitte bestätigen',
      request_email_sent_at: '2026-02-11T09:00:00.000Z',
      confirmation_reference: 'S-2026-01',
      confirmation_date: '2026-02-22',
      confirmation_notes: 'KW 8 fix',
      confirmation_document_url: 'installation-reservations/proj-1/confirmation/test.pdf',
      confirmation_document_name: 'test.pdf',
      confirmation_document_mime_type: 'application/pdf',
      status: 'confirmed',
      created_at: '2026-02-11T09:00:00.000Z',
      updated_at: '2026-02-11T09:05:00.000Z',
    }

    const mapped = mapInstallationReservation(row)

    expect(mapped.projectId).toBe('proj-1')
    expect(mapped.installerCompany).toBe('Sentup')
    expect(mapped.status).toBe('confirmed')
    expect(mapped.planDocumentIds).toEqual(['doc-1', 'doc-2'])
  })
})
