import { NextRequest, NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import React from 'react'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getBankAccounts, getCompanySettings } from '@/lib/supabase/services/company'
import { getInvoices } from '@/lib/supabase/services/invoices'
import { InvoicePDFDocumentServer } from '@/lib/pdf/InvoicePDFServer'
import { CustomerDeliveryNotePDFDocumentServer } from '@/lib/pdf/DeliveryNotePDFServer'
import { OrderPDFDocumentServer } from '@/lib/pdf/OrderPDFServer'
import { InvoiceData, invoiceToPriorInfo } from '@/components/InvoicePDF'
import type { CustomerProject, InvoiceItem } from '@/types'
import { apiErrors } from '@/lib/utils/errorHandling'
import { logger } from '@/lib/utils/logger'
import {
  PublishRequestSchema,
  type DocumentType,
  type PortalDocumentType,
  type PublishRequest,
} from './schema'

type ServiceClient = Awaited<ReturnType<typeof createServiceClient>>

interface AuthorizationContext {
  user: User
  companyId: string
  serviceClient: ServiceClient
}

interface RenderedDocument {
  pdfBuffer: Buffer
  fileName: string
  portalType: PortalDocumentType
}

function getPermissionCode(documentType: DocumentType): 'create_invoices' | 'edit_projects' {
  return documentType === 'invoice' ? 'create_invoices' : 'edit_projects'
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9-_.]/g, '_')
}

function mapInvoiceItemsForInvoicePdf(project: PublishRequest['project']): InvoiceItem[] {
  return (project.items || []).map((item, index) => {
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
}

function mapInvoiceItemsForOrderPdf(project: PublishRequest['project']): InvoiceItem[] {
  return (project.items || []).map((item, index) => ({
    id: `item-${index}`,
    position: index + 1,
    description: item.description,
    quantity: item.quantity || 1,
    unit: (item.unit as InvoiceItem['unit']) || 'Stk',
    pricePerUnit: item.pricePerUnit || 0,
    netTotal: item.netTotal || 0,
    taxRate: ((item.taxRate as InvoiceItem['taxRate']) || 20) as InvoiceItem['taxRate'],
    taxAmount: 0,
    grossTotal: 0,
  }))
}

async function parsePublishRequest(request: NextRequest): Promise<PublishRequest | null> {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return null
  }

  const parsed = PublishRequestSchema.safeParse(body)
  if (!parsed.success) {
    return null
  }

  return parsed.data
}

async function authorizePublish(
  documentType: DocumentType,
  projectId: string,
): Promise<AuthorizationContext | NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return apiErrors.unauthorized({ component: 'api/portal/publish-document' })
  }

  if (user.app_metadata?.role === 'customer') {
    return apiErrors.forbidden({ component: 'api/portal/publish-document' })
  }

  const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
  if (companyError || !companyId) {
    return apiErrors.forbidden({ component: 'api/portal/publish-document' })
  }

  const { data: hasPermission, error: permError } = await supabase.rpc('has_permission', {
    p_permission_code: getPermissionCode(documentType),
  })
  if (permError || !hasPermission) {
    return apiErrors.forbidden({ component: 'api/portal/publish-document' })
  }

  const serviceClient = await createServiceClient()

  const { data: projectRow, error: projectError } = await serviceClient
    .from('projects')
    .select('id, user_id')
    .eq('id', projectId)
    .single()

  if (projectError || !projectRow) {
    return apiErrors.notFound({ component: 'api/portal/publish-document', projectId })
  }

  const { data: ownerMembership, error: membershipError } = await serviceClient
    .from('company_members')
    .select('id')
    .eq('company_id', companyId)
    .eq('user_id', projectRow.user_id || '')
    .eq('is_active', true)
    .single()

  if (membershipError || !ownerMembership) {
    return apiErrors.forbidden({ component: 'api/portal/publish-document', projectId })
  }

  return {
    user,
    companyId,
    serviceClient,
  }
}

async function renderDocumentPdf(request: PublishRequest): Promise<RenderedDocument> {
  const companySettings = await getCompanySettings()
  let bankAccount = null

  if (companySettings?.id) {
    const bankAccounts = await getBankAccounts(companySettings.id)
    bankAccount = bankAccounts.find((account) => account.isDefault) || bankAccounts[0] || null
  }

  if (request.documentType === 'invoice') {
    const invoice = request.invoice as NonNullable<PublishRequest['invoice']>

    const invoiceType =
      invoice.type === 'credit' ? 'credit' : invoice.type === 'partial' ? 'deposit' : 'final'

    let priorInvoices: ReturnType<typeof invoiceToPriorInfo>[] = []
    if (invoiceType === 'final') {
      const invoicesResult = await getInvoices(request.projectId)
      if (invoicesResult.ok) {
        priorInvoices = invoicesResult.data
          .filter((inv) => inv.type === 'partial' && inv.invoiceNumber !== invoice.invoiceNumber)
          .map(invoiceToPriorInfo)
      }
    }

    const invoiceData: InvoiceData = {
      type: invoiceType,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      date: invoice.date,
      description: invoice.description,
      isPaid: invoice.isPaid ?? false,
      paidDate: invoice.paidDate,
      project: {
        customerName: request.project.customerName,
        address: request.project.address,
        phone: request.project.phone,
        email: request.project.email,
        orderNumber: request.project.orderNumber || '',
        customerId: request.project.customerId,
        id: request.project.id,
        items: mapInvoiceItemsForInvoicePdf(request.project),
      },
      priorInvoices,
      company: companySettings,
      bankAccount,
    }

    const pdfElement = React.createElement(InvoicePDFDocumentServer, { invoice: invoiceData })
    const pdfBuffer = await renderToBuffer(pdfElement as React.ReactElement<DocumentProps>)

    const invoiceTypeLabel =
      invoice.type === 'credit' ? 'Stornorechnung' : invoice.type === 'partial' ? 'Teilrechnung' : 'Schlussrechnung'

    return {
      pdfBuffer,
      fileName: `${invoiceTypeLabel}_${invoice.invoiceNumber.replace(/\//g, '-')}.pdf`,
      portalType: 'RECHNUNGEN',
    }
  }

  if (request.documentType === 'delivery_note') {
    const deliveryNote = request.deliveryNote as NonNullable<PublishRequest['deliveryNote']>

    const deliveryNoteProject: CustomerProject = {
      id: request.project.id,
      customerName: request.project.customerName,
      address: request.project.address,
      phone: request.project.phone,
      email: request.project.email,
      orderNumber: request.project.orderNumber,
      customerId: request.project.customerId,
    } as CustomerProject

    const deliveryNoteElement = React.createElement(CustomerDeliveryNotePDFDocumentServer, {
      deliveryNote: {
        deliveryNoteNumber: deliveryNote.deliveryNoteNumber,
        deliveryDate: deliveryNote.deliveryDate,
        deliveryAddress: deliveryNote.deliveryAddress,
        items: deliveryNote.items?.map((item) => ({
          ...item,
          unit: item.unit || 'Stk',
        })),
      },
      project: deliveryNoteProject,
      company: companySettings,
    })

    const pdfBuffer = await renderToBuffer(deliveryNoteElement as React.ReactElement<DocumentProps>)

    return {
      pdfBuffer,
      fileName: `Lieferschein_${deliveryNote.deliveryNoteNumber.replace(/\//g, '-')}.pdf`,
      portalType: 'LIEFERSCHEINE',
    }
  }

  const orderProject: CustomerProject = {
    id: request.project.id,
    customerName: request.project.customerName,
    address: request.project.address,
    phone: request.project.phone,
    email: request.project.email,
    orderNumber: request.project.orderNumber,
    customerId: request.project.customerId,
    items: mapInvoiceItemsForOrderPdf(request.project),
    netAmount: (request.project.items || []).reduce((sum, item) => sum + (item.netTotal || 0), 0),
    taxAmount: (request.project.items || []).reduce(
      (sum, item) => sum + (item.netTotal || 0) * ((item.taxRate || 20) / 100),
      0,
    ),
    totalAmount: (request.project.items || []).reduce(
      (sum, item) => sum + (item.netTotal || 0) * (1 + (item.taxRate || 20) / 100),
      0,
    ),
  } as CustomerProject

  const orderElement = React.createElement(OrderPDFDocumentServer, {
    project: orderProject,
    company: companySettings,
    appendAgb: request.appendAgb ?? true,
  })

  const pdfBuffer = await renderToBuffer(orderElement as React.ReactElement<DocumentProps>)

  return {
    pdfBuffer,
    fileName: `Auftrag_${(request.project.orderNumber || request.project.id.slice(0, 8)).replace(/\//g, '-')}.pdf`,
    portalType: 'KAUFVERTRAG',
  }
}

async function persistDocument(
  request: PublishRequest,
  rendered: RenderedDocument,
  context: AuthorizationContext,
): Promise<NextResponse> {
  const baseFileName = rendered.fileName.replace('.pdf', '')

  const { data: existingDocs } = await context.serviceClient
    .from('documents')
    .select('id, name')
    .eq('project_id', request.projectId)
    .eq('type', rendered.portalType)
    .ilike('name', `${baseFileName}%`)

  if (existingDocs && existingDocs.length > 0) {
    logger.info('Document already exists - returning existing record', {
      component: 'api/portal/publish-document',
      projectId: request.projectId,
      existingDocumentId: existingDocs[0].id,
      existingDocumentName: existingDocs[0].name,
    })

    return NextResponse.json({
      success: true,
      documentId: existingDocs[0].id,
      type: rendered.portalType,
      name: existingDocs[0].name,
      alreadyExists: true,
    })
  }

  const timestamp = Date.now()
  const sanitizedName = sanitizeFileName(rendered.fileName)
  const storagePath = `${request.projectId}/${rendered.portalType}/${sanitizedName.replace('.pdf', '')}_${timestamp}.pdf`

  const { error: uploadError } = await context.serviceClient.storage
    .from('documents')
    .upload(storagePath, rendered.pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (uploadError) {
    return apiErrors.internal(uploadError as unknown as Error, {
      component: 'api/portal/publish-document',
      projectId: request.projectId,
    })
  }

  const { data: document, error: dbError } = await context.serviceClient
    .from('documents')
    .insert({
      project_id: request.projectId,
      user_id: context.user.id,
      type: rendered.portalType,
      name: rendered.fileName,
      file_path: storagePath,
      file_size: rendered.pdfBuffer.length,
      mime_type: 'application/pdf',
      uploaded_at: new Date().toISOString(),
      uploaded_by: context.user.id,
    })
    .select('id')
    .single()

  if (dbError) {
    await context.serviceClient.storage.from('documents').remove([storagePath])
    return apiErrors.internal(new Error(dbError.message), {
      component: 'api/portal/publish-document',
      projectId: request.projectId,
    })
  }

  return NextResponse.json({
    success: true,
    documentId: document.id,
    type: rendered.portalType,
    name: rendered.fileName,
  })
}

export async function POST(request: NextRequest) {
  try {
    const payload = await parsePublishRequest(request)
    if (!payload) {
      return apiErrors.badRequest({ component: 'api/portal/publish-document' })
    }

    const auth = await authorizePublish(payload.documentType, payload.projectId)
    if (auth instanceof NextResponse) {
      return auth
    }

    const rendered = await renderDocumentPdf(payload)
    return persistDocument(payload, rendered, auth)
  } catch (error: unknown) {
    return apiErrors.internal(error as Error, { component: 'api/portal/publish-document' })
  }
}
