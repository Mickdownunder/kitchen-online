import { useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Loader2,
  Receipt,
} from 'lucide-react'

export interface Invoice {
  id: string
  invoice_number: string
  type: 'partial' | 'final' | 'credit'
  amount: number
  invoice_date: string
  due_date: string | null
  is_paid: boolean
  paid_date: string | null
  description: string | null
}

export interface ProjectPaymentInfo {
  totalAmount: number
  depositAmount: number
  isDepositPaid: boolean
  isFinalPaid: boolean
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

function formatDate(dateString: string | null): string {
  if (!dateString) {
    return '-'
  }

  try {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return '-'
  }
}

function isOverdue(dueDate: string | null, isPaid: boolean): boolean {
  if (isPaid || !dueDate) {
    return false
  }

  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due < today
}

interface InvoiceCardProps {
  invoice: Invoice
  onDownload?: () => Promise<void>
}

export function InvoiceCard({ invoice, onDownload }: InvoiceCardProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const overdue = isOverdue(invoice.due_date, invoice.is_paid)

  const handleDownload = async () => {
    if (!onDownload) {
      return
    }

    setIsDownloading(true)
    try {
      await onDownload()
    } catch {
      alert('Fehler beim Download')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 transition-all duration-300 hover:shadow-lg ${
        invoice.is_paid
          ? 'ring-emerald-200/50'
          : overdue
            ? 'ring-red-200'
            : 'ring-slate-200/50 hover:shadow-slate-200/50'
      }`}
    >
      <div className="absolute right-4 top-4">
        {invoice.is_paid ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Bezahlt
          </span>
        ) : overdue ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
            <AlertCircle className="h-3.5 w-3.5" />
            Überfällig
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
            <Clock className="h-3.5 w-3.5" />
            Offen
          </span>
        )}
      </div>

      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${
            invoice.type === 'final' ? 'bg-purple-50' : 'bg-blue-50'
          }`}
        >
          {invoice.type === 'final' ? (
            <Receipt className="h-6 w-6 text-purple-600" />
          ) : (
            <FileText className="h-6 w-6 text-blue-600" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className={`font-semibold ${invoice.type === 'credit' ? 'text-red-600' : 'text-slate-900'}`}>
                {invoice.type === 'credit'
                  ? 'Stornorechnung'
                  : invoice.type === 'final'
                    ? 'Schlussrechnung'
                    : 'Teilrechnung'}
              </h3>
              <p className="text-sm text-slate-500">{invoice.invoice_number}</p>
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">{formatCurrency(invoice.amount)}</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Rechnungsdatum</span>
              <p className="font-medium text-slate-700">{formatDate(invoice.invoice_date)}</p>
            </div>
            <div>
              <span className="text-slate-500">Fällig am</span>
              <p className={`font-medium ${overdue ? 'text-red-600' : 'text-slate-700'}`}>
                {formatDate(invoice.due_date)}
              </p>
            </div>
          </div>

          {invoice.is_paid && invoice.paid_date && (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <span className="text-sm text-emerald-600">Bezahlt am {formatDate(invoice.paid_date)}</span>
            </div>
          )}

          {invoice.description && (
            <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-500">{invoice.description}</p>
          )}

          {onDownload && (
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-slate-200 disabled:opacity-50"
            >
              {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              PDF herunterladen
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
