'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Mail, Paperclip } from 'lucide-react'
import type { InstallationReservation } from '@/types'
import { useToast } from '@/components/providers/ToastProvider'
import {
  getInstallationReservationContext,
  saveInstallationReservationConfirmation,
  sendInstallationReservationRequest,
  type InstallationPlanDocumentOption,
} from '../installationReservationApi'
import type { OrderWorkflowRow } from '../types'
import { ModalShell } from './ModalShell'

interface InstallationReservationDialogProps {
  open: boolean
  row: OrderWorkflowRow | null
  onClose: () => void
  onSaved: () => Promise<void>
}

type BusyState = 'load' | 'request' | 'confirm' | null

const STATUS_META: Record<
  string,
  { label: string; chipClass: string }
> = {
  draft: {
    label: 'Entwurf',
    chipClass: 'border-slate-200 bg-slate-50 text-slate-700',
  },
  requested: {
    label: 'Reserviert (offen)',
    chipClass: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  confirmed: {
    label: 'Bestätigt',
    chipClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  cancelled: {
    label: 'Storniert',
    chipClass: 'border-rose-200 bg-rose-50 text-rose-700',
  },
}

function formatDate(value?: string | null): string {
  if (!value) {
    return '—'
  }
  const normalized = value.includes('T') ? value.slice(0, 10) : value
  const parsed = new Date(`${normalized}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }
  return parsed.toLocaleDateString('de-DE')
}

function toInputDate(value?: string | null): string {
  if (!value) {
    return ''
  }
  return value.includes('T') ? value.slice(0, 10) : value
}

function toInputText(value?: string | null): string {
  return String(value || '')
}

export function InstallationReservationDialog({
  open,
  row,
  onClose,
  onSaved,
}: InstallationReservationDialogProps) {
  const { success: showSuccess, error: showError } = useToast()

  const [busyState, setBusyState] = useState<BusyState>(null)
  const [error, setError] = useState<string | null>(null)
  const [schemaHint, setSchemaHint] = useState<string | null>(null)

  const [reservation, setReservation] = useState<InstallationReservation | null>(null)
  const [planDocuments, setPlanDocuments] = useState<InstallationPlanDocumentOption[]>([])
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([])

  const [installerCompany, setInstallerCompany] = useState('Sentup')
  const [installerContact, setInstallerContact] = useState('')
  const [installerEmail, setInstallerEmail] = useState('')
  const [requestedInstallationDate, setRequestedInstallationDate] = useState('')
  const [requestNotes, setRequestNotes] = useState('')

  const [confirmationReference, setConfirmationReference] = useState('')
  const [confirmationDate, setConfirmationDate] = useState('')
  const [confirmationNotes, setConfirmationNotes] = useState('')
  const [confirmationFile, setConfirmationFile] = useState<File | null>(null)

  const statusMeta = useMemo(() => {
    const key = reservation?.status || 'draft'
    return STATUS_META[key] || STATUS_META.draft
  }, [reservation?.status])

  useEffect(() => {
    if (!open || !row) {
      return
    }

    let active = true

    const loadContext = async () => {
      setBusyState('load')
      setError(null)
      setSchemaHint(null)
      setConfirmationFile(null)

      try {
        const payload = await getInstallationReservationContext(row.projectId)
        if (!active) {
          return
        }

        setReservation(payload.reservation)
        setPlanDocuments(payload.planDocuments)
        setSchemaHint(payload.reservationSchemaMissing ? payload.migrationHint : null)

        const effectiveSelectedPlans =
          payload.reservation?.planDocumentIds && payload.reservation.planDocumentIds.length > 0
            ? payload.reservation.planDocumentIds
            : payload.planDocuments.map((doc) => doc.id)

        setSelectedPlanIds(effectiveSelectedPlans)
        setInstallerCompany(payload.reservation?.installerCompany || 'Sentup')
        setInstallerContact(toInputText(payload.reservation?.installerContact))
        setInstallerEmail(toInputText(payload.reservation?.installerEmail))
        setRequestedInstallationDate(
          toInputDate(payload.reservation?.requestedInstallationDate || row.installationDate || ''),
        )
        setRequestNotes(toInputText(payload.reservation?.requestNotes))

        setConfirmationReference(toInputText(payload.reservation?.confirmationReference))
        setConfirmationDate(toInputDate(payload.reservation?.confirmationDate))
        setConfirmationNotes(toInputText(payload.reservation?.confirmationNotes))
      } catch (loadError) {
        if (!active) {
          return
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Montage-Reservierung konnte nicht geladen werden.',
        )
      } finally {
        if (active) {
          setBusyState(null)
        }
      }
    }

    loadContext()

    return () => {
      active = false
    }
  }, [open, row])

  if (!open || !row) {
    return null
  }

  const togglePlan = (planId: string) => {
    setSelectedPlanIds((current) => {
      if (current.includes(planId)) {
        return current.filter((id) => id !== planId)
      }
      return [...current, planId]
    })
  }

  const refreshAfterMutation = async (nextReservation: InstallationReservation) => {
    setReservation(nextReservation)
    setInstallerCompany(nextReservation.installerCompany || installerCompany)
    setInstallerContact(nextReservation.installerContact || '')
    setInstallerEmail(nextReservation.installerEmail || '')
    setRequestedInstallationDate(toInputDate(nextReservation.requestedInstallationDate || requestedInstallationDate))
    setRequestNotes(nextReservation.requestNotes || '')
    setConfirmationReference(nextReservation.confirmationReference || '')
    setConfirmationDate(toInputDate(nextReservation.confirmationDate))
    setConfirmationNotes(nextReservation.confirmationNotes || '')
    await onSaved()
  }

  const isBusy = busyState !== null
  const requestDisabled =
    isBusy ||
    Boolean(schemaHint) ||
    !installerCompany.trim() ||
    !installerEmail.trim() ||
    selectedPlanIds.length === 0

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Montage reservieren"
      description={`${row.customerName} · Auftrag #${row.projectOrderNumber}`}
      maxWidthClassName="max-w-6xl"
    >
      <div className="mt-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${statusMeta.chipClass}`}
          >
            {statusMeta.label}
          </span>
          {reservation?.requestEmailSentAt && (
            <span className="text-xs font-semibold text-slate-600">
              Anfrage gesendet: {formatDate(reservation.requestEmailSentAt)}
            </span>
          )}
          {reservation?.confirmationDate && (
            <span className="text-xs font-semibold text-emerald-700">
              Bestätigt: {formatDate(reservation.confirmationDate)}
            </span>
          )}
        </div>

        {schemaHint && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            {schemaHint}
          </p>
        )}

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
              Reservierungsanfrage
            </p>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">
                Montagefirma
                <input
                  value={installerCompany}
                  onChange={(event) => setInstallerCompany(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base font-semibold text-slate-900 outline-none transition-colors focus:border-slate-400"
                  placeholder="z. B. Sentup"
                />
              </label>

              <label className="text-xs font-black uppercase tracking-widest text-slate-500">
                E-Mail
                <input
                  value={installerEmail}
                  onChange={(event) => setInstallerEmail(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base font-semibold text-slate-900 outline-none transition-colors focus:border-slate-400"
                  placeholder="montage@firma.at"
                />
              </label>

              <label className="text-xs font-black uppercase tracking-widest text-slate-500">
                Ansprechpartner
                <input
                  value={installerContact}
                  onChange={(event) => setInstallerContact(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base font-semibold text-slate-900 outline-none transition-colors focus:border-slate-400"
                  placeholder="optional"
                />
              </label>

              <label className="text-xs font-black uppercase tracking-widest text-slate-500">
                Gewünschter Montagetermin
                <input
                  type="date"
                  value={requestedInstallationDate}
                  onChange={(event) => setRequestedInstallationDate(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base font-semibold text-slate-900 outline-none transition-colors focus:border-slate-400"
                />
              </label>
            </div>

            <label className="mt-3 block text-xs font-black uppercase tracking-widest text-slate-500">
              Anmerkung an Montagefirma
              <textarea
                value={requestNotes}
                onChange={(event) => setRequestNotes(event.target.value)}
                rows={3}
                className="mt-1 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base font-medium normal-case tracking-normal text-slate-900 outline-none transition-colors focus:border-slate-400"
                placeholder="z. B. Zugang, Parkmöglichkeit, gewünschtes Zeitfenster"
              />
            </label>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                Pläne für E-Mail-Anhang
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Beim Reservieren müssen Pläne mitgeschickt werden. Wähle die relevanten Unterlagen.
              </p>

              <div className="mt-3 space-y-2">
                {planDocuments.length === 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                    Für diesen Auftrag wurden keine Plan-Dokumente (`PLANE`/`INSTALLATIONSPLANE`) gefunden.
                  </div>
                )}

                {planDocuments.map((doc) => {
                  const checked = selectedPlanIds.includes(doc.id)
                  return (
                    <label
                      key={doc.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2 transition-colors ${
                        checked ? 'border-slate-300 bg-slate-50' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePlan(doc.id)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-700"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-900">{doc.name}</span>
                        <span className="block text-xs text-slate-500">
                          {doc.type || 'Dokument'} · hochgeladen {formatDate(doc.uploadedAt)}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (!row) {
                    return
                  }

                  setBusyState('request')
                  setError(null)

                  try {
                    const result = await sendInstallationReservationRequest(row.projectId, {
                      supplierOrderId: row.orderId,
                      installerCompany: installerCompany.trim(),
                      installerContact: installerContact.trim() || undefined,
                      installerEmail: installerEmail.trim(),
                      requestedInstallationDate: requestedInstallationDate || undefined,
                      requestNotes: requestNotes.trim() || undefined,
                      planDocumentIds: selectedPlanIds,
                    })

                    await refreshAfterMutation(result.reservation)
                    showSuccess('Montage-Reservierung per E-Mail versendet.')
                  } catch (requestError) {
                    const message =
                      requestError instanceof Error
                        ? requestError.message
                        : 'Montage-Reservierung konnte nicht versendet werden.'
                    setError(message)
                    showError(message)
                  } finally {
                    setBusyState(null)
                  }
                }}
                disabled={requestDisabled}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyState === 'request' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Mail className="h-3.5 w-3.5" />
                )}
                Reservierung per Mail senden
              </button>
              <p className="text-xs text-slate-500">Ausgewählte Pläne: {selectedPlanIds.length}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
              Bestätigte Reservierung
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Sobald die Montagefirma antwortet, hier Referenz, Termin und Dokument erfassen.
            </p>

            <div className="mt-3 space-y-3">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500">
                Reservierungsreferenz
                <input
                  value={confirmationReference}
                  onChange={(event) => setConfirmationReference(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base font-semibold text-slate-900 outline-none transition-colors focus:border-slate-400"
                  placeholder="z. B. SENTUP-2026-041"
                />
              </label>

              <label className="block text-xs font-black uppercase tracking-widest text-slate-500">
                Bestätigter Montagetermin
                <input
                  type="date"
                  value={confirmationDate}
                  onChange={(event) => setConfirmationDate(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base font-semibold text-slate-900 outline-none transition-colors focus:border-slate-400"
                />
              </label>

              <label className="block text-xs font-black uppercase tracking-widest text-slate-500">
                Bestätigungsnotiz
                <textarea
                  value={confirmationNotes}
                  onChange={(event) => setConfirmationNotes(event.target.value)}
                  rows={4}
                  className="mt-1 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base font-medium normal-case tracking-normal text-slate-900 outline-none transition-colors focus:border-slate-400"
                  placeholder="z. B. Zeitfenster, Teamgröße, Vorbedingungen"
                />
              </label>

              <label className="block text-xs font-black uppercase tracking-widest text-slate-500">
                Bestätigungsdokument (optional)
                <input
                  type="file"
                  onChange={(event) => setConfirmationFile(event.target.files?.[0] || null)}
                  className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                />
              </label>

              {reservation?.confirmationDocumentName && (
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                  <Paperclip className="h-3.5 w-3.5" />
                  Aktuelles Bestätigungsdokument: {reservation.confirmationDocumentName}
                </p>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (!row) {
                    return
                  }

                  setBusyState('confirm')
                  setError(null)

                  try {
                    const result = await saveInstallationReservationConfirmation(row.projectId, {
                      supplierOrderId: row.orderId,
                      installerCompany: installerCompany.trim() || undefined,
                      installerContact: installerContact.trim() || undefined,
                      installerEmail: installerEmail.trim() || undefined,
                      confirmationReference: confirmationReference.trim() || undefined,
                      confirmationDate: confirmationDate || undefined,
                      confirmationNotes: confirmationNotes.trim() || undefined,
                      confirmationFile,
                    })

                    await refreshAfterMutation(result.reservation)
                    setConfirmationFile(null)
                    showSuccess('Bestätigte Montage-Reservierung gespeichert.')
                  } catch (confirmError) {
                    const message =
                      confirmError instanceof Error
                        ? confirmError.message
                        : 'Bestätigte Reservierung konnte nicht gespeichert werden.'
                    setError(message)
                    showError(message)
                  } finally {
                    setBusyState(null)
                  }
                }}
                disabled={isBusy || Boolean(schemaHint)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyState === 'confirm' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Bestätigung speichern
              </button>

              {planDocuments.length === 0 && (
                <p className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Ohne Pläne kann keine Reservierungs-Mail versendet werden.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onClose}
          disabled={isBusy}
          className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Schließen
        </button>
      </div>
    </ModalShell>
  )
}
