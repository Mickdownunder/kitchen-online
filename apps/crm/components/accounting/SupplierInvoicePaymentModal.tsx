import React from 'react'
import { CheckCircle2 } from 'lucide-react'
import type { PaymentMethod, SupplierInvoice } from '@/types'
import { formatSupplierInvoiceCurrency } from '@/components/accounting/supplierInvoices.constants'

interface SupplierInvoicePaymentModalProps {
  payingInvoice: SupplierInvoice | null
  paidDate: string
  setPaidDate: (value: string) => void
  paymentMethod: PaymentMethod
  setPaymentMethod: (value: PaymentMethod) => void
  onClose: () => void
  onConfirm: () => void
}

export function SupplierInvoicePaymentModal({
  payingInvoice,
  paidDate,
  setPaidDate,
  paymentMethod,
  setPaymentMethod,
  onClose,
  onConfirm,
}: SupplierInvoicePaymentModalProps) {
  if (!payingInvoice) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <h3 className="mb-6 text-xl font-black text-slate-900">Als bezahlt markieren</h3>
        <p className="mb-4 text-sm text-slate-600">
          Rechnung {payingInvoice.invoiceNumber} von {payingInvoice.supplierName}
        </p>
        <p className="mb-6 text-2xl font-black text-slate-900">
          {formatSupplierInvoiceCurrency(payingInvoice.grossAmount)} €
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">Bezahlt am</label>
            <input
              type="date"
              value={paidDate}
              onChange={event => setPaidDate(event.target.value)}
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-medium transition-all focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">Zahlungsart</label>
            <select
              value={paymentMethod}
              onChange={event => setPaymentMethod(event.target.value as PaymentMethod)}
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-medium transition-all focus:border-amber-500 focus:outline-none"
            >
              <option value="bank">Überweisung</option>
              <option value="cash">Bar</option>
              <option value="credit_card">Kreditkarte</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border-2 border-slate-200 px-6 py-3 font-bold text-slate-600 transition-all hover:bg-slate-50"
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-bold text-white shadow-lg transition-all hover:bg-emerald-600"
          >
            <CheckCircle2 className="h-5 w-5" />
            Bezahlt
          </button>
        </div>
      </div>
    </div>
  )
}
