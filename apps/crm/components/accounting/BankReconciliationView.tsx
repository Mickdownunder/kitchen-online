'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Landmark,
  Upload,
  Link2,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  X,
} from 'lucide-react'
import { BankAccount, BankTransaction, SupplierInvoice, Invoice } from '@/types'
import {
  getCompanySettings,
  getBankAccounts,
  getBankTransactions,
  getOpenSupplierInvoices,
  getInvoicesWithProject,
  assignTransactionToSupplierInvoice,
  assignTransactionToOutgoingInvoice,
} from '@/lib/supabase/services'
import { logger } from '@/lib/utils/logger'

const formatCurrency = (value: number) =>
  value.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function BankReconciliationView() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('')
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [assignModal, setAssignModal] = useState<BankTransaction | null>(null)
  const [openSupplierInvoices, setOpenSupplierInvoices] = useState<SupplierInvoice[]>([])
  const [openOutgoingInvoices, setOpenOutgoingInvoices] = useState<Invoice[]>([])
  const [loadingAssignList, setLoadingAssignList] = useState(false)

  const loadBankAccountsAndTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const settings = await getCompanySettings()
      if (!settings?.id) {
        setBankAccounts([])
        setTransactions([])
        return
      }
      const accounts = await getBankAccounts(settings.id)
      setBankAccounts(accounts)
      if (accounts.length > 0 && !selectedBankAccountId) {
        setSelectedBankAccountId(accounts[0].id)
      }
      const tx = await getBankTransactions({
        bankAccountId: selectedBankAccountId || undefined,
        limit: 500,
      })
      setTransactions(tx)
    } catch (error) {
      logger.error('Error loading bank data', { component: 'BankReconciliationView' }, error as Error)
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }, [selectedBankAccountId])

  useEffect(() => {
    loadBankAccountsAndTransactions()
  }, [loadBankAccountsAndTransactions])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!selectedBankAccountId && bankAccounts.length > 0) {
      setSelectedBankAccountId(bankAccounts[0].id)
    }
    setUploadError(null)
    setUploading(true)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const dataUrl = reader.result as string
          const b = dataUrl.indexOf(',')
          resolve(b >= 0 ? dataUrl.slice(b + 1) : dataUrl)
        }
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
      const mimeType = file.type || 'application/pdf'
      const res = await fetch('/api/accounting/bank-transactions/import-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Data: base64,
          mimeType,
          bankAccountId: selectedBankAccountId || bankAccounts[0]?.id || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setUploadError(data.error || 'Import fehlgeschlagen')
        return
      }
      await loadBankAccountsAndTransactions()
    } catch (err) {
      logger.error('Bank PDF upload error', { component: 'BankReconciliationView' }, err as Error)
      setUploadError('Upload fehlgeschlagen. Bitte erneut versuchen.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const openAssignModal = async (tx: BankTransaction) => {
    setAssignModal(tx)
    setLoadingAssignList(true)
    try {
      const [supplier, outgoing] = await Promise.all([
        getOpenSupplierInvoices(),
        getInvoicesWithProject().then(result => result.ok ? result.data.filter(inv => !inv.isPaid) : []),
      ])
      setOpenSupplierInvoices(supplier)
      setOpenOutgoingInvoices(outgoing)
    } finally {
      setLoadingAssignList(false)
    }
  }

  const handleAssignToSupplierInvoice = async (supplierInvoiceId: string) => {
    if (!assignModal) return
    setAssigningId(assignModal.id)
    try {
      await assignTransactionToSupplierInvoice(assignModal.id, supplierInvoiceId)
      setAssignModal(null)
      await loadBankAccountsAndTransactions()
    } catch (err) {
      logger.error('Assign supplier invoice error', { component: 'BankReconciliationView' }, err as Error)
      alert('Zuordnung fehlgeschlagen.')
    } finally {
      setAssigningId(null)
    }
  }

  const handleAssignToOutgoingInvoice = async (invoiceId: string) => {
    if (!assignModal) return
    setAssigningId(assignModal.id)
    try {
      await assignTransactionToOutgoingInvoice(assignModal.id, invoiceId)
      setAssignModal(null)
      await loadBankAccountsAndTransactions()
    } catch (err) {
      logger.error('Assign outgoing invoice error', { component: 'BankReconciliationView' }, err as Error)
      alert('Zuordnung fehlgeschlagen.')
    } finally {
      setAssigningId(null)
    }
  }

  // Vorschläge: offene ERs mit passendem Betrag, älteste Fälligkeit zuerst (z. B. ER vom Vormonat)
  const suggestedSupplierInvoices = assignModal
    ? openSupplierInvoices
        .filter(inv => Math.abs(inv.grossAmount - Math.abs(assignModal.amount)) < 0.02)
        .sort((a, b) => (a.dueDate || a.invoiceDate).localeCompare(b.dueDate || b.invoiceDate))
        .slice(0, 10)
    : []
  const suggestedOutgoingInvoices = assignModal
    ? openOutgoingInvoices
        .filter(inv => Math.abs(inv.amount - assignModal.amount) < 0.02)
        .slice(0, 5)
    : []

  if (loading && transactions.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <Loader2 className="h-12 w-12 animate-spin text-amber-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-2xl font-black text-slate-900">Bankabgleich</h3>
          <p className="text-sm text-slate-500">
            Monatsliste (PDF) einspielen und Bewegungen Rechnungen zuordnen
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {bankAccounts.length > 0 && (
            <select
              value={selectedBankAccountId}
              onChange={e => setSelectedBankAccountId(e.target.value)}
              className="rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
            >
              {bankAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.bankName} · {acc.iban.slice(-4)}
                </option>
              ))}
            </select>
          )}
          <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-bold text-white shadow-lg transition-all hover:bg-amber-600">
            <Upload className="h-5 w-5" />
            {uploading ? 'Wird eingespielt…' : 'Monatsliste (PDF) einspielen'}
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              disabled={uploading}
              onChange={handleFileSelect}
            />
          </label>
        </div>
      </div>

      {uploadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
          {uploadError}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-slate-100">
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                  Datum
                </th>
                <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-wider text-slate-500">
                  Betrag
                </th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                  Verwendungszweck
                </th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                  Zuordnung
                </th>
                <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider text-slate-500">
                  Aktion
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    Noch keine Kontobewegungen. Laden Sie eine Monatsliste (PDF) hoch.
                  </td>
                </tr>
              ) : (
                transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {new Date(tx.transactionDate).toLocaleDateString('de-AT')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={
                          tx.amount >= 0
                            ? 'font-bold text-emerald-600'
                            : 'font-bold text-red-600'
                        }
                      >
                        {tx.amount >= 0 ? '+' : ''}
                        {formatCurrency(tx.amount)} €
                      </span>
                    </td>
                    <td className="max-w-xs truncate px-6 py-4 text-sm text-slate-600">
                      {tx.reference || '—'}
                    </td>
                    <td className="px-6 py-4">
                      {tx.supplierInvoiceId ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                          <ArrowDownLeft className="h-3 w-3" />
                          Eingangsrechnung
                        </span>
                      ) : tx.invoiceId ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                          <ArrowUpRight className="h-3 w-3" />
                          Ausgangsrechnung
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {!tx.supplierInvoiceId && !tx.invoiceId ? (
                        <button
                          type="button"
                          onClick={() => openAssignModal(tx)}
                          className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-3 py-2 text-sm font-bold text-amber-700 transition-colors hover:bg-amber-200"
                        >
                          <Link2 className="h-4 w-4" />
                          Zuordnen
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Zuordnen-Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-3xl bg-white p-8 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">Bewegung zuordnen</h3>
              <button
                type="button"
                onClick={() => setAssignModal(null)}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <p className="mb-4 text-sm text-slate-600">
              {new Date(assignModal.transactionDate).toLocaleDateString('de-AT')} ·{' '}
              <span className={assignModal.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                {formatCurrency(assignModal.amount)} €
              </span>
              {assignModal.reference && ` · ${assignModal.reference}`}
            </p>

            {loadingAssignList ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              </div>
            ) : assignModal.amount < 0 ? (
              <div>
                <h4 className="mb-3 font-bold text-slate-800">Eingangsrechnung (Abbuchung)</h4>
                {suggestedSupplierInvoices.length > 0 && (
                  <p className="mb-2 text-xs text-slate-500">
                    Vorschläge (Betrag passt) – inkl. ER vom Vormonat, sobald bezahlt
                  </p>
                )}
                <ul className="max-h-72 space-y-2 overflow-y-auto">
                  {[...suggestedSupplierInvoices, ...openSupplierInvoices]
                    .filter(
                      (inv, i, arr) =>
                        arr.findIndex(x => x.id === inv.id) === i
                    )
                    .slice(0, 25)
                    .map(inv => (
                      <li key={inv.id}>
                        <button
                          type="button"
                          disabled={assigningId === assignModal.id}
                          onClick={() => handleAssignToSupplierInvoice(inv.id)}
                          className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-amber-50"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="font-medium text-slate-900">
                              {inv.supplierName} · {inv.invoiceNumber}
                            </span>
                            <span className="ml-2 text-xs text-slate-500">
                              Rechnung {new Date(inv.invoiceDate).toLocaleDateString('de-AT')}
                              {inv.dueDate
                                ? ` · fällig ${new Date(inv.dueDate).toLocaleDateString('de-AT')}`
                                : ''}
                            </span>
                          </span>
                          <span className="shrink-0 font-bold text-slate-700">
                            {formatCurrency(inv.grossAmount)} €
                          </span>
                        </button>
                      </li>
                    ))}
                </ul>
                {openSupplierInvoices.length === 0 && (
                  <p className="py-4 text-sm text-slate-500">
                    Keine offenen Eingangsrechnungen.
                  </p>
                )}
              </div>
            ) : (
              <div>
                <h4 className="mb-3 font-bold text-slate-800">Ausgangsrechnung (Gutschrift)</h4>
                {suggestedOutgoingInvoices.length > 0 && (
                  <p className="mb-2 text-xs text-slate-500">Vorschläge (Betrag passt)</p>
                )}
                <ul className="max-h-64 space-y-2 overflow-y-auto">
                  {[...suggestedOutgoingInvoices, ...openOutgoingInvoices]
                    .filter(
                      (inv, i, arr) =>
                        arr.findIndex(x => x.id === inv.id) === i
                    )
                    .slice(0, 20)
                    .map(inv => (
                      <li key={inv.id}>
                        <button
                          type="button"
                          disabled={assigningId === assignModal.id}
                          onClick={() => handleAssignToOutgoingInvoice(inv.id)}
                          className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-amber-50"
                        >
                          <span className="font-medium text-slate-900">
                            {inv.invoiceNumber}
                            {inv.project ? ` · ${inv.project.customerName}` : ''}
                          </span>
                          <span className="font-bold text-slate-700">
                            {formatCurrency(inv.amount)} €
                          </span>
                        </button>
                      </li>
                    ))}
                </ul>
                {openOutgoingInvoices.length === 0 && (
                  <p className="py-4 text-sm text-slate-500">
                    Keine offenen Ausgangsrechnungen.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
