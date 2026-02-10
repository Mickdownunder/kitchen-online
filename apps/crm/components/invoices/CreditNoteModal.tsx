'use client'

import React, { useState, useEffect } from 'react'
import { X, AlertTriangle, Loader2 } from 'lucide-react'
import { canCancelInvoice, createCreditNote } from '@/lib/supabase/services/invoices'
import type { ListInvoice } from '@/hooks/useInvoiceFilters'

interface CreditNoteModalProps {
  isOpen: boolean
  invoice: ListInvoice | null
  onClose: () => void
  onSuccess: () => void
}

export const CreditNoteModal: React.FC<CreditNoteModalProps> = ({
  isOpen,
  invoice,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [canCancel, setCanCancel] = useState(false)
  const [reason, setReason] = useState<string>('')
  const [remainingAmount, setRemainingAmount] = useState<number>(0)
  const [cancelType, setCancelType] = useState<'full' | 'partial'>('full')
  const [partialAmount, setPartialAmount] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // Prüfen ob Rechnung stornierbar ist
  useEffect(() => {
    let isActive = true

    if (!isOpen || !invoice) {
      const timer = window.setTimeout(() => {
        if (isActive) {
          setChecking(false)
        }
      }, 0)
      return () => {
        isActive = false
        window.clearTimeout(timer)
      }
    }

    const timer = window.setTimeout(() => {
      if (isActive) {
        setChecking(true)
        setError(null)
      }
    }, 0)

    canCancelInvoice(invoice.id)
      .then(result => {
        if (!isActive) return

        if (result.ok) {
          setCanCancel(result.data.canCancel)
          setReason(result.data.reason || '')
          setRemainingAmount(result.data.remainingAmount || invoice.amount)
          setPartialAmount('')
          setCancelType('full')
        } else {
          setError(result.message || 'Fehler beim Prüfen')
          setCanCancel(false)
        }
      })
      .finally(() => {
        if (isActive) {
          setChecking(false)
        }
      })

    return () => {
      isActive = false
      window.clearTimeout(timer)
    }
  }, [isOpen, invoice])

  const handleSubmit = async () => {
    if (!invoice || !canCancel) return

    setLoading(true)
    setError(null)

    const amount = cancelType === 'partial' ? parseFloat(partialAmount) : undefined

    if (cancelType === 'partial' && (!amount || amount <= 0)) {
      setError('Bitte geben Sie einen gültigen Betrag ein')
      setLoading(false)
      return
    }

    const result = await createCreditNote({
      invoiceId: invoice.id,
      partialAmount: amount,
    })

    if (result.ok) {
      onSuccess()
      onClose()
    } else {
      setError(result.message || 'Fehler beim Erstellen der Stornorechnung')
    }
    setLoading(false)
  }

  if (!isOpen) return null

  const formatCurrency = (value: number) =>
    value.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-red-100 p-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Rechnung stornieren</h2>
              <p className="text-sm text-slate-500">
                {invoice?.invoiceNumber} • {invoice?.project.customerName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {checking ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : !canCancel ? (
            <div className="rounded-xl bg-red-50 p-4 text-center">
              <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-red-500" />
              <p className="font-medium text-red-700">{reason}</p>
            </div>
          ) : (
            <>
              {/* Rechnungsdetails */}
              <div className="mb-6 rounded-xl bg-slate-50 p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Rechnungstyp</p>
                    <p className="font-bold text-slate-900">
                      {invoice?.type === 'partial' ? 'Anzahlung' : 'Schlussrechnung'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Originalbetrag</p>
                    <p className="font-bold text-slate-900">{formatCurrency(invoice?.amount || 0)} €</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Stornierbarer Betrag</p>
                    <p className="font-bold text-emerald-600">{formatCurrency(remainingAmount)} €</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Rechnungsdatum</p>
                    <p className="font-bold text-slate-900">
                      {invoice?.invoiceDate
                        ? new Date(invoice.invoiceDate).toLocaleDateString('de-AT')
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Storno-Optionen */}
              <div className="mb-6 space-y-3">
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 transition-colors hover:bg-slate-50">
                  <input
                    type="radio"
                    name="cancelType"
                    value="full"
                    checked={cancelType === 'full'}
                    onChange={() => setCancelType('full')}
                    className="h-4 w-4 text-red-600 focus:ring-red-500"
                  />
                  <div>
                    <p className="font-bold text-slate-900">Vollstorno</p>
                    <p className="text-sm text-slate-500">
                      Gesamten Betrag stornieren: -{formatCurrency(remainingAmount)} €
                    </p>
                  </div>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition-colors hover:bg-slate-50">
                  <input
                    type="radio"
                    name="cancelType"
                    value="partial"
                    checked={cancelType === 'partial'}
                    onChange={() => setCancelType('partial')}
                    className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500"
                  />
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">Teilstorno</p>
                    <p className="mb-2 text-sm text-slate-500">Nur einen Teil stornieren</p>
                    {cancelType === 'partial' && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">-</span>
                        <input
                          type="number"
                          value={partialAmount}
                          onChange={e => setPartialAmount(e.target.value)}
                          placeholder="0,00"
                          step="0.01"
                          min="0.01"
                          max={remainingAmount}
                          className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-right font-bold outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                        />
                        <span className="text-slate-500">€</span>
                      </div>
                    )}
                  </div>
                </label>
              </div>

              {/* Hinweis */}
              <div className="mb-6 rounded-xl bg-amber-50 p-4">
                <p className="text-sm text-amber-800">
                  <strong>Hinweis:</strong> Es wird eine Stornorechnung mit negativem Betrag erstellt.
                  Diese wird in der UVA und allen Statistiken automatisch verrechnet.
                </p>
              </div>

              {/* Fehler */}
              {error && (
                <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-6 py-2.5 font-bold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !canCancel || checking}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Stornorechnung erstellen
          </button>
        </div>
      </div>
    </div>
  )
}
