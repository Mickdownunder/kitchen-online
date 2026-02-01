import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { InvoicePDFDocumentServer } from '@/lib/pdf/InvoicePDFServer'
import { CustomerDeliveryNotePDFDocumentServer } from '@/lib/pdf/DeliveryNotePDFServer'
import { OrderPDFDocumentServer } from '@/lib/pdf/OrderPDFServer'
import { InvoiceData, invoiceToPriorInfo } from '@/components/InvoicePDF'
import { getCompanySettings, getBankAccounts } from '@/lib/supabase/services/company'
import { getInvoices } from '@/lib/supabase/services/invoices'
import { createServiceClient } from '@/lib/supabase/server'
import { CustomerProject, InvoiceItem } from '@/types'

type DocumentType = 'invoice' | 'delivery_note' | 'order'

interface PublishRequest {
  documentType: DocumentType
  projectId: string
  // For invoices
  invoice?: {
    id: string
    invoiceNumber: string
    type: string
    amount: number
    date: string
    description?: string
    isPaid?: boolean
    paidDate?: string
  }
  // For delivery notes
  deliveryNote?: {
    id: string
    deliveryNoteNumber: string
    deliveryDate: string
    deliveryAddress?: string
    items?: Array<{
      position: number
      description: string
      quantity: number
      unit?: string
    }>
  }
  // For orders
  appendAgb?: boolean
  // Project data
  project: {
    id: string
    customerName: string
    address?: string
    phone?: string
    email?: string
    orderNumber?: string
    customerId?: string
    items?: Array<{
      description: string
      quantity: number
      unit?: string
      pricePerUnit?: number
      netTotal?: number
      taxRate?: number
    }>
  }
}

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

    const body: PublishRequest = await request.json()
    const { documentType, projectId, invoice, project } = body

    if (!documentType || !projectId || !project) {
      return NextResponse.json(
        { error: 'Fehlende Parameter' },
        { status: 400 }
      )
    }

    if (project.id && project.id !== projectId) {
      return NextResponse.json(
        { error: 'Projekt-ID stimmt nicht überein' },
        { status: 400 }
      )
    }

    const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
    if (companyError || !companyId) {
      return NextResponse.json({ error: 'Keine Firma zugeordnet' }, { status: 403 })
    }

    const permissionCode = documentType === 'invoice' ? 'create_invoices' : 'edit_projects'
    const { data: hasPermission, error: permError } = await supabase.rpc('has_permission', {
      p_permission_code: permissionCode,
    })
    if (permError || !hasPermission) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const serviceClient = await createServiceClient()
    const { data: projectRow, error: projectError } = await serviceClient
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .single()

    if (projectError || !projectRow) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
    }

    const { data: ownerMembership, error: membershipError } = await serviceClient
      .from('company_members')
      .select('id')
      .eq('company_id', companyId)
      .eq('user_id', projectRow.user_id || '')
      .eq('is_active', true)
      .single()

    if (membershipError || !ownerMembership) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // Load company settings and bank account
    const companySettings = await getCompanySettings()
    let bankAccount = null
    if (companySettings?.id) {
      const banks = await getBankAccounts(companySettings.id)
      bankAccount = banks.find(b => b.isDefault) || banks[0] || null
    }

    let pdfBuffer: Buffer
    let fileName: string
    let portalType: string

    if (documentType === 'invoice' && invoice) {
      // Generate invoice PDF
      const invoiceType = invoice.type === 'partial' ? 'deposit' : 'final'

      // For final invoices, load prior partial invoices
      let priorInvoices: {
        id: string
        invoiceNumber: string
        amount: number
        date: string
        description?: string
      }[] = []
      if (invoiceType === 'final') {
        try {
          const projectInvoices = await getInvoices(projectId)
          priorInvoices = projectInvoices
            .filter(inv => inv.type === 'partial' && inv.invoiceNumber !== invoice.invoiceNumber)
            .map(invoiceToPriorInfo)
        } catch (error) {
          console.error('Error loading prior invoices:', error)
        }
      }

      // Map items to full InvoiceItem type with required fields
      const mappedItems: InvoiceItem[] = (project.items || []).map((item, index) => {
        const netTotal = item.netTotal || (item.pricePerUnit || 0) * item.quantity
        const taxRate = (item.taxRate as InvoiceItem['taxRate']) || 20
        return {
          id: `item-${index}`,
          position: index + 1,
          description: item.description,
          quantity: item.quantity,
          unit: (item.unit as InvoiceItem['unit']) || 'Stk',
          pricePerUnit: item.pricePerUnit || 0,
          taxRate,
          netTotal,
          taxAmount: netTotal * (taxRate / 100),
          grossTotal: netTotal * (1 + taxRate / 100),
        }
      })

      const invoiceData: InvoiceData = {
        type: invoiceType,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        date: invoice.date,
        description: invoice.description,
        isPaid: invoice.isPaid ?? false,
        paidDate: invoice.paidDate,
        project: {
          customerName: project.customerName,
          address: project.address,
          phone: project.phone,
          email: project.email,
          orderNumber: project.orderNumber || '',
          customerId: project.customerId,
          id: project.id,
          items: mappedItems,
        },
        priorInvoices,
        company: companySettings,
        bankAccount: bankAccount,
      }

      const pdfElement = React.createElement(
        InvoicePDFDocumentServer,
        { invoice: invoiceData }
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pdfBuffer = await renderToBuffer(pdfElement as any)
      
      const invoiceTypeLabel = invoice.type === 'partial' ? 'Teilrechnung' : 'Schlussrechnung'
      fileName = `${invoiceTypeLabel}_${invoice.invoiceNumber.replace(/\//g, '-')}.pdf`
      portalType = 'RECHNUNGEN'

    } else if (documentType === 'delivery_note' && body.deliveryNote) {
      // Generate delivery note PDF
      const deliveryNoteProject: CustomerProject = {
        id: project.id,
        customerName: project.customerName,
        address: project.address,
        phone: project.phone,
        email: project.email,
        orderNumber: project.orderNumber,
        customerId: project.customerId,
      } as CustomerProject

      const deliveryNoteElement = React.createElement(
        CustomerDeliveryNotePDFDocumentServer,
        {
          deliveryNote: {
            deliveryNoteNumber: body.deliveryNote.deliveryNoteNumber,
            deliveryDate: body.deliveryNote.deliveryDate,
            deliveryAddress: body.deliveryNote.deliveryAddress,
            items: body.deliveryNote.items?.map(item => ({
              ...item,
              unit: item.unit || 'Stk',
            })),
          },
          project: deliveryNoteProject,
          company: companySettings,
        }
      )

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pdfBuffer = await renderToBuffer(deliveryNoteElement as any)
      
      fileName = `Lieferschein_${body.deliveryNote.deliveryNoteNumber.replace(/\//g, '-')}.pdf`
      portalType = 'LIEFERSCHEINE'

    } else if (documentType === 'order') {
      // Generate order PDF
      const orderProject: CustomerProject = {
        id: project.id,
        customerName: project.customerName,
        address: project.address,
        phone: project.phone,
        email: project.email,
        orderNumber: project.orderNumber,
        customerId: project.customerId,
        items: (project.items || []).map((item, idx) => ({
          id: `item-${idx}`,
          position: idx + 1,
          description: item.description,
          quantity: item.quantity || 1,
          unit: item.unit || 'Stk',
          pricePerUnit: item.pricePerUnit || 0,
          netTotal: item.netTotal || 0,
          taxRate: item.taxRate || 20,
        })) as InvoiceItem[],
        netAmount: (project.items || []).reduce((sum, item) => sum + (item.netTotal || 0), 0),
        taxAmount: (project.items || []).reduce((sum, item) => 
          sum + ((item.netTotal || 0) * ((item.taxRate || 20) / 100)), 0),
        totalAmount: (project.items || []).reduce((sum, item) => 
          sum + (item.netTotal || 0) * (1 + ((item.taxRate || 20) / 100)), 0),
      } as CustomerProject

      const orderElement = React.createElement(OrderPDFDocumentServer, {
        project: orderProject,
        company: companySettings,
        appendAgb: body.appendAgb ?? true,
      })
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pdfBuffer = await renderToBuffer(orderElement as any)
      
      fileName = `Auftrag_${(project.orderNumber || project.id.slice(0, 8)).replace(/\//g, '-')}.pdf`
      portalType = 'KAUFVERTRAG'

    } else {
      return NextResponse.json(
        { error: 'Ungültiger Dokumenttyp oder fehlende Daten' },
        { status: 400 }
      )
    }

    // Check if document already exists (prevent duplicates)
    // Extract base name without timestamp for duplicate check
    const baseFileName = fileName.replace('.pdf', '')
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingDocs } = await serviceClient
      .from('documents')
      .select('id, name')
      .eq('project_id', projectId)
      .eq('type', portalType as any)
      .ilike('name', `${baseFileName}%`)
    
    if (existingDocs && existingDocs.length > 0) {
      // Document already exists - return the existing one
      console.log(`Document already exists: ${existingDocs[0].name}`)
      return NextResponse.json({
        success: true,
        documentId: existingDocs[0].id,
        type: portalType,
        name: existingDocs[0].name,
        alreadyExists: true,
      })
    }

    // Upload to storage
    const timestamp = Date.now()
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9-_.]/g, '_')
    const storagePath = `${projectId}/${portalType}/${sanitizedName.replace('.pdf', '')}_${timestamp}.pdf`

    const { error: uploadError } = await serviceClient.storage
      .from('documents')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Fehler beim Hochladen' },
        { status: 500 }
      )
    }

    // Create document record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: document, error: dbError } = await serviceClient
      .from('documents')
      .insert({
        project_id: projectId,
        user_id: user.id,
        type: portalType,
        name: fileName,
        file_path: storagePath,
        file_size: pdfBuffer.length,
        mime_type: 'application/pdf',
        uploaded_at: new Date().toISOString(),
        uploaded_by: user.id,
      } as any)
      .select('id')
      .single()

    if (dbError) {
      console.error('Database insert error:', dbError)
      // Cleanup storage
      await serviceClient.storage.from('documents').remove([storagePath])
      return NextResponse.json(
        { error: 'Fehler beim Speichern' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      documentId: document.id,
      type: portalType,
      name: fileName,
    })

  } catch (error: unknown) {
    console.error('Error publishing document:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Veröffentlichen' },
      { status: 500 }
    )
  }
}
