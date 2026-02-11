import type { InstallationReservation } from '@/types'

export interface InstallationPlanDocumentOption {
  id: string
  name: string
  mimeType: string
  fileSize: number | null
  type: string | null
  uploadedAt: string | null
}

export interface InstallationReservationContextResponse {
  reservation: InstallationReservation | null
  reservationSchemaMissing: boolean
  migrationHint: string | null
  planDocuments: InstallationPlanDocumentOption[]
}

export interface InstallationReservationRequestInput {
  supplierOrderId?: string
  installerCompany: string
  installerContact?: string
  installerEmail: string
  requestedInstallationDate?: string
  requestNotes?: string
  planDocumentIds: string[]
}

export interface InstallationReservationConfirmInput {
  supplierOrderId?: string
  installerCompany?: string
  installerContact?: string
  installerEmail?: string
  confirmationReference?: string
  confirmationDate?: string
  confirmationNotes?: string
  confirmationFile?: File | null
}

interface ReservationMutationResponse {
  reservation: InstallationReservation
}

export async function getInstallationReservationContext(
  projectId: string,
): Promise<InstallationReservationContextResponse> {
  const response = await fetch(`/api/installation-reservations/${projectId}`, {
    method: 'GET',
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload?.success === false || !payload?.data) {
    throw new Error(payload?.error || 'Montage-Reservierung konnte nicht geladen werden.')
  }

  return payload.data as InstallationReservationContextResponse
}

export async function sendInstallationReservationRequest(
  projectId: string,
  input: InstallationReservationRequestInput,
): Promise<ReservationMutationResponse> {
  const response = await fetch(`/api/installation-reservations/${projectId}/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload?.success === false || !payload?.data?.reservation) {
    throw new Error(payload?.error || 'Montage-Reservierungs-Mail konnte nicht versendet werden.')
  }

  return payload.data as ReservationMutationResponse
}

export async function saveInstallationReservationConfirmation(
  projectId: string,
  input: InstallationReservationConfirmInput,
): Promise<ReservationMutationResponse> {
  const formData = new FormData()

  if (input.supplierOrderId) {
    formData.set('supplierOrderId', input.supplierOrderId)
  }
  if (input.installerCompany) {
    formData.set('installerCompany', input.installerCompany)
  }
  if (input.installerContact) {
    formData.set('installerContact', input.installerContact)
  }
  if (input.installerEmail) {
    formData.set('installerEmail', input.installerEmail)
  }
  if (input.confirmationReference) {
    formData.set('confirmationReference', input.confirmationReference)
  }
  if (input.confirmationDate) {
    formData.set('confirmationDate', input.confirmationDate)
  }
  if (input.confirmationNotes) {
    formData.set('confirmationNotes', input.confirmationNotes)
  }
  if (input.confirmationFile) {
    formData.set('confirmationFile', input.confirmationFile)
  }

  const response = await fetch(`/api/installation-reservations/${projectId}/confirm`, {
    method: 'POST',
    body: formData,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload?.success === false || !payload?.data?.reservation) {
    throw new Error(payload?.error || 'Bestätigte Montage-Reservierung konnte nicht gespeichert werden.')
  }

  return payload.data as ReservationMutationResponse
}
