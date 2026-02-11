import { fail, ok, type Insert, type Row, type ServiceResult } from '@/lib/types/service'
import type {
  SupplierOrder,
  SupplierOrderCreatedByType,
  SupplierOrderDeviation,
  SupplierOrderItem,
  SupplierOrderDispatchLog,
  SupplierOrderStatus,
} from '@/types'
import type { Json } from '@/types/database.types'
import { logger } from '@/lib/utils/logger'
import { supabase } from '../client'
import { getCurrentUser } from './auth'

interface SupplierOrderRow extends Row<'supplier_orders'> {
  supplier_order_items?: Row<'supplier_order_items'>[] | null
  supplier_order_dispatch_logs?: Row<'supplier_order_dispatch_logs'>[] | null
  suppliers?: {
    id: string
    name: string
    email: string | null
    order_email: string | null
    contact_person: string | null
  } | null
  projects?: {
    id: string
    order_number: string | null
    customer_name: string | null
    installation_date: string | null
  } | null
}

interface SupplierInvoiceItemRow {
  id: string
  article_id: string | null
  description: string
  model_number: string | null
  manufacturer: string | null
  quantity: number | string
  unit: string
  expected_delivery_date: string | null
  articles:
    | {
        supplier_id: string | null
      }
    | {
        supplier_id: string | null
      }[]
    | null
}

const SUPPLIER_ORDER_MIGRATION_HINT =
  'Bestellmodul-Datenbanktabellen fehlen. Bitte Migrationen ausführen: ' +
  '20260210233000_supplier_order_workflow.sql und 20260211004000_supplier_order_ab_documents.sql ' +
  '(z.B. mit `pnpm --filter @kitchen/db migrate`).'

interface PostgrestErrorLike {
  code?: string
  message?: string
  details?: string
  hint?: string
}

export interface SupplierOrderItemInput {
  invoiceItemId?: string
  articleId?: string
  positionNumber?: number
  description: string
  modelNumber?: string
  manufacturer?: string
  quantity: number
  quantityConfirmed?: number
  unit?: string
  expectedDeliveryDate?: string
  notes?: string
}

export interface CreateSupplierOrderInput {
  projectId: string
  supplierId: string
  orderNumber?: string
  status?: SupplierOrderStatus
  deliveryCalendarWeek?: string
  installationReferenceDate?: string
  createdByType?: SupplierOrderCreatedByType
  approvedByUserId?: string
  approvedAt?: string
  sentToEmail?: string
  sentAt?: string
  bookedAt?: string
  idempotencyKey?: string
  templateVersion?: string
  templateSnapshot?: Record<string, unknown>
  abNumber?: string
  abConfirmedDeliveryDate?: string
  abDeviations?: SupplierOrderDeviation[]
  abReceivedAt?: string
  abDocumentUrl?: string
  abDocumentName?: string
  abDocumentMimeType?: string
  supplierDeliveryNoteId?: string
  goodsReceiptId?: string
  notes?: string
  items?: SupplierOrderItemInput[]
}

export interface UpdateSupplierOrderInput {
  orderNumber?: string
  status?: SupplierOrderStatus
  deliveryCalendarWeek?: string
  installationReferenceDate?: string
  createdByType?: SupplierOrderCreatedByType
  approvedByUserId?: string
  approvedAt?: string
  sentToEmail?: string
  sentAt?: string
  bookedAt?: string
  idempotencyKey?: string
  templateVersion?: string
  templateSnapshot?: Record<string, unknown>
  abNumber?: string
  abConfirmedDeliveryDate?: string
  abDeviations?: SupplierOrderDeviation[]
  abReceivedAt?: string
  abDocumentUrl?: string
  abDocumentName?: string
  abDocumentMimeType?: string
  supplierDeliveryNoteId?: string
  goodsReceiptId?: string
  notes?: string
  items?: SupplierOrderItemInput[]
}

export interface CaptureSupplierOrderAbInput {
  abNumber: string
  confirmedDeliveryDate?: string
  deviations?: SupplierOrderDeviation[]
  notes?: string
}

export interface SyncSupplierOrderBucketInput {
  projectId: string
  supplierId: string
  createdByType?: SupplierOrderCreatedByType
  deliveryCalendarWeek?: string
  installationReferenceDate?: string
  notes?: string
}

function toInternalError(error: unknown): ServiceResult<never> {
  const message = error instanceof Error ? error.message : 'Unbekannter Fehler'
  return fail('INTERNAL', message, error)
}

function isSupplierOrderSchemaMissing(error: unknown): boolean {
  const err = (error || {}) as PostgrestErrorLike
  const code = String(err.code || '').toUpperCase()
  const blob = [err.message, err.details, err.hint].filter(Boolean).join(' ').toLowerCase()

  if (code === '42P01' || code === 'PGRST204' || code === 'PGRST205') {
    return true
  }

  return (
    blob.includes('supplier_orders') ||
    blob.includes('supplier_order_items') ||
    blob.includes('supplier_order_dispatch_logs') ||
    blob.includes('schema cache') ||
    blob.includes('does not exist')
  )
}

function toSupplierOrdersError(error: unknown, operation: string): ServiceResult<never> {
  if (isSupplierOrderSchemaMissing(error)) {
    logger.warn(`${operation}: supplier order schema missing`, {
      component: 'supplierOrders',
      hint: SUPPLIER_ORDER_MIGRATION_HINT,
      code: ((error || {}) as PostgrestErrorLike).code || null,
    })
    return fail('VALIDATION', SUPPLIER_ORDER_MIGRATION_HINT, error)
  }

  return toInternalError(error)
}

async function getAuthenticatedUserId(): Promise<ServiceResult<string>> {
  const user = await getCurrentUser()
  if (!user?.id) {
    return fail('UNAUTHORIZED', 'Not authenticated')
  }

  return ok(user.id)
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function normalizeAbDeviations(value: unknown): SupplierOrderDeviation[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    .map((entry) => ({
      field: String(entry.field || ''),
      itemId: entry.itemId ? String(entry.itemId) : undefined,
      expected:
        typeof entry.expected === 'string' ||
        typeof entry.expected === 'number' ||
        entry.expected === null
          ? entry.expected
          : undefined,
      actual:
        typeof entry.actual === 'string' ||
        typeof entry.actual === 'number' ||
        entry.actual === null
          ? entry.actual
          : undefined,
      note: entry.note ? String(entry.note) : undefined,
    }))
    .filter((entry) => entry.field.length > 0)
}

function serializeAbDeviations(value: SupplierOrderDeviation[] | undefined): Json[] {
  return (value || []).map((entry) => {
    const jsonEntry: { [key: string]: Json | undefined } = {
      field: entry.field,
      itemId: entry.itemId ?? null,
      expected: entry.expected ?? null,
      actual: entry.actual ?? null,
      note: entry.note ?? null,
    }

    return jsonEntry
  })
}

function mapSupplierOrderItem(row: Row<'supplier_order_items'>): SupplierOrderItem {
  return {
    id: row.id,
    supplierOrderId: row.supplier_order_id,
    invoiceItemId: row.invoice_item_id || undefined,
    articleId: row.article_id || undefined,
    positionNumber: row.position_number,
    description: row.description,
    modelNumber: row.model_number || undefined,
    manufacturer: row.manufacturer || undefined,
    quantity: toNumber(row.quantity),
    quantityConfirmed:
      row.quantity_confirmed !== null && row.quantity_confirmed !== undefined
        ? toNumber(row.quantity_confirmed)
        : undefined,
    unit: row.unit,
    expectedDeliveryDate: row.expected_delivery_date || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapSupplierOrderDispatchLog(
  row: Row<'supplier_order_dispatch_logs'>,
): SupplierOrderDispatchLog {
  return {
    id: row.id,
    supplierOrderId: row.supplier_order_id,
    userId: row.user_id,
    sentByType: (row.sent_by_type as SupplierOrderCreatedByType) || 'user',
    toEmail: row.to_email,
    ccEmails: row.cc_emails || [],
    subject: row.subject,
    templateVersion: row.template_version,
    payload: (row.payload as Record<string, unknown>) || {},
    messageId: row.message_id || undefined,
    idempotencyKey: row.idempotency_key || undefined,
    sentAt: row.sent_at,
    createdAt: row.created_at,
  }
}

function mapSupplierOrder(row: SupplierOrderRow): SupplierOrder {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    supplierId: row.supplier_id,
    supplierName: row.suppliers?.name || undefined,
    supplierOrderEmail: row.suppliers?.order_email || row.suppliers?.email || undefined,
    projectOrderNumber: row.projects?.order_number || undefined,
    projectCustomerName: row.projects?.customer_name || undefined,
    projectInstallationDate: row.projects?.installation_date || undefined,
    orderNumber: row.order_number,
    status: row.status as SupplierOrderStatus,
    deliveryCalendarWeek: row.delivery_calendar_week || undefined,
    installationReferenceDate: row.installation_reference_date || undefined,
    createdByType: (row.created_by_type as SupplierOrderCreatedByType) || 'user',
    approvedByUserId: row.approved_by_user_id || undefined,
    approvedAt: row.approved_at || undefined,
    sentToEmail: row.sent_to_email || undefined,
    sentAt: row.sent_at || undefined,
    bookedAt: row.booked_at || undefined,
    idempotencyKey: row.idempotency_key || undefined,
    templateVersion: row.template_version,
    templateSnapshot: (row.template_snapshot as Record<string, unknown> | null) || undefined,
    abNumber: row.ab_number || undefined,
    abConfirmedDeliveryDate: row.ab_confirmed_delivery_date || undefined,
    abDeviations: normalizeAbDeviations(row.ab_deviations),
    abReceivedAt: row.ab_received_at || undefined,
    abDocumentUrl: row.ab_document_url || undefined,
    abDocumentName: row.ab_document_name || undefined,
    abDocumentMimeType: row.ab_document_mime_type || undefined,
    supplierDeliveryNoteId: row.supplier_delivery_note_id || undefined,
    goodsReceiptId: row.goods_receipt_id || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: (row.supplier_order_items || []).map(mapSupplierOrderItem),
    dispatchLogs: (row.supplier_order_dispatch_logs || []).map(mapSupplierOrderDispatchLog),
  }
}

async function generateSupplierOrderNumber(projectId: string, supplierId: string): Promise<string> {
  const { data: project } = await supabase
    .from('projects')
    .select('order_number')
    .eq('id', projectId)
    .maybeSingle()

  const projectOrderNumber = project?.order_number
    ? String(project.order_number).replace(/\s+/g, '')
    : `PROJ-${projectId.slice(0, 8).toUpperCase()}`

  return `${projectOrderNumber}-L${supplierId.slice(0, 4).toUpperCase()}`
}

async function upsertSupplierOrderItems(
  orderId: string,
  items: SupplierOrderItemInput[],
): Promise<ServiceResult<void>> {
  const { error: deleteError } = await supabase
    .from('supplier_order_items')
    .delete()
    .eq('supplier_order_id', orderId)

  if (deleteError) {
    return toSupplierOrdersError(deleteError, 'upsertSupplierOrderItems.delete')
  }

  if (items.length === 0) {
    return ok(undefined)
  }

  const payload = items.map((item, index) => ({
    supplier_order_id: orderId,
    invoice_item_id: item.invoiceItemId || null,
    article_id: item.articleId || null,
    position_number: item.positionNumber || index + 1,
    description: item.description,
    model_number: item.modelNumber || null,
    manufacturer: item.manufacturer || null,
    quantity: item.quantity,
    quantity_confirmed: item.quantityConfirmed ?? null,
    unit: item.unit || 'Stk',
    expected_delivery_date: item.expectedDeliveryDate || null,
    notes: item.notes || null,
  }))

  const { error: insertError } = await supabase.from('supplier_order_items').insert(payload)
  if (insertError) {
    return toSupplierOrdersError(insertError, 'upsertSupplierOrderItems.insert')
  }

  return ok(undefined)
}

function getSupplierIdFromRelation(
  relation:
    | SupplierInvoiceItemRow['articles']
    | {
        supplier_id?: string | null
      }
    | null,
): string | null {
  if (!relation) {
    return null
  }

  if (Array.isArray(relation)) {
    return relation[0]?.supplier_id || null
  }

  return relation.supplier_id || null
}

function aggregateSupplierItems(rows: SupplierInvoiceItemRow[]): SupplierOrderItemInput[] {
  const bucket = new Map<string, SupplierOrderItemInput>()

  rows.forEach((row) => {
    const key = [row.description, row.model_number || '', row.manufacturer || '', row.unit || 'Stk'].join('|')
    const quantity = Math.max(0, toNumber(row.quantity))

    if (bucket.has(key)) {
      const existing = bucket.get(key)!
      existing.quantity += quantity
      return
    }

    bucket.set(key, {
      invoiceItemId: row.id,
      articleId: row.article_id || undefined,
      description: row.description,
      modelNumber: row.model_number || undefined,
      manufacturer: row.manufacturer || undefined,
      quantity,
      unit: row.unit || 'Stk',
      expectedDeliveryDate: row.expected_delivery_date || undefined,
    })
  })

  return Array.from(bucket.values()).map((item, index) => ({
    ...item,
    positionNumber: index + 1,
  }))
}

export async function getSupplierOrders(projectId?: string): Promise<ServiceResult<SupplierOrder[]>> {
  const userResult = await getAuthenticatedUserId()
  if (!userResult.ok) {
    return userResult
  }

  let query = supabase
    .from('supplier_orders')
    .select(
      `
      *,
      supplier_order_items (*),
      supplier_order_dispatch_logs (*),
      suppliers (id, name, email, order_email, contact_person),
      projects (id, order_number, customer_name, installation_date)
    `,
    )
    .eq('user_id', userResult.data)
    .order('created_at', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query
  if (error) {
    return toSupplierOrdersError(error, 'getSupplierOrders')
  }

  return ok(((data || []) as SupplierOrderRow[]).map(mapSupplierOrder))
}

export async function getSupplierOrder(id: string): Promise<ServiceResult<SupplierOrder>> {
  const userResult = await getAuthenticatedUserId()
  if (!userResult.ok) {
    return userResult
  }

  const { data, error } = await supabase
    .from('supplier_orders')
    .select(
      `
      *,
      supplier_order_items (*),
      supplier_order_dispatch_logs (*),
      suppliers (id, name, email, order_email, contact_person),
      projects (id, order_number, customer_name, installation_date)
    `,
    )
    .eq('id', id)
    .eq('user_id', userResult.data)
    .maybeSingle()

  if (error) {
    return toSupplierOrdersError(error, 'getSupplierOrder')
  }

  if (!data) {
    return fail('NOT_FOUND', `Supplier order ${id} not found`)
  }

  return ok(mapSupplierOrder(data as SupplierOrderRow))
}

export async function createSupplierOrder(
  input: CreateSupplierOrderInput,
): Promise<ServiceResult<SupplierOrder>> {
  const userResult = await getAuthenticatedUserId()
  if (!userResult.ok) {
    return userResult
  }

  const orderNumber = input.orderNumber || (await generateSupplierOrderNumber(input.projectId, input.supplierId))

  const insertPayload: Insert<'supplier_orders'> = {
    user_id: userResult.data,
    project_id: input.projectId,
    supplier_id: input.supplierId,
    order_number: orderNumber,
    status: input.status || 'draft',
    delivery_calendar_week: input.deliveryCalendarWeek || null,
    installation_reference_date: input.installationReferenceDate || null,
    created_by_type: input.createdByType || 'user',
    approved_by_user_id: input.approvedByUserId || null,
    approved_at: input.approvedAt || null,
    sent_to_email: input.sentToEmail || null,
    sent_at: input.sentAt || null,
    booked_at: input.bookedAt || null,
    idempotency_key: input.idempotencyKey || null,
    template_version: input.templateVersion || 'v1',
    template_snapshot: (input.templateSnapshot || null) as Json | null,
    ab_number: input.abNumber || null,
    ab_confirmed_delivery_date: input.abConfirmedDeliveryDate || null,
    ab_deviations: serializeAbDeviations(input.abDeviations),
    ab_received_at: input.abReceivedAt || null,
    ab_document_url: input.abDocumentUrl || null,
    ab_document_name: input.abDocumentName || null,
    ab_document_mime_type: input.abDocumentMimeType || null,
    supplier_delivery_note_id: input.supplierDeliveryNoteId || null,
    goods_receipt_id: input.goodsReceiptId || null,
    notes: input.notes || null,
  }

  const { data, error } = await supabase
    .from('supplier_orders')
    .insert(insertPayload)
    .select('id')
    .single()

  if (error) {
    return toSupplierOrdersError(error, 'createSupplierOrder')
  }

  if (input.items && input.items.length > 0) {
    const itemResult = await upsertSupplierOrderItems(String(data.id), input.items)
    if (!itemResult.ok) {
      return itemResult
    }
  }

  return getSupplierOrder(String(data.id))
}

export async function updateSupplierOrder(
  id: string,
  updates: UpdateSupplierOrderInput,
): Promise<ServiceResult<SupplierOrder>> {
  const userResult = await getAuthenticatedUserId()
  if (!userResult.ok) {
    return userResult
  }

  const updateData: Record<string, unknown> = {}
  if (updates.orderNumber !== undefined) updateData.order_number = updates.orderNumber
  if (updates.status !== undefined) updateData.status = updates.status
  if (updates.deliveryCalendarWeek !== undefined) updateData.delivery_calendar_week = updates.deliveryCalendarWeek
  if (updates.installationReferenceDate !== undefined) {
    updateData.installation_reference_date = updates.installationReferenceDate
  }
  if (updates.createdByType !== undefined) updateData.created_by_type = updates.createdByType
  if (updates.approvedByUserId !== undefined) updateData.approved_by_user_id = updates.approvedByUserId
  if (updates.approvedAt !== undefined) updateData.approved_at = updates.approvedAt
  if (updates.sentToEmail !== undefined) updateData.sent_to_email = updates.sentToEmail
  if (updates.sentAt !== undefined) updateData.sent_at = updates.sentAt
  if (updates.bookedAt !== undefined) updateData.booked_at = updates.bookedAt
  if (updates.idempotencyKey !== undefined) updateData.idempotency_key = updates.idempotencyKey
  if (updates.templateVersion !== undefined) updateData.template_version = updates.templateVersion
  if (updates.templateSnapshot !== undefined) updateData.template_snapshot = updates.templateSnapshot
  if (updates.abNumber !== undefined) updateData.ab_number = updates.abNumber
  if (updates.abConfirmedDeliveryDate !== undefined) {
    updateData.ab_confirmed_delivery_date = updates.abConfirmedDeliveryDate
  }
  if (updates.abDeviations !== undefined) {
    updateData.ab_deviations = serializeAbDeviations(updates.abDeviations)
  }
  if (updates.abReceivedAt !== undefined) updateData.ab_received_at = updates.abReceivedAt
  if (updates.abDocumentUrl !== undefined) updateData.ab_document_url = updates.abDocumentUrl
  if (updates.abDocumentName !== undefined) updateData.ab_document_name = updates.abDocumentName
  if (updates.abDocumentMimeType !== undefined) {
    updateData.ab_document_mime_type = updates.abDocumentMimeType
  }
  if (updates.supplierDeliveryNoteId !== undefined) {
    updateData.supplier_delivery_note_id = updates.supplierDeliveryNoteId
  }
  if (updates.goodsReceiptId !== undefined) updateData.goods_receipt_id = updates.goodsReceiptId
  if (updates.notes !== undefined) updateData.notes = updates.notes

  if (Object.keys(updateData).length > 0) {
    const { error } = await supabase
      .from('supplier_orders')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userResult.data)

    if (error) {
      return toSupplierOrdersError(error, 'updateSupplierOrder')
    }
  }

  if (updates.items) {
    const itemResult = await upsertSupplierOrderItems(id, updates.items)
    if (!itemResult.ok) {
      return itemResult
    }
  }

  return getSupplierOrder(id)
}

export async function replaceSupplierOrderItems(
  orderId: string,
  items: SupplierOrderItemInput[],
): Promise<ServiceResult<SupplierOrder>> {
  const itemResult = await upsertSupplierOrderItems(orderId, items)
  if (!itemResult.ok) {
    return itemResult as ServiceResult<SupplierOrder>
  }

  return getSupplierOrder(orderId)
}

export async function captureSupplierOrderAB(
  orderId: string,
  input: CaptureSupplierOrderAbInput,
): Promise<ServiceResult<SupplierOrder>> {
  return updateSupplierOrder(orderId, {
    status: 'ab_received',
    abNumber: input.abNumber,
    abConfirmedDeliveryDate: input.confirmedDeliveryDate,
    abDeviations: input.deviations || [],
    abReceivedAt: new Date().toISOString(),
    notes: input.notes,
  })
}

export async function linkSupplierDeliveryNoteToOrder(
  orderId: string,
  deliveryNoteId: string,
): Promise<ServiceResult<SupplierOrder>> {
  const userResult = await getAuthenticatedUserId()
  if (!userResult.ok) {
    return userResult
  }

  const { error: noteError } = await supabase
    .from('delivery_notes')
    .update({ supplier_order_id: orderId })
    .eq('id', deliveryNoteId)
    .eq('user_id', userResult.data)

  if (noteError) {
    return toSupplierOrdersError(noteError, 'linkSupplierDeliveryNoteToOrder')
  }

  return updateSupplierOrder(orderId, {
    supplierDeliveryNoteId: deliveryNoteId,
    status: 'delivery_note_received',
  })
}

export async function syncSupplierOrderBucketFromProject(
  input: SyncSupplierOrderBucketInput,
): Promise<ServiceResult<SupplierOrder>> {
  const userResult = await getAuthenticatedUserId()
  if (!userResult.ok) {
    return userResult
  }

  const { data: projectRow, error: projectError } = await supabase
    .from('projects')
    .select('id, order_number, installation_date')
    .eq('id', input.projectId)
    .eq('user_id', userResult.data)
    .maybeSingle()

  if (projectError) {
    return toInternalError(projectError)
  }

  if (!projectRow) {
    return fail('NOT_FOUND', `Project ${input.projectId} not found`)
  }

  const { data: invoiceRows, error: itemsError } = await supabase
    .from('invoice_items')
    .select(
      `
      id,
      article_id,
      description,
      model_number,
      manufacturer,
      quantity,
      unit,
      expected_delivery_date,
      articles (supplier_id)
    `,
    )
    .eq('project_id', input.projectId)

  if (itemsError) {
    return toInternalError(itemsError)
  }

  const supplierRows = ((invoiceRows || []) as SupplierInvoiceItemRow[]).filter((row) => {
    return getSupplierIdFromRelation(row.articles) === input.supplierId
  })

  const aggregatedItems = aggregateSupplierItems(supplierRows)
  if (aggregatedItems.length === 0) {
    return fail(
      'VALIDATION',
      'Keine Positionen für diesen Lieferanten im Auftrag gefunden. Bitte Artikel-Lieferant prüfen.',
    )
  }

  const { data: existingOrder, error: existingOrderError } = await supabase
    .from('supplier_orders')
    .select('id')
    .eq('user_id', userResult.data)
    .eq('project_id', input.projectId)
    .eq('supplier_id', input.supplierId)
    .maybeSingle()

  if (existingOrderError) {
    return toSupplierOrdersError(existingOrderError, 'syncSupplierOrderBucketFromProject')
  }

  if (existingOrder?.id) {
    return updateSupplierOrder(existingOrder.id, {
      deliveryCalendarWeek: input.deliveryCalendarWeek,
      installationReferenceDate:
        input.installationReferenceDate || projectRow.installation_date || undefined,
      notes: input.notes,
      items: aggregatedItems,
    })
  }

  const createResult = await createSupplierOrder({
    projectId: input.projectId,
    supplierId: input.supplierId,
    orderNumber: await generateSupplierOrderNumber(input.projectId, input.supplierId),
    status: 'draft',
    createdByType: input.createdByType || 'user',
    deliveryCalendarWeek: input.deliveryCalendarWeek,
    installationReferenceDate: input.installationReferenceDate || projectRow.installation_date || undefined,
    notes: input.notes,
    items: aggregatedItems,
  })

  return createResult
}
