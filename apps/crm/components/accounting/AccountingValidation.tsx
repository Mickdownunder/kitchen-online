'use client'

import React, { useMemo } from 'react'
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react'
import { SupplierInvoice } from '@/types'
import { calculateTaxAmount } from '@/lib/utils/accountingAmounts'

interface ValidationWarning {
  id: string
  type: 'error' | 'warning' | 'info'
  title: string
  message: string
  details?: string[]
}

interface AccountingValidationProps {
  outgoingInvoices: {
    invoiceNumber: string
    date: string
    customerName: string
    netAmount: number
    taxAmount: number
    grossAmount: number
    taxRate: number
  }[]
  supplierInvoices: SupplierInvoice[]
  totalOutputTax: number // Umsatzsteuer
  totalInputTax: number // Vorsteuer
  period: string
}

export function AccountingValidation({
  outgoingInvoices,
  supplierInvoices,
  totalOutputTax,
  totalInputTax,
  period,
}: AccountingValidationProps) {
  const warnings = useMemo(() => {
    const results: ValidationWarning[] = []

    // 1. Prüfe ob Vorsteuer > Umsatzsteuer (ungewöhnlich, aber möglich)
    if (totalInputTax > totalOutputTax && totalOutputTax > 0) {
      const ratio = ((totalInputTax / totalOutputTax) * 100).toFixed(0)
      results.push({
        id: 'input-tax-high',
        type: 'info',
        title: 'Vorsteuerüberhang',
        message: `Die Vorsteuer (${formatCurrency(totalInputTax)} €) übersteigt die Umsatzsteuer (${formatCurrency(totalOutputTax)} €) um ${ratio}%.`,
        details: [
          'Dies führt zu einer Erstattung vom Finanzamt.',
          'Prüfen Sie, ob alle Eingangsrechnungen korrekt erfasst wurden.',
        ],
      })
    }

    // 2. Prüfe auf fehlende UID bei Eingangsrechnungen > 400€
    const missingUidInvoices = supplierInvoices.filter(
      inv => inv.grossAmount > 400 && !inv.supplierUid
    )
    if (missingUidInvoices.length > 0) {
      results.push({
        id: 'missing-uid',
        type: 'warning',
        title: 'Fehlende UID-Nummern',
        message: `${missingUidInvoices.length} Eingangsrechnung${missingUidInvoices.length > 1 ? 'en' : ''} über 400€ ohne UID-Nummer.`,
        details: missingUidInvoices
          .slice(0, 5)
          .map(
            inv =>
              `${inv.supplierName}: ${inv.invoiceNumber} (${formatCurrency(inv.grossAmount)} €)`
          ),
      })
    }

    // 3. Prüfe auf doppelte Rechnungsnummern (Ausgang)
    const outgoingNumbers = outgoingInvoices.map(inv => inv.invoiceNumber)
    const duplicateOutgoing = outgoingNumbers.filter(
      (num, idx) => outgoingNumbers.indexOf(num) !== idx
    )
    if (duplicateOutgoing.length > 0) {
      results.push({
        id: 'duplicate-outgoing',
        type: 'error',
        title: 'Doppelte Rechnungsnummern (Ausgang)',
        message: `${[...new Set(duplicateOutgoing)].length} Rechnungsnummer${duplicateOutgoing.length > 1 ? 'n' : ''} mehrfach verwendet.`,
        details: [...new Set(duplicateOutgoing)].slice(0, 5),
      })
    }

    // 4. Prüfe auf doppelte Lieferanten-Rechnungsnummern
    const supplierNumberMap = new Map<string, SupplierInvoice[]>()
    supplierInvoices.forEach(inv => {
      const key = `${inv.supplierName}:${inv.invoiceNumber}`
      if (!supplierNumberMap.has(key)) {
        supplierNumberMap.set(key, [])
      }
      supplierNumberMap.get(key)!.push(inv)
    })
    const duplicateSupplier = Array.from(supplierNumberMap.entries()).filter(
      ([, invoices]) => invoices.length > 1
    )
    if (duplicateSupplier.length > 0) {
      results.push({
        id: 'duplicate-supplier',
        type: 'error',
        title: 'Doppelte Eingangsrechnungen',
        message: `${duplicateSupplier.length} Lieferantenrechnung${duplicateSupplier.length > 1 ? 'en' : ''} möglicherweise doppelt erfasst.`,
        details: duplicateSupplier.slice(0, 5).map(([key]) => key.replace(':', ' - ')),
      })
    }

    // 5. Prüfe auf ungewöhnlich hohe Einzelrechnungen (> 50.000€)
    const highValueOutgoing = outgoingInvoices.filter(inv => inv.grossAmount > 50000)
    const highValueIncoming = supplierInvoices.filter(inv => inv.grossAmount > 50000)
    if (highValueOutgoing.length > 0 || highValueIncoming.length > 0) {
      const details: string[] = []
      highValueOutgoing.forEach(inv => {
        details.push(
          `Ausgang: ${inv.invoiceNumber} - ${inv.customerName} (${formatCurrency(inv.grossAmount)} €)`
        )
      })
      highValueIncoming.forEach(inv => {
        details.push(
          `Eingang: ${inv.invoiceNumber} - ${inv.supplierName} (${formatCurrency(inv.grossAmount)} €)`
        )
      })
      results.push({
        id: 'high-value',
        type: 'info',
        title: 'Rechnungen über 50.000 €',
        message: `${highValueOutgoing.length + highValueIncoming.length} Rechnung${highValueOutgoing.length + highValueIncoming.length > 1 ? 'en' : ''} mit hohem Wert.`,
        details: details.slice(0, 5),
      })
    }

    // 6. Prüfe auf Rundungsdifferenzen
    const outgoingRoundingIssues = outgoingInvoices.filter(inv => {
      const expectedTax = calculateTaxAmount(inv.netAmount, inv.taxRate)
      const diff = Math.abs(inv.taxAmount - expectedTax)
      return diff > 0.02 // Mehr als 2 Cent Differenz
    })
    if (outgoingRoundingIssues.length > 0) {
      results.push({
        id: 'rounding-issues',
        type: 'warning',
        title: 'Mögliche Rundungsdifferenzen',
        message: `${outgoingRoundingIssues.length} Rechnung${outgoingRoundingIssues.length > 1 ? 'en' : ''} mit unerwarteter MwSt-Berechnung.`,
        details: outgoingRoundingIssues
          .slice(0, 3)
          .map(
            inv =>
              `${inv.invoiceNumber}: Netto ${formatCurrency(inv.netAmount)} × ${inv.taxRate}% ≠ ${formatCurrency(inv.taxAmount)}`
          ),
      })
    }

    // 7. Prüfe ob offene Rechnungen älter als 90 Tage
    const today = new Date()
    const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)
    const oldOpenSupplier = supplierInvoices.filter(
      inv => !inv.isPaid && new Date(inv.invoiceDate) < ninetyDaysAgo
    )
    if (oldOpenSupplier.length > 0) {
      results.push({
        id: 'old-open-supplier',
        type: 'warning',
        title: 'Alte offene Eingangsrechnungen',
        message: `${oldOpenSupplier.length} unbezahlte Eingangsrechnung${oldOpenSupplier.length > 1 ? 'en' : ''} älter als 90 Tage.`,
        details: oldOpenSupplier
          .slice(0, 5)
          .map(
            inv =>
              `${inv.supplierName}: ${inv.invoiceNumber} vom ${new Date(inv.invoiceDate).toLocaleDateString('de-AT')}`
          ),
      })
    }

    // 8. Alles OK Meldung
    if (results.length === 0) {
      results.push({
        id: 'all-ok',
        type: 'info',
        title: 'Keine Auffälligkeiten',
        message: `Die Buchhaltungsdaten für ${period} sehen vollständig und plausibel aus.`,
      })
    }

    return results
  }, [outgoingInvoices, supplierInvoices, totalOutputTax, totalInputTax, period])

  const errorCount = warnings.filter(w => w.type === 'error').length
  const warningCount = warnings.filter(w => w.type === 'warning').length

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-black text-slate-900">Plausibilitätsprüfung</h3>
        <div className="flex items-center gap-3">
          {errorCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
              <XCircle className="h-3 w-3" />
              {errorCount} Fehler
            </span>
          )}
          {warningCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
              <AlertTriangle className="h-3 w-3" />
              {warningCount} Warnungen
            </span>
          )}
          {errorCount === 0 && warningCount === 0 && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
              <CheckCircle className="h-3 w-3" />
              Alles OK
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {warnings.map(warning => (
          <div
            key={warning.id}
            className={`rounded-xl border p-4 ${
              warning.type === 'error'
                ? 'border-red-200 bg-red-50'
                : warning.type === 'warning'
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-slate-200 bg-slate-50'
            }`}
          >
            <div className="flex items-start gap-3">
              {warning.type === 'error' ? (
                <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
              ) : warning.type === 'warning' ? (
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              ) : (
                <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-500" />
              )}
              <div className="flex-1">
                <p
                  className={`font-bold ${
                    warning.type === 'error'
                      ? 'text-red-900'
                      : warning.type === 'warning'
                        ? 'text-amber-900'
                        : 'text-slate-900'
                  }`}
                >
                  {warning.title}
                </p>
                <p
                  className={`text-sm ${
                    warning.type === 'error'
                      ? 'text-red-700'
                      : warning.type === 'warning'
                        ? 'text-amber-700'
                        : 'text-slate-600'
                  }`}
                >
                  {warning.message}
                </p>
                {warning.details && warning.details.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {warning.details.map((detail, idx) => (
                      <li
                        key={idx}
                        className={`text-xs ${
                          warning.type === 'error'
                            ? 'text-red-600'
                            : warning.type === 'warning'
                              ? 'text-amber-600'
                              : 'text-slate-500'
                        }`}
                      >
                        • {detail}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatCurrency(value: number): string {
  return value.toLocaleString('de-AT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default AccountingValidation
