import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { InvoicePDFDocumentServer } from '@/lib/pdf/InvoicePDFServer'
import { InvoiceData, invoiceToPriorInfo } from '@/components/InvoicePDF'
import { getCompanySettings, getBankAccounts } from '@/lib/supabase/services/company'
import { getInvoices } from '@/lib/supabase/services/invoices'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    if (user.app_metadata?.role === 'customer') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // Check company context
    const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
    if (companyError || !companyId) {
      return NextResponse.json({ error: 'Keine Firma zugeordnet' }, { status: 403 })
    }

    // Check permission
    const { data: hasPermission, error: permError } = await supabase.rpc('has_permission', {
      p_permission_code: 'create_invoices',
    })
    if (permError || !hasPermission) {
      return NextResponse.json(
        { error: 'Keine Berechtigung zum Generieren von Rechnungs-PDFs' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { invoice, project } = body

    if (!invoice || !project) {
      return NextResponse.json(
        { error: 'Fehlende Parameter: invoice und project sind erforderlich' },
        { status: 400 }
      )
    }

    // Lade Company Settings und Bank Account server-seitig
    const companySettings = await getCompanySettings()
    let bankAccount = null
    if (companySettings?.id) {
      const banks = await getBankAccounts(companySettings.id)
      bankAccount = banks.find(b => b.isDefault) || banks[0] || null
    }

    // Determine invoice type
    const invoiceType = invoice.type || (invoice.invoiceNumber?.includes('A') ? 'deposit' : 'final')

    // For final invoices, load prior partial invoices from DB
    let priorInvoices: {
      id: string
      invoiceNumber: string
      amount: number
      date: string
      description?: string
    }[] = []
    if (invoiceType === 'final' && project.id) {
      try {
        const projectInvoices = await getInvoices(project.id)
        priorInvoices = projectInvoices
          .filter(inv => inv.type === 'partial' && inv.invoiceNumber !== invoice.invoiceNumber)
          .map(invoiceToPriorInfo)
      } catch (error) {
        console.error('Error loading prior invoices:', error)
      }
    }

    // Erstelle InvoiceData
    const invoiceData: InvoiceData = {
      type: invoiceType,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      date: invoice.date,
      description: invoice.description,
      project: {
        customerName: project.customerName,
        address: project.address,
        phone: project.phone,
        email: project.email,
        orderNumber: project.orderNumber,
        customerId: project.customerId,
        id: project.id,
        items: project.items || [],
      },
      priorInvoices,
      company: companySettings,
      bankAccount: bankAccount,
    }

    // Generiere PDF server-seitig

    const pdfElement = React.createElement(InvoicePDFDocumentServer, {
      invoice: invoiceData,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any // React element type mismatch with renderToBuffer
    const pdfBuffer = await renderToBuffer(pdfElement)
    const pdfBase64 = pdfBuffer.toString('base64')

    return NextResponse.json({
      success: true,
      pdf: pdfBase64,
      filename: `Rechnung_${invoice.invoiceNumber.replace(/\//g, '-')}_${project.customerName.replace(/\s/g, '_')}.pdf`,
    })
  } catch (error: unknown) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Generieren der PDF' },
      { status: 500 }
    )
  }
}
