/**
 * Projects Service
 *
 * Rechnungen (Anzahlungen, Schlussrechnungen) werden in der `invoices`-Tabelle verwaltet.
 * Verwende `createInvoice()`, `getInvoices()`, etc. aus '@/lib/supabase/services/invoices'.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { supabase } from '../client'
import type { CustomerProject, InvoiceItem, ProjectDocument } from '@/types'
import type { Json } from '@/types/database.types'
import type { Row, Insert, Update } from '@/lib/types/service'
import { getCurrentUser } from './auth'
import { getNextOrderNumber } from './company'
import { logger } from '@/lib/utils/logger'
import {
  calculateItemTotalsFromNet,
  calculateItemTotalsFromGross,
  calculateProjectTotals,
  roundTo2Decimals,
} from '@/lib/utils/priceCalculations'
import { calculatePaymentAmounts } from '@/lib/utils/paymentSchedule'
import { createInvoice, getInvoices } from './invoices'
import { audit } from '@/lib/utils/auditLogger'

type ProjectRow = Row<'projects'> & { invoice_items?: Row<'invoice_items'>[] }
type ItemInsert = Insert<'invoice_items'>
type ItemUpdate = Update<'invoice_items'>

// ─────────────────────────────────────────────────────
// Shared helpers (extracted from create/update)
// ─────────────────────────────────────────────────────

const UNIT_MAP: Record<string, InvoiceItem['unit']> = {
  Stk: 'Stk', stk: 'Stk', STK: 'Stk',
  Pkg: 'Pkg', pkg: 'Pkg', PKG: 'Pkg',
  Std: 'Std', std: 'Std', STD: 'Std',
  Paush: 'Paush', paush: 'Paush', PAUSH: 'Paush',
  m: 'm', M: 'm',
  lfm: 'lfm', LFM: 'lfm', 'lfm.': 'lfm',
  'm²': 'm²', m2: 'm²', 'M²': 'm²', qm: 'm²', QM: 'm²',
}

function resolveUnit(raw: string): InvoiceItem['unit'] {
  return UNIT_MAP[raw] || 'Stk'
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function generateAccessCode(length = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

/** Validate all items before write. Throws on invalid data. */
function validateItems(items: InvoiceItem[]): void {
  for (const item of items) {
    if (item.quantity !== undefined && item.quantity <= 0) {
      throw new Error(
        `Ungültige Menge für Artikel "${item.description || 'Unbekannt'}": ${item.quantity}. Menge muss größer als 0 sein.`,
      )
    }
    if (item.pricePerUnit !== undefined && item.pricePerUnit < 0) {
      throw new Error(
        `Ungültiger Preis für Artikel "${item.description || 'Unbekannt'}": ${item.pricePerUnit}. Preis darf nicht negativ sein.`,
      )
    }
  }
}

/** Build the DB row for a single invoice item. Used by both create and update. */
function buildItemRow(item: InvoiceItem, projectId: string, position: number): ItemInsert {
  const taxRate = item.taxRate || 20
  const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1
  const pricePerUnit = item.pricePerUnit || 0
  const hasGrossPrice = item.grossPricePerUnit != null

  let netTotal: number
  let taxAmount: number
  let grossTotal: number
  let grossPricePerUnit: number

  if (hasGrossPrice) {
    const totals = calculateItemTotalsFromGross(quantity, item.grossPricePerUnit!, taxRate)
    netTotal = item.netTotal ?? totals.netTotal
    taxAmount = item.taxAmount ?? totals.taxAmount
    grossTotal = item.grossTotal ?? totals.grossTotal
    grossPricePerUnit = item.grossPricePerUnit!
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

// ─────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────

export async function getProjects(): Promise<CustomerProject[]> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      logger.warn('getProjects: No user authenticated, returning empty array', {
        component: 'projects',
      })
      return []
    }

    const { data, error } = await supabase
      .from('projects')
      .select(`*, invoice_items (*)`)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('getProjects error', { component: 'projects' }, error as Error)
      throw error
    }

    return (data || []).map(mapProjectFromDB)
  } catch (error: unknown) {
    const err = error as { message?: string; name?: string }
    if (err?.message?.includes('aborted') || err?.name === 'AbortError') return []
    logger.error('getProjects failed', { component: 'projects' }, error as Error)
    return []
  }
}

export async function getProject(
  id: string,
  client?: SupabaseClient<Database>,
): Promise<CustomerProject | null> {
  const sb = client ?? supabase
  const { data, error } = await sb
    .from('projects')
    .select(`*, invoice_items (*)`)
    .eq('id', id)
    .single()

  if (error) throw error
  return data ? mapProjectFromDB(data) : null
}

// ─────────────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────────────

export async function createProject(
  project: Omit<CustomerProject, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<CustomerProject> {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    const documents = project.documents || []
    logger.debug('Creating project with data', {
      component: 'projects',
      customerName: project.customerName,
      orderNumber: project.orderNumber,
      status: project.status,
      documentsCount: documents.length,
      documentNames: documents.map((d: ProjectDocument) => d.name),
    })

    const accessCode = project.accessCode || generateAccessCode()
    const orderNumber =
      project.orderNumber || (await getNextOrderNumber()) || `K-${Date.now()}`

    // 1. Insert project row
    const { data, error } = await supabase
      .from('projects')
      .insert(buildProjectInsert(user.id, project, accessCode, orderNumber, documents))
      .select()
      .single()

    if (error) {
      logSupabaseError('createProject', error)
      throw error
    }

    const projectId = data.id

    // 2. Auto-create first payment if paymentSchedule configured
    await maybeCreateFirstPayment(project, projectId, orderNumber, data.order_number)

    // 3. Insert invoice items
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

function buildProjectInsert(
  userId: string,
  p: Omit<CustomerProject, 'id' | 'createdAt' | 'updatedAt'>,
  accessCode: string,
  orderNumber: string,
  documents: ProjectDocument[],
): Insert<'projects'> {
  return {
    user_id: userId,
    customer_id: p.customerId || null,
    access_code: accessCode,
    salesperson_id: p.salespersonId || null,
    salesperson_name: p.salespersonName || null,
    customer_name: p.customerName || 'Unbekannt',
    customer_address: p.address || null,
    customer_phone: p.phone || null,
    customer_email: p.email || null,
    order_number: orderNumber,
    offer_number: p.offerNumber || null,
    invoice_number: p.invoiceNumber || null,
    contract_number: p.contractNumber || null,
    status: p.status || 'Planung',
    total_amount: roundTo2Decimals(p.totalAmount || 0),
    net_amount: roundTo2Decimals(p.netAmount || 0),
    tax_amount: roundTo2Decimals(p.taxAmount || 0),
    deposit_amount: roundTo2Decimals(p.depositAmount || 0),
    is_deposit_paid: p.isDepositPaid || false,
    is_final_paid: p.isFinalPaid || false,
    offer_date: p.offerDate || null,
    measurement_date: p.measurementDate || null,
    measurement_time: p.measurementTime || null,
    is_measured: p.isMeasured || false,
    order_date: p.orderDate || null,
    is_ordered: p.isOrdered || false,
    delivery_date: p.deliveryDate || null,
    delivery_time: p.deliveryTime || null,
    installation_date: p.installationDate || null,
    installation_time: p.installationTime || null,
    is_installation_assigned: p.isInstallationAssigned || false,
    completion_date: p.completionDate || null,
    delivery_type: p.deliveryType || 'delivery',
    notes: p.notes || '',
    order_footer_text: p.orderFooterText ?? null,
    complaints: (p.complaints || []) as unknown as Json,
    documents: documents as unknown as Json,
    payment_schedule: (p.paymentSchedule || null) as unknown as Json,
    second_payment_created: p.secondPaymentCreated || false,
  }
}

async function maybeCreateFirstPayment(
  project: Omit<CustomerProject, 'id' | 'createdAt' | 'updatedAt'>,
  projectId: string,
  orderNumber: string,
  dbOrderNumber: string,
): Promise<void> {
  if (!project.paymentSchedule?.autoCreateFirst) return

  const existingResult = await getInvoices(projectId)
  const existing = existingResult.ok ? existingResult.data : []
  if (existing.some(inv => inv.type === 'partial' && inv.scheduleType === 'first')) return

  const amounts = calculatePaymentAmounts(project as CustomerProject)
  if (!amounts) return

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
    logger.error('Fehler beim Erstellen der ersten Anzahlung', {
      component: 'projects',
    }, new Error(result.message))
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

  const rows = items.map((item, idx) => buildItemRow(item, projectId, idx + 1))

  const { error } = await supabase.from('invoice_items').insert(rows)

  if (error) {
    logger.error('Error inserting items', { component: 'projects' }, error as Error)

    // Rollback: delete the project if item insertion fails
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
}

// ─────────────────────────────────────────────────────
// Update
// ─────────────────────────────────────────────────────

export async function updateProject(
  id: string,
  project: Partial<CustomerProject>,
): Promise<CustomerProject> {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    const updateData = buildProjectUpdate(project)

    // Pruefe ob ueberhaupt Daten zum Update vorhanden sind
    if (Object.keys(updateData).length === 0 && project.items === undefined) {
      logger.warn('updateProject: No fields to update, returning existing project', {
        component: 'projects',
      })
      return (await getProject(id)) as CustomerProject
    }

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        logSupabaseError('updateProject', error)
        throw error
      }
    }

    // Upsert invoice items if provided
    if (project.items !== undefined) {
      await upsertItems(id, project.items)
    }

    const updatedProject = (await getProject(id)) as CustomerProject

    // Audit: log changed fields
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

function buildProjectUpdate(p: Partial<CustomerProject>): Record<string, unknown> {
  const d: Record<string, unknown> = {}

  if (p.customerId !== undefined) d.customer_id = p.customerId
  if (p.salespersonId !== undefined) d.salesperson_id = p.salespersonId || null
  if (p.salespersonName !== undefined) d.salesperson_name = p.salespersonName || null
  if (p.customerName !== undefined) d.customer_name = p.customerName
  if (p.address !== undefined) d.customer_address = p.address
  if (p.phone !== undefined) d.customer_phone = p.phone
  if (p.email !== undefined) d.customer_email = p.email
  if (p.orderNumber !== undefined) d.order_number = p.orderNumber
  if (p.offerNumber !== undefined) d.offer_number = p.offerNumber
  if (p.invoiceNumber !== undefined) d.invoice_number = p.invoiceNumber
  if (p.contractNumber !== undefined) d.contract_number = p.contractNumber
  if (p.status !== undefined) d.status = p.status
  if (p.totalAmount !== undefined) d.total_amount = roundTo2Decimals(p.totalAmount)
  if (p.netAmount !== undefined) d.net_amount = roundTo2Decimals(p.netAmount)
  if (p.taxAmount !== undefined) d.tax_amount = roundTo2Decimals(p.taxAmount)
  if (p.depositAmount !== undefined) d.deposit_amount = roundTo2Decimals(p.depositAmount)
  if (p.isDepositPaid !== undefined) d.is_deposit_paid = p.isDepositPaid
  if (p.isFinalPaid !== undefined) d.is_final_paid = p.isFinalPaid
  if (p.offerDate !== undefined) d.offer_date = p.offerDate
  if (p.measurementDate !== undefined) d.measurement_date = p.measurementDate
  if (p.measurementTime !== undefined) d.measurement_time = p.measurementTime
  if (p.isMeasured !== undefined) d.is_measured = p.isMeasured
  if (p.orderDate !== undefined) d.order_date = p.orderDate
  if (p.isOrdered !== undefined) d.is_ordered = p.isOrdered
  if (p.deliveryDate !== undefined) d.delivery_date = p.deliveryDate
  if (p.deliveryTime !== undefined) d.delivery_time = p.deliveryTime
  if (p.installationDate !== undefined) d.installation_date = p.installationDate
  if (p.installationTime !== undefined) d.installation_time = p.installationTime
  if (p.isInstallationAssigned !== undefined) d.is_installation_assigned = p.isInstallationAssigned
  if (p.completionDate !== undefined) d.completion_date = p.completionDate
  if (p.deliveryType !== undefined) d.delivery_type = p.deliveryType
  if (p.notes !== undefined) d.notes = p.notes
  if (p.orderFooterText !== undefined) d.order_footer_text = p.orderFooterText
  if (p.accessCode !== undefined) d.access_code = p.accessCode
  if (p.complaints !== undefined) d.complaints = p.complaints
  if (p.paymentSchedule !== undefined) d.payment_schedule = p.paymentSchedule
  if (p.secondPaymentCreated !== undefined) d.second_payment_created = p.secondPaymentCreated

  if (p.documents !== undefined) {
    d.documents = p.documents
    logger.debug('Updating documents', {
      component: 'projects',
      count: p.documents.length,
      documentNames: p.documents.map((doc: ProjectDocument) => doc.name),
      totalSize: JSON.stringify(p.documents).length,
    })
  }

  return d
}

async function upsertItems(projectId: string, items: InvoiceItem[]): Promise<void> {
  validateItems(items)

  // Fetch existing item IDs
  const { data: existingItems, error: fetchError } = await supabase
    .from('invoice_items')
    .select('id')
    .eq('project_id', projectId)

  if (fetchError) {
    logger.error('Error fetching existing items', { component: 'projects' }, fetchError as Error)
    throw fetchError
  }

  const existingIds = new Set((existingItems ?? []).map(i => i.id))
  const incomingIds = new Set<string>()
  const insertedIds: string[] = []

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx]
    const row = buildItemRow(item, projectId, idx + 1) as ItemUpdate & ItemInsert

    try {
      if (item.id && UUID_RE.test(item.id) && existingIds.has(item.id)) {
        // UPDATE existing
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
        // INSERT new
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
      // Rollback newly inserted items on failure
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

  // Delete items no longer in the list
  const toDelete = Array.from(existingIds).filter(id => !incomingIds.has(id))
  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('invoice_items')
      .delete()
      .in('id', toDelete)

    if (deleteError) {
      logger.error('Error deleting removed items', { component: 'projects' }, deleteError as Error)
    }
  }
}

// ─────────────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────────────

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
    // Project not found — still delete, just without audit data
  }

  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error

  audit.projectDeleted(id, projectData)
}

// ─────────────────────────────────────────────────────
// Error helpers
// ─────────────────────────────────────────────────────

function logSupabaseError(
  fn: string,
  error: unknown,
): void {
  const e = error as { message?: string; code?: string; details?: string; hint?: string }
  logger.error(`${fn} error`, {
    component: 'projects',
    message: e?.message,
    code: e?.code,
    details: e?.details,
    hint: e?.hint,
  }, error as Error)
}

function logServiceError(fn: string, error: unknown): void {
  const e = error as { message?: string; code?: string; details?: string; hint?: string }
  logger.error(`${fn} failed`, {
    component: 'projects',
    message: e?.message,
    code: e?.code,
    details: e?.details,
    hint: e?.hint,
  }, error as Error)
}

// ─────────────────────────────────────────────────────
// Mapping: DB → Domain
// ─────────────────────────────────────────────────────

function mapProjectFromDB(row: ProjectRow): CustomerProject {
  const items: InvoiceItem[] = (row.invoice_items ?? []).map(mapItemFromDB)

  // Recalculate from items if available (corrects stale DB values)
  let totalAmount = row.total_amount ?? 0
  if (items.length > 0) {
    const { grossTotal } = calculateProjectTotals(items)
    totalAmount = grossTotal
  }

  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    customerId: row.customer_id ?? undefined,
    salespersonId: row.salesperson_id ?? undefined,
    salespersonName: row.salesperson_name ?? undefined,
    customerName: row.customer_name,
    address: row.customer_address ?? undefined,
    phone: row.customer_phone ?? undefined,
    email: row.customer_email ?? undefined,
    orderNumber: row.order_number,
    offerNumber: row.offer_number ?? undefined,
    invoiceNumber: row.invoice_number ?? undefined,
    contractNumber: row.contract_number ?? undefined,
    status: row.status as CustomerProject['status'],
    items,
    totalAmount,
    netAmount: row.net_amount ?? 0,
    taxAmount: row.tax_amount ?? 0,
    depositAmount: row.deposit_amount ?? 0,
    isDepositPaid: row.is_deposit_paid ?? false,
    isFinalPaid: row.is_final_paid ?? false,
    paymentSchedule: (row.payment_schedule as unknown as CustomerProject['paymentSchedule']) ?? undefined,
    secondPaymentCreated: row.second_payment_created ?? false,
    offerDate: row.offer_date ?? undefined,
    measurementDate: row.measurement_date ?? undefined,
    measurementTime: row.measurement_time ?? undefined,
    isMeasured: row.is_measured ?? false,
    orderDate: row.order_date ?? undefined,
    isOrdered: row.is_ordered ?? false,
    deliveryDate: row.delivery_date ?? undefined,
    deliveryTime: row.delivery_time ?? undefined,
    installationDate: row.installation_date ?? undefined,
    installationTime: row.installation_time ?? undefined,
    isInstallationAssigned: row.is_installation_assigned ?? false,
    completionDate: row.completion_date ?? undefined,
    documents: (row.documents as unknown as ProjectDocument[]) ?? [],
    complaints: (row.complaints as unknown as CustomerProject['complaints']) ?? [],
    notes: (row.notes as string) ?? '',
    accessCode: row.access_code ?? undefined,
    orderFooterText: row.order_footer_text ?? undefined,
    orderContractSignedAt: row.order_contract_signed_at ?? undefined,
    orderContractSignedBy: row.order_contract_signed_by ?? undefined,
    customerSignature: row.customer_signature ?? undefined,
    customerSignatureDate: row.customer_signature_date ?? undefined,
    withdrawalWaivedAt: (row as Record<string, unknown>).withdrawal_waived_at as string | undefined,
    deliveryStatus: row.delivery_status as CustomerProject['deliveryStatus'],
    allItemsDelivered: row.all_items_delivered ?? false,
    readyForAssemblyDate: row.ready_for_assembly_date ?? undefined,
    deliveryType: (row.delivery_type as 'delivery' | 'pickup') || 'delivery',
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  }
}

function mapItemFromDB(row: Row<'invoice_items'>): InvoiceItem {
  let unit = row.unit as InvoiceItem['unit']
  if (unit === 'm' && row.description?.toLowerCase().includes('laufmeter')) {
    unit = 'lfm'
  }

  const quantity = row.quantity ?? 0
  const grossTotal = row.gross_total ?? 0

  const grossPricePerUnit =
    row.gross_price_per_unit != null
      ? row.gross_price_per_unit
      : quantity > 0 && Number.isFinite(grossTotal) && grossTotal > 0
        ? roundTo2Decimals(grossTotal / quantity)
        : undefined

  return {
    id: row.id,
    articleId: row.article_id ?? undefined,
    position: row.position,
    description: row.description,
    modelNumber: row.model_number ?? undefined,
    manufacturer: row.manufacturer ?? undefined,
    specifications: (row.specifications as Record<string, string>) ?? {},
    quantity,
    unit,
    pricePerUnit: row.price_per_unit ?? 0,
    grossPricePerUnit,
    purchasePricePerUnit: row.purchase_price_per_unit ?? undefined,
    taxRate: (row.tax_rate ? parseInt(row.tax_rate) : 20) as 10 | 13 | 20,
    netTotal: row.net_total ?? 0,
    taxAmount: row.tax_amount ?? 0,
    grossTotal,
    deliveryStatus: row.delivery_status as InvoiceItem['deliveryStatus'],
    expectedDeliveryDate: row.expected_delivery_date ?? undefined,
    actualDeliveryDate: row.actual_delivery_date ?? undefined,
    quantityOrdered: row.quantity_ordered ?? undefined,
    quantityDelivered: row.quantity_delivered ?? undefined,
    showInPortal: row.show_in_portal ?? false,
    serialNumber: row.serial_number ?? undefined,
    installationDate: row.installation_date ?? undefined,
    warrantyUntil: row.warranty_until ?? undefined,
    applianceCategory: row.appliance_category ?? undefined,
    manufacturerSupportUrl: row.manufacturer_support_url ?? undefined,
    manufacturerSupportPhone: row.manufacturer_support_phone ?? undefined,
    manufacturerSupportEmail: row.manufacturer_support_email ?? undefined,
  }
}
