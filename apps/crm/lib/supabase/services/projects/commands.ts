import { supabase } from '../../client'
import type { CustomerProject, InvoiceItem, ProjectDocument } from '@/types'
import { getCurrentUser } from '../auth'
import { getNextOrderNumber } from '../company'
import { createInvoice, getInvoices } from '../invoices'
import { audit } from '@/lib/utils/auditLogger'
import { logger } from '@/lib/utils/logger'
import {
  calculateItemTotalsFromGross,
  calculateItemTotalsFromNet,
  roundTo2Decimals,
} from '@/lib/utils/priceCalculations'
import { calculatePaymentAmounts } from '@/lib/utils/paymentSchedule'
import { getProject } from './queries'
import type {
  BuildProjectInsertInput,
  CreateProjectInput,
  ItemBuildContext,
  ItemInsert,
  ItemUpdate,
  JsonValue,
  ProjectInsert,
  UpdateProjectInput,
} from './types'
import { UUID_RE } from './types'
import {
  generateAccessCode,
  logServiceError,
  logSupabaseError,
  resolveUnit,
  validateItems,
} from './validators'

function buildItemRow(context: ItemBuildContext): ItemInsert {
  const { item, projectId, position } = context

  const taxRate = item.taxRate || 20
  const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1
  const pricePerUnit = item.pricePerUnit || 0
  const hasGrossPrice = item.grossPricePerUnit != null

  let netTotal: number
  let taxAmount: number
  let grossTotal: number
  let grossPricePerUnit: number

  if (hasGrossPrice) {
    const totals = calculateItemTotalsFromGross(quantity, item.grossPricePerUnit as number, taxRate)
    netTotal = item.netTotal ?? totals.netTotal
    taxAmount = item.taxAmount ?? totals.taxAmount
    grossTotal = item.grossTotal ?? totals.grossTotal
    grossPricePerUnit = item.grossPricePerUnit as number
  } else {
    const totals = calculateItemTotalsFromNet(quantity, pricePerUnit, taxRate)
    netTotal = item.netTotal ?? totals.netTotal
    taxAmount = item.taxAmount ?? totals.taxAmount
    grossTotal = item.grossTotal ?? totals.grossTotal
    grossPricePerUnit = quantity > 0 ? grossTotal / quantity : 0
  }

  return {
    project_id: projectId,
    article_id: item.articleId || null,
    position: item.position || position,
    description: item.description || '',
    model_number: item.modelNumber || null,
    manufacturer: item.manufacturer || null,
    specifications: (item.specifications || {}) as Record<string, string>,
    quantity,
    unit: resolveUnit(item.unit),
    price_per_unit: roundTo2Decimals(pricePerUnit),
    gross_price_per_unit: grossPricePerUnit > 0 ? roundTo2Decimals(grossPricePerUnit) : null,
    purchase_price_per_unit:
      item.purchasePricePerUnit != null && item.purchasePricePerUnit > 0
        ? roundTo2Decimals(item.purchasePricePerUnit)
        : null,
    tax_rate: String(taxRate),
    net_total: roundTo2Decimals(netTotal),
    tax_amount: roundTo2Decimals(taxAmount),
    gross_total: roundTo2Decimals(grossTotal),
    show_in_portal: item.showInPortal || false,
    serial_number: item.serialNumber || null,
    installation_date: item.installationDate || null,
    warranty_until: item.warrantyUntil || null,
    appliance_category: item.applianceCategory || null,
    manufacturer_support_url: item.manufacturerSupportUrl || null,
    manufacturer_support_phone: item.manufacturerSupportPhone || null,
    manufacturer_support_email: item.manufacturerSupportEmail || null,
  }
}

function buildProjectInsert({
  userId,
  project,
  accessCode,
  orderNumber,
  documents,
}: BuildProjectInsertInput): ProjectInsert {
  return {
    user_id: userId,
    customer_id: project.customerId || null,
    access_code: accessCode,
    salesperson_id: project.salespersonId || null,
    salesperson_name: project.salespersonName || null,
    customer_name: project.customerName || 'Unbekannt',
    customer_address: project.address || null,
    customer_phone: project.phone || null,
    customer_email: project.email || null,
    order_number: orderNumber,
    offer_number: project.offerNumber || null,
    invoice_number: project.invoiceNumber || null,
    contract_number: project.contractNumber || null,
    status: project.status || 'Planung',
    total_amount: roundTo2Decimals(project.totalAmount || 0),
    net_amount: roundTo2Decimals(project.netAmount || 0),
    tax_amount: roundTo2Decimals(project.taxAmount || 0),
    deposit_amount: roundTo2Decimals(project.depositAmount || 0),
    is_deposit_paid: project.isDepositPaid || false,
    is_final_paid: project.isFinalPaid || false,
    offer_date: project.offerDate || null,
    measurement_date: project.measurementDate || null,
    measurement_time: project.measurementTime || null,
    is_measured: project.isMeasured || false,
    order_date: project.orderDate || null,
    is_ordered: project.isOrdered || false,
    delivery_date: project.deliveryDate || null,
    delivery_time: project.deliveryTime || null,
    installation_date: project.installationDate || null,
    installation_time: project.installationTime || null,
    is_installation_assigned: project.isInstallationAssigned || false,
    completion_date: project.completionDate || null,
    delivery_type: project.deliveryType || 'delivery',
    notes: project.notes || '',
    order_footer_text: project.orderFooterText ?? null,
    complaints: (project.complaints || []) as unknown as JsonValue,
    documents: documents as unknown as JsonValue,
    payment_schedule: (project.paymentSchedule || null) as unknown as JsonValue,
    second_payment_created: project.secondPaymentCreated || false,
  }
}

async function maybeCreateFirstPayment(
  project: CreateProjectInput,
  projectId: string,
  orderNumber: string,
  dbOrderNumber: string,
): Promise<void> {
  if (!project.paymentSchedule?.autoCreateFirst) {
    return
  }

  const existingResult = await getInvoices(projectId)
  const existing = existingResult.ok ? existingResult.data : []
  if (existing.some((inv) => inv.type === 'partial' && inv.scheduleType === 'first')) {
    return
  }

  const amounts = calculatePaymentAmounts(project as CustomerProject)
  if (!amounts) {
    return
  }

  const orderNum = orderNumber || dbOrderNumber
  const invoiceNumber = project.invoiceNumber
    ? `${project.invoiceNumber}-A1`
    : `R-${new Date().getFullYear()}-${orderNum}-A1`

  const result = await createInvoice({
    projectId,
    type: 'partial',
    amount: amounts.first,
    invoiceDate: project.orderDate || new Date().toISOString().split('T')[0],
    description: `${project.paymentSchedule.firstPercent}% Anzahlung`,
    scheduleType: 'first',
    invoiceNumber,
  })

  if (!result.ok) {
    logger.error(
      'Fehler beim Erstellen der ersten Anzahlung',
      { component: 'projects' },
      new Error(result.message),
    )
  } else {
    logger.info('Automatisch erste Anzahlung erstellt', {
      component: 'projects',
      invoiceNumber,
      amount: amounts.first,
    })
  }
}

async function insertItems(projectId: string, items: InvoiceItem[]): Promise<void> {
  validateItems(items)

  const rows = items.map((item, idx) =>
    buildItemRow({
      item,
      projectId,
      position: idx + 1,
    }),
  )

  const { error } = await supabase.from('invoice_items').insert(rows)

  if (!error) {
    return
  }

  logger.error('Error inserting items', { component: 'projects' }, error as Error)

  const { error: rollbackError } = await supabase.from('projects').delete().eq('id', projectId)
  if (rollbackError) {
    logger.error('Rollback failed', { component: 'projects' }, rollbackError as Error)
  } else {
    logger.debug('Rollback successful: Project deleted after item insertion failure', {
      component: 'projects',
    })
  }

  throw new Error(
    `Fehler beim Erstellen der Artikel: ${error.message}. Projekt wurde nicht erstellt.`,
  )
}

function buildProjectUpdate(project: UpdateProjectInput): Record<string, unknown> {
  const data: Record<string, unknown> = {}

  if (project.customerId !== undefined) data.customer_id = project.customerId
  if (project.salespersonId !== undefined) data.salesperson_id = project.salespersonId || null
  if (project.salespersonName !== undefined) data.salesperson_name = project.salespersonName || null
  if (project.customerName !== undefined) data.customer_name = project.customerName
  if (project.address !== undefined) data.customer_address = project.address
  if (project.phone !== undefined) data.customer_phone = project.phone
  if (project.email !== undefined) data.customer_email = project.email
  if (project.orderNumber !== undefined) data.order_number = project.orderNumber
  if (project.offerNumber !== undefined) data.offer_number = project.offerNumber
  if (project.invoiceNumber !== undefined) data.invoice_number = project.invoiceNumber
  if (project.contractNumber !== undefined) data.contract_number = project.contractNumber
  if (project.status !== undefined) data.status = project.status
  if (project.totalAmount !== undefined) data.total_amount = roundTo2Decimals(project.totalAmount)
  if (project.netAmount !== undefined) data.net_amount = roundTo2Decimals(project.netAmount)
  if (project.taxAmount !== undefined) data.tax_amount = roundTo2Decimals(project.taxAmount)
  if (project.depositAmount !== undefined) {
    data.deposit_amount = roundTo2Decimals(project.depositAmount)
  }
  if (project.isDepositPaid !== undefined) data.is_deposit_paid = project.isDepositPaid
  if (project.isFinalPaid !== undefined) data.is_final_paid = project.isFinalPaid
  if (project.offerDate !== undefined) data.offer_date = project.offerDate
  if (project.measurementDate !== undefined) data.measurement_date = project.measurementDate
  if (project.measurementTime !== undefined) data.measurement_time = project.measurementTime
  if (project.isMeasured !== undefined) data.is_measured = project.isMeasured
  if (project.orderDate !== undefined) data.order_date = project.orderDate
  if (project.isOrdered !== undefined) data.is_ordered = project.isOrdered
  if (project.deliveryDate !== undefined) data.delivery_date = project.deliveryDate
  if (project.deliveryTime !== undefined) data.delivery_time = project.deliveryTime
  if (project.installationDate !== undefined) data.installation_date = project.installationDate
  if (project.installationTime !== undefined) data.installation_time = project.installationTime
  if (project.isInstallationAssigned !== undefined) {
    data.is_installation_assigned = project.isInstallationAssigned
  }
  if (project.completionDate !== undefined) data.completion_date = project.completionDate
  if (project.deliveryType !== undefined) data.delivery_type = project.deliveryType
  if (project.notes !== undefined) data.notes = project.notes
  if (project.orderFooterText !== undefined) data.order_footer_text = project.orderFooterText
  if (project.accessCode !== undefined) data.access_code = project.accessCode
  if (project.complaints !== undefined) data.complaints = project.complaints
  if (project.paymentSchedule !== undefined) data.payment_schedule = project.paymentSchedule
  if (project.secondPaymentCreated !== undefined) {
    data.second_payment_created = project.secondPaymentCreated
  }

  if (project.documents !== undefined) {
    data.documents = project.documents
    logger.debug('Updating documents', {
      component: 'projects',
      count: project.documents.length,
      documentNames: project.documents.map((doc: ProjectDocument) => doc.name),
      totalSize: JSON.stringify(project.documents).length,
    })
  }

  return data
}

async function upsertItems(projectId: string, items: InvoiceItem[]): Promise<void> {
  validateItems(items)

  const { data: existingItems, error: fetchError } = await supabase
    .from('invoice_items')
    .select('id')
    .eq('project_id', projectId)

  if (fetchError) {
    logger.error('Error fetching existing items', { component: 'projects' }, fetchError as Error)
    throw fetchError
  }

  const existingIds = new Set((existingItems ?? []).map((item) => item.id))
  const incomingIds = new Set<string>()
  const insertedIds: string[] = []

  for (let idx = 0; idx < items.length; idx += 1) {
    const item = items[idx]
    const row = buildItemRow({ item, projectId, position: idx + 1 }) as ItemUpdate & ItemInsert

    try {
      if (item.id && UUID_RE.test(item.id) && existingIds.has(item.id)) {
        const { error: updateError } = await supabase
          .from('invoice_items')
          .update(row as ItemUpdate)
          .eq('id', item.id)

        if (updateError) {
          logger.error(`Error updating item ${item.id}`, { component: 'projects' }, updateError as Error)
          throw new Error(
            `Fehler beim Aktualisieren des Artikels "${item.description || item.id}": ${updateError.message}`,
          )
        }

        incomingIds.add(item.id)
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('invoice_items')
          .insert(row)
          .select('id')
          .single()

        if (insertError) {
          logger.error('Error inserting item', { component: 'projects' }, insertError as Error)
          throw new Error(
            `Fehler beim Einfügen des Artikels "${item.description || 'Neu'}": ${insertError.message}`,
          )
        }

        if (inserted) {
          insertedIds.push(inserted.id)
          incomingIds.add(inserted.id)
        }
      }
    } catch (itemError) {
      if (insertedIds.length > 0) {
        logger.warn(`Rolling back ${insertedIds.length} inserted items due to error`, {
          component: 'projects',
        })

        const { error: rollbackErr } = await supabase
          .from('invoice_items')
          .delete()
          .in('id', insertedIds)

        if (rollbackErr) {
          logger.error('Rollback of inserted items failed', { component: 'projects' }, rollbackErr as Error)
        }
      }

      throw itemError
    }
  }

  const toDelete = Array.from(existingIds).filter((id) => !incomingIds.has(id))
  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase.from('invoice_items').delete().in('id', toDelete)

    if (deleteError) {
      logger.error('Error deleting removed items', { component: 'projects' }, deleteError as Error)
    }
  }
}

export async function createProject(project: CreateProjectInput): Promise<CustomerProject> {
  try {
    const user = await getCurrentUser()
    const userId = user?.id
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const documents = project.documents || []
    logger.debug('Creating project with data', {
      component: 'projects',
      customerName: project.customerName,
      orderNumber: project.orderNumber,
      status: project.status,
      documentsCount: documents.length,
      documentNames: documents.map((doc: ProjectDocument) => doc.name),
    })

    const accessCode = project.accessCode || generateAccessCode()
    const orderNumber = project.orderNumber || (await getNextOrderNumber()) || `K-${Date.now()}`

    const { data, error } = await supabase
      .from('projects')
      .insert(
        buildProjectInsert({
          userId,
          project,
          accessCode,
          orderNumber,
          documents,
        }),
      )
      .select()
      .single()

    if (error) {
      logSupabaseError('createProject', error)
      throw error
    }

    const projectId = data.id

    await maybeCreateFirstPayment(project, projectId, orderNumber, data.order_number)

    if (project.items?.length) {
      await insertItems(projectId, project.items)
    }

    const createdProject = (await getProject(projectId)) as CustomerProject

    audit.projectCreated(projectId, {
      customerName: createdProject.customerName,
      orderNumber: createdProject.orderNumber,
      totalAmount: createdProject.totalAmount,
    })

    return createdProject
  } catch (error: unknown) {
    logServiceError('createProject', error)
    throw error
  }
}

export async function updateProject(
  id: string,
  project: UpdateProjectInput,
): Promise<CustomerProject> {
  try {
    const user = await getCurrentUser()
    if (!user?.id) {
      throw new Error('Not authenticated')
    }

    const updateData = buildProjectUpdate(project)

    if (Object.keys(updateData).length === 0 && project.items === undefined) {
      logger.warn('updateProject: No fields to update, returning existing project', {
        component: 'projects',
      })
      return (await getProject(id)) as CustomerProject
    }

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase.from('projects').update(updateData).eq('id', id).select().single()

      if (error) {
        logSupabaseError('updateProject', error)
        throw error
      }
    }

    if (project.items !== undefined) {
      await upsertItems(id, project.items)
    }

    const updatedProject = (await getProject(id)) as CustomerProject

    const changedFields: Record<string, unknown> = {}
    if (project.customerName !== undefined) changedFields.customerName = project.customerName
    if (project.status !== undefined) changedFields.status = project.status
    if (project.totalAmount !== undefined) changedFields.totalAmount = project.totalAmount
    if (project.isDepositPaid !== undefined) changedFields.isDepositPaid = project.isDepositPaid
    if (project.isFinalPaid !== undefined) changedFields.isFinalPaid = project.isFinalPaid

    if (Object.keys(changedFields).length > 0) {
      audit.projectUpdated(id, {}, changedFields)
    }

    return updatedProject
  } catch (error) {
    logger.error('updateProject failed', { component: 'projects' }, error as Error)
    throw error
  }
}

export async function deleteProject(id: string): Promise<void> {
  let projectData: Record<string, unknown> = {}

  try {
    const project = await getProject(id)
    if (project) {
      projectData = {
        customerName: project.customerName,
        orderNumber: project.orderNumber,
        totalAmount: project.totalAmount,
        status: project.status,
      }
    }
  } catch {
    // keep delete behavior even if read failed
  }

  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) {
    throw error
  }

  audit.projectDeleted(id, projectData)
}
