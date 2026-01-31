'use client'

import React, { useState, useEffect } from 'react'
import { ArrowLeft, Download, FileText, Loader2 } from 'lucide-react'
import { CompanySettings, BankAccount, InvoiceItem, CustomerProject } from '@/types'
import { ListInvoice } from '@/hooks/useInvoiceFilters'
import { downloadInvoicePDF, InvoiceData } from './InvoicePDF'
import { getCompanySettings, getBankAccounts, getInvoices, getProject, getInvoice } from '@/lib/supabase/services'

interface InvoiceViewProps {
  invoice: ListInvoice
  onBack: () => void
  onPrint: () => void
}

const formatCurrency = (amount: number): string => {
  return `${amount.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

const InvoiceView: React.FC<InvoiceViewProps> = ({ invoice: invoiceProp, onBack }) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null)
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [partialInvoices, setPartialInvoices] = useState<ListInvoice[]>([])
  
  // Lokaler State für die aktuelle Rechnung - wird beim Mount mit frischen Daten geladen
  const [currentInvoice, setCurrentInvoice] = useState(invoiceProp)
  const invoice = currentInvoice

  const [projectData, setProjectData] = useState<CustomerProject | null>(invoiceProp.project || null)
  const project = projectData
  const isDeposit = invoice.type === 'partial'
  const items = isDeposit ? [] : project?.items || []

  // Lade frische Rechnungsdaten beim Mount
  useEffect(() => {
    const loadFreshInvoice = async () => {
      try {
        const freshInvoice = await getInvoice(invoiceProp.id)
        if (freshInvoice) {
          // Merge mit ListInvoice Feldern
          setCurrentInvoice({
            ...invoiceProp,
            ...freshInvoice,
            date: freshInvoice.invoiceDate,
            status: freshInvoice.isPaid ? 'paid' : 'sent',
          } as ListInvoice)
        }
      } catch (error) {
        console.error('Error loading fresh invoice:', error)
      }
    }
    loadFreshInvoice()
  }, [invoiceProp.id, invoiceProp])

  // Lade Projekt inkl. Positionen (für Schlussrechnung)
  useEffect(() => {
    const loadProjectWithItems = async () => {
      const projectId = project?.id || invoice.projectId
      if (!projectId || isDeposit) return
      if (project?.items && project.items.length > 0) return

      try {
        const fullProject = await getProject(projectId)
        if (fullProject) {
          setProjectData(fullProject)
        }
      } catch (error) {
        console.error('Error loading project details:', error)
      }
    }
    loadProjectWithItems()
  }, [invoice.projectId, isDeposit, project?.id, project?.items])

  // Lade alle Anzahlungen für dieses Projekt (für Schlussrechnung)
  useEffect(() => {
    const loadPartials = async () => {
      if (!isDeposit && (project?.id || invoice.projectId)) {
        const allInvoices = await getInvoices(project?.id || invoice.projectId)
        const partials = allInvoices.filter(inv => inv.type === 'partial')
        setPartialInvoices(partials as unknown as ListInvoice[])
      }
    }
    loadPartials()
  }, [project?.id, invoice.projectId, isDeposit])

  // Anzahlungen summieren (Brutto) - aus der neuen invoices Tabelle
  const totalPartialPayments = partialInvoices.reduce((sum, p) => sum + p.amount, 0)

  // MwSt.-Aufschlüsselung für Buchhaltung/Steuerberatung
  const projectGrossTotal =
    project?.items?.reduce(
      (sum, item) => sum + (item.grossTotal ?? (item.netTotal ?? 0) + (item.taxAmount ?? 0)),
      0
    ) || invoice.amount + totalPartialPayments
  const projectNetTotal = projectGrossTotal / 1.2
  const projectTaxTotal = projectGrossTotal - projectNetTotal

  // Anzahlungen (bereits versteuert)
  const partialPaymentsNet = totalPartialPayments / 1.2
  const partialPaymentsTax = totalPartialPayments - partialPaymentsNet

  // Restbetrag (noch zu versteuern)
  const restGross = invoice.amount
  const restNet = projectNetTotal - partialPaymentsNet
  const restTax = projectTaxTotal - partialPaymentsTax

  // Beträge direkt aus Invoice oder berechnet
  const netAmount = invoice.netAmount || (isDeposit ? invoice.amount / 1.2 : restNet)
  const taxAmount =
    invoice.taxAmount || (isDeposit ? invoice.amount - invoice.amount / 1.2 : restTax)

  // Load company settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getCompanySettings()
        setCompanySettings(settings)

        if (settings?.id) {
          const banks = await getBankAccounts(settings.id)
          // Get default bank or first one
          const defaultBank = banks.find(b => b.isDefault) || banks[0]
          setBankAccount(defaultBank || null)
        }
      } catch (error: unknown) {
        // Ignore aborted requests (normal during page navigation)
        const errMessage = error instanceof Error ? error.message : ''
        const errName = error instanceof Error ? error.name : ''
        if (errMessage.includes('aborted') || errName === 'AbortError') {
          return
        }
        console.error('Error loading company settings:', error)
      } finally {
        setLoadingSettings(false)
      }
    }
    loadSettings()
  }, [])

  // Build display data using company settings or fallback
  const companyName = companySettings?.companyName
    ? `${companySettings.companyName}${companySettings.legalForm ? ` ${companySettings.legalForm}` : ''}`
    : 'Ihr Unternehmen GmbH'
  const companyAddress = companySettings
    ? `${companySettings.street || ''} ${companySettings.houseNumber || ''} · ${companySettings.postalCode || ''} ${companySettings.city || ''} · ${companySettings.country || 'Österreich'}`
    : 'Musterstraße 123 · 1010 Wien · Österreich'

  const handleDownloadPDF = async () => {
    setIsGenerating(true)
    try {
      // Always fetch the latest invoice data to ensure isPaid status is current
      const freshInvoice = await getInvoice(invoice.id)
      const currentInvoice = freshInvoice || invoice

      // Konvertiere partialInvoices zu PartialPayment-Format für PDF-Kompatibilität
      const partialPaymentsForPDF = partialInvoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amount: inv.amount,
        date: inv.invoiceDate,
        isPaid: inv.isPaid,
        paidDate: inv.paidDate,
        description: inv.description,
      }))

      // Debug logging before creating invoice data
      console.log('[InvoiceView] Creating PDF data:', {
        'currentInvoice.isPaid': currentInvoice.isPaid,
        'currentInvoice.paidDate': currentInvoice.paidDate,
        invoiceNumber: currentInvoice.invoiceNumber,
        invoiceType: currentInvoice.type,
      })

      const invoiceData: InvoiceData = {
        type: currentInvoice.type === 'partial' ? 'deposit' : currentInvoice.type,
        invoiceNumber: currentInvoice.invoiceNumber,
        amount: currentInvoice.amount,
        date: currentInvoice.invoiceDate || invoice.date,
        description: currentInvoice.description,
        isPaid: currentInvoice.isPaid,
        paidDate: currentInvoice.paidDate,
        project: {
          customerName: project?.customerName || '',
          address: project?.address,
          phone: project?.phone,
          email: project?.email,
          orderNumber: project?.orderNumber || '',
          customerId: project?.customerId,
          id: project?.id || invoice.projectId,
          items: project?.items,
        },
        priorInvoices: partialPaymentsForPDF,
        company: companySettings,
        bankAccount: bankAccount,
      }
      await downloadInvoicePDF(invoiceData)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Fehler beim Erstellen der PDF. Bitte versuchen Sie es erneut.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      {/* Toolbar */}
      <div className="mx-auto mb-6 flex max-w-4xl items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:bg-slate-50"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
          <span className="text-sm font-medium text-slate-600">Zurück</span>
        </button>
        <button
          onClick={handleDownloadPDF}
          disabled={isGenerating || loadingSettings}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:from-amber-600 hover:to-amber-700 disabled:cursor-wait disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              PDF wird erstellt...
            </>
          ) : loadingSettings ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Lade Firmendaten...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              PDF herunterladen
            </>
          )}
        </button>
      </div>

      {/* Invoice Preview */}
      <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="p-10 md:p-12">
          {/* Header */}
          <div className="mb-12 flex items-start justify-between border-b-2 border-amber-500 pb-6">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900">{companyName}</h2>
              <p className="mt-1 text-sm text-slate-500">{companyAddress}</p>
            </div>
            <div className="text-right text-sm text-slate-500">
              {companySettings?.phone && <p>Tel: {companySettings.phone}</p>}
              {companySettings?.email && <p>{companySettings.email}</p>}
              {companySettings?.website && <p>{companySettings.website}</p>}
              {!companySettings && (
                <>
                  <p>Tel: +43 1 234 5678</p>
                  <p>office@ihrunternehmen.at</p>
                  <p>www.ihrunternehmen.at</p>
                </>
              )}
            </div>
          </div>

          {/* Recipient */}
          <div className="mb-10">
            <p className="mb-2 text-xs uppercase tracking-wider text-slate-400">
              Rechnungsempfänger
            </p>
            <p className="text-lg font-bold text-slate-900">{project.customerName}</p>
            {project.address && <p className="text-slate-600">{project.address}</p>}
            {project.phone && <p className="text-slate-600">Tel: {project.phone}</p>}
            {project.email && <p className="text-slate-600">E-Mail: {project.email}</p>}
          </div>

          {/* Invoice Title */}
          <div className="mb-8 border-b border-slate-200 pb-6">
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900">
                  {isDeposit ? 'ANZAHLUNGSRECHNUNG' : 'SCHLUSSRECHNUNG'}
                </h1>
                {invoice.description && (
                  <p className="mt-1 text-slate-600">{invoice.description}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wider text-slate-400">Rechnungsnummer</p>
                <p className="text-lg font-black text-slate-900">{invoice.invoiceNumber}</p>
              </div>
            </div>
          </div>

          {/* Meta Info */}
          <div className="mb-8 grid grid-cols-3 gap-6 rounded-xl bg-slate-50 p-4">
            <div>
              <p className="mb-1 text-xs uppercase tracking-wider text-slate-400">Rechnungsdatum</p>
              <p className="font-bold text-slate-900">
                {new Date(invoice.invoiceDate || invoice.date).toLocaleDateString('de-AT')}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs uppercase tracking-wider text-slate-400">Auftragsnummer</p>
              <p className="font-bold text-slate-900">{project?.orderNumber || '-'}</p>
            </div>
            <div>
              <p className="mb-1 text-xs uppercase tracking-wider text-slate-400">Kundennummer</p>
              <p className="font-bold text-slate-900">
                {project?.customerId?.slice(0, 8) || `K-${project?.id?.slice(0, 6) || '000000'}`}
              </p>
            </div>
          </div>

          {/* Items Table – Kunden-Ansicht: KEINE Preise bei Positionen, nur Gesamtbetrag am Ende */}
          <div className="mb-8 overflow-hidden rounded-lg border-2 border-slate-400">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="w-24 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">
                    Menge
                  </th>
                  <th className="w-28 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">
                    Modell
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">
                    Bezeichnung
                  </th>
                  <th className="w-28 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">
                    Hersteller
                  </th>
                </tr>
              </thead>
              <tbody>
                {isDeposit ? (
                <tr className="border-b border-slate-300">
                    <td className="px-4 py-4 text-slate-600">1</td>
                    <td className="px-4 py-4 text-slate-400">-</td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-900">
                        {invoice.description || `Anzahlung für Auftrag ${project.orderNumber}`}
                      </p>
                      <p className="text-sm text-slate-500">Gemäß Vereinbarung</p>
                    </td>
                    <td className="px-4 py-4 text-slate-400">-</td>
                  </tr>
                ) : (
                  items.map((item: InvoiceItem, index: number) => (
                  <tr key={item.id || index} className="border-b border-slate-300">
                      <td className="px-4 py-4 text-slate-600">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-4 py-4 text-slate-600">{item.modelNumber || '-'}</td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-900">{item.description}</p>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{item.manufacturer || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mb-8 flex justify-end">
            <div className="w-80">
              {!isDeposit && totalPartialPayments > 0 ? (
                <>
                  {/* GESAMTLEISTUNG - für Steuerberatung */}
                  <div className="mb-4 border-b border-slate-200 pb-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Gesamtleistung
                    </p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm text-slate-600">
                        <span>Netto</span>
                        <span>{formatCurrency(projectNetTotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-slate-600">
                        <span>MwSt. (20%)</span>
                        <span>{formatCurrency(projectTaxTotal)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-900">
                        <span>Brutto</span>
                        <span>{formatCurrency(projectGrossTotal)}</span>
                      </div>
                    </div>
                  </div>

                  {/* BEREITS ERHALTENE ANZAHLUNGEN - mit MwSt.-Ausweis */}
                  <div className="mb-4 border-b border-slate-200 pb-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Abzüglich bereits erhaltene Anzahlungen
                    </p>
                    {partialInvoices.map((inv, idx) => {
                      const paymentNet = inv.amount / 1.2
                      const paymentTax = inv.amount - paymentNet
                      return (
                        <div key={inv.id} className="mb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-sm text-slate-700">
                                {inv.description || `Anzahlung ${idx + 1}`}
                              </span>
                              <p className="text-xs text-slate-500">
                                RE-Nr.: {inv.invoiceNumber} vom{' '}
                                {new Date(inv.invoiceDate).toLocaleDateString('de-AT')}
                              </p>
                            </div>
                            <span className="font-medium text-slate-700">
                              −{formatCurrency(inv.amount)}
                            </span>
                          </div>
                          <p className="ml-0 text-xs text-slate-400">
                            (darin enth. MwSt. 20%: {formatCurrency(paymentTax)})
                          </p>
                        </div>
                      )
                    })}
                    <div className="mt-2 flex justify-between border-t border-slate-100 pt-2">
                      <span className="font-bold text-slate-700">Summe Anzahlungen</span>
                      <span className="font-bold text-slate-700">
                        −{formatCurrency(totalPartialPayments)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      (darin enth. MwSt. 20%: {formatCurrency(partialPaymentsTax)})
                    </p>
                  </div>

                  {/* VERBLEIBENDER RESTBETRAG - mit MwSt.-Ausweis */}
                  <div>
                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Verbleibender Restbetrag
                    </p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm text-slate-600">
                        <span>Netto</span>
                        <span>{formatCurrency(restNet)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-slate-600">
                        <span>MwSt. (20%)</span>
                        <span>{formatCurrency(restTax)}</span>
                      </div>
                      <div className="mt-3 flex justify-between border-t-2 border-slate-900 pt-3">
                        <span className="text-lg font-black text-slate-900">
                          {invoice.isPaid ? 'Bereits bezahlt (Brutto)' : 'Zu zahlen (Brutto)'}
                        </span>
                        <span className={`text-xl font-black ${invoice.isPaid ? 'text-green-600' : 'text-amber-600'}`}>
                          {formatCurrency(restGross)}
                        </span>
                      </div>
                      {invoice.isPaid && invoice.paidDate && (
                        <p className="mt-2 text-right text-sm text-slate-500">
                          Bezahlt am: {new Date(invoice.paidDate).toLocaleDateString('de-AT')}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between text-slate-600">
                    <span>Netto</span>
                    <span className="font-medium">{formatCurrency(netAmount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>MwSt. (20%)</span>
                    <span className="font-medium">{formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="mt-3 flex justify-between border-t-2 border-slate-900 pt-3">
                    <span className="text-lg font-black text-slate-900">
                      {invoice.isPaid
                        ? 'Bereits bezahlt (Brutto)'
                        : `${isDeposit ? 'Rechnungsbetrag' : 'Gesamtbetrag'} (Brutto)`}
                    </span>
                    <span className={`text-xl font-black ${invoice.isPaid ? 'text-green-600' : 'text-amber-600'}`}>
                      {formatCurrency(invoice.amount)}
                    </span>
                  </div>
                  {invoice.isPaid && invoice.paidDate && (
                    <p className="mt-2 text-right text-sm text-slate-500">
                      Bezahlt am: {new Date(invoice.paidDate).toLocaleDateString('de-AT')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bank Info */}
          <div className="mb-8 grid grid-cols-2 gap-6 rounded-xl bg-slate-50 p-6">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Bankverbindung
              </p>
              <p className="text-sm text-slate-700">{bankAccount?.accountHolder || companyName}</p>
              <p className="text-sm font-bold text-slate-900">
                IBAN: {bankAccount?.iban || 'AT12 3456 7890 1234 5678'}
              </p>
              <p className="text-sm text-slate-700">BIC: {bankAccount?.bic || 'ABCDEFGH'}</p>
              {bankAccount?.bankName && (
                <p className="text-sm text-slate-700">{bankAccount.bankName}</p>
              )}
            </div>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Zahlungsbedingungen
              </p>
              <p className="text-sm text-slate-700">
                Zahlbar innerhalb von {companySettings?.defaultPaymentTerms || 14} Tagen
              </p>
              <p className="text-sm text-slate-700">ohne Abzug.</p>
              <p className="mt-2 text-sm text-slate-700">
                Verwendungszweck: <span className="font-bold">{invoice.invoiceNumber}</span>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 pt-6 text-center">
            <p className="text-xs text-slate-400">
              {companyName} · {companySettings?.street || 'Musterstraße'}{' '}
              {companySettings?.houseNumber || '123'} · {companySettings?.postalCode || '1010'}{' '}
              {companySettings?.city || 'Wien'} · {companySettings?.country || 'Österreich'}
            </p>
            <p className="text-xs text-slate-400">
              {companySettings?.uid ? `UID: ${companySettings.uid}` : 'UID: ATU12345678'}
              {companySettings?.companyRegisterNumber &&
                ` · ${companySettings.companyRegisterNumber}`}
              {companySettings?.court && ` · ${companySettings.court}`}
            </p>
            <p className="mt-4 text-sm text-slate-500">
              {companySettings?.invoiceFooterText || 'Vielen Dank für Ihren Auftrag!'}
            </p>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mx-auto mt-6 flex max-w-4xl items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <FileText className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-bold text-amber-900">Professionelle PDF-Rechnung</p>
          <p className="text-sm text-amber-700">
            {companySettings
              ? 'Die Firmenstammdaten wurden geladen. Klicken Sie auf "PDF herunterladen" für eine druckfertige Rechnung.'
              : 'Keine Firmenstammdaten gefunden. Bitte hinterlegen Sie Ihre Daten unter "Firmenstammdaten" für personalisierte Rechnungen.'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default InvoiceView
