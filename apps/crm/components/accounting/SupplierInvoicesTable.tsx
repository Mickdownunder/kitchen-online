import React from 'react'
import { AlertCircle, Building2, CheckCircle2, Clock, Edit, FileText, Trash2 } from 'lucide-react'
import type { CustomerProject, SupplierInvoice } from '@/types'
import {
  formatSupplierInvoiceCurrency,
  getSupplierInvoiceCategoryColor,
  getSupplierInvoiceCategoryLabel,
} from '@/components/accounting/supplierInvoices.constants'
import { calculatePayableAmount } from '@/lib/utils/accountingAmounts'

interface SupplierInvoicesTableProps {
  invoices: SupplierInvoice[]
  filteredInvoices: SupplierInvoice[]
  projects: CustomerProject[]
  onEdit: (invoice: SupplierInvoice) => void
  onDelete: (invoice: SupplierInvoice) => void
  onMarkUnpaid: (invoice: SupplierInvoice) => void
  onStartMarkPaid: (invoice: SupplierInvoice) => void
}

export function SupplierInvoicesTable({
  invoices,
  filteredInvoices,
  projects,
  onEdit,
  onDelete,
  onMarkUnpaid,
  onStartMarkPaid,
}: SupplierInvoicesTableProps) {
  const projectMap = new Map(projects.map(project => [project.id, project]))

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-slate-100">
              <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                Lieferant
              </th>
              <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                Rechnungsnr.
              </th>
              <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                Datum
              </th>
              <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                Kategorie
              </th>
              <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                Auftrag
              </th>
              <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-wider text-slate-500">
                Netto
              </th>
              <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-wider text-slate-500">
                MwSt
              </th>
              <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-wider text-slate-500">
                Brutto
              </th>
              <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider text-slate-500">
                Status
              </th>
              <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider text-slate-500">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                  {invoices.length === 0
                    ? 'Noch keine Eingangsrechnungen erfasst'
                    : 'Keine Rechnungen gefunden'}
                </td>
              </tr>
            ) : (
              filteredInvoices.map(invoice => {
                const today = new Date().toISOString().split('T')[0]
                const isOverdue = !invoice.isPaid && invoice.dueDate && invoice.dueDate < today

                return (
                  <tr key={invoice.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                          <Building2 className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{invoice.supplierName}</p>
                          {invoice.supplierUid && (
                            <p className="text-xs text-slate-500">UID: {invoice.supplierUid}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-slate-700">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-slate-700">
                          {new Date(invoice.invoiceDate).toLocaleDateString('de-AT')}
                        </p>
                        {invoice.dueDate && (
                          <p
                            className={`text-xs ${isOverdue ? 'font-bold text-red-600' : 'text-slate-500'}`}
                          >
                            Fällig: {new Date(invoice.dueDate).toLocaleDateString('de-AT')}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getSupplierInvoiceCategoryColor(invoice.category)}`}
                      >
                        {getSupplierInvoiceCategoryLabel(invoice.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {invoice.projectId ? (
                        <span className="text-xs font-medium text-slate-600">
                          {projectMap.get(invoice.projectId)?.orderNumber ?? '—'}{' '}
                          <span className="text-slate-400">
                            ({projectMap.get(invoice.projectId)?.customerName ?? ''})
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-700">
                      {formatSupplierInvoiceCurrency(invoice.netAmount)} €
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-slate-500">
                      {formatSupplierInvoiceCurrency(invoice.taxAmount)} €
                      <span className="ml-1 text-xs">({invoice.taxRate}%)</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div>
                        <span className="font-black text-slate-900">
                          {formatSupplierInvoiceCurrency(invoice.grossAmount)} €
                        </span>
                        {invoice.skontoAmount != null && invoice.skontoAmount > 0 && (
                          <p className="text-xs text-slate-500">
                            nach Skonto:{' '}
                            {formatSupplierInvoiceCurrency(
                              calculatePayableAmount(invoice.grossAmount, invoice.skontoAmount),
                            )}{' '}
                            €
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {invoice.isPaid ? (
                        <button
                          onClick={() => onMarkUnpaid(invoice)}
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-200"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Bezahlt
                        </button>
                      ) : isOverdue ? (
                        <button
                          onClick={() => onStartMarkPaid(invoice)}
                          className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700 transition-colors hover:bg-red-200"
                        >
                          <AlertCircle className="h-3 w-3" />
                          Überfällig
                        </button>
                      ) : (
                        <button
                          onClick={() => onStartMarkPaid(invoice)}
                          className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-200"
                        >
                          <Clock className="h-3 w-3" />
                          Offen
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {invoice.documentUrl && (
                          <a
                            href={`/api/accounting/supplier-invoices/${invoice.id}/document`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-amber-600"
                            title="Beleg anzeigen"
                          >
                            <FileText className="h-4 w-4" />
                          </a>
                        )}
                        <button
                          onClick={() => onEdit(invoice)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDelete(invoice)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
