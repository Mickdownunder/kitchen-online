import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { InboundDocumentKind, InboundInboxRow } from './types'

type DbClient = SupabaseClient<Database>

const ADVANCED_SUPPLIER_ORDER_STATUSES = new Set([
  'delivery_note_received',
  'goods_receipt_open',
  'goods_receipt_booked',
  'ready_for_installation',
])

interface ParsedSignals {
  kind: InboundDocumentKind
  abNumber?: string
  confirmedDeliveryDate?: string
  deliveryNoteNumber?: string
  deliveryDate?: string
  invoiceNumber?: string
  invoiceDate?: string
  dueDate?: string
  supplierName?: string
  netAmount?: number
  taxRate?: number
  category?: string
}

function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error
  }
  return new Error(String(error || 'Unknown error'))
}

function toIsoDate(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null
  }
  return trimmed
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return null
}

function parseSignals(row: InboundInboxRow): ParsedSignals {
  const extracted = row.extracted_payload && typeof row.extracted_payload === 'object'
    ? (row.extracted_payload as Record<string, unknown>)
    : {}
  const signals = extracted.signals && typeof extracted.signals === 'object'
    ? (extracted.signals as Record<string, unknown>)
    : {}

  const kindValue = typeof signals.kind === 'string' ? signals.kind : row.document_kind
  const normalizedKind: InboundDocumentKind =
    kindValue === 'ab' ||
    kindValue === 'supplier_delivery_note' ||
    kindValue === 'supplier_invoice' ||
    kindValue === 'unknown'
      ? kindValue
      : 'unknown'

  return {
    kind: normalizedKind,
    abNumber: typeof signals.abNumber === 'string' ? signals.abNumber : undefined,
    confirmedDeliveryDate: toIsoDate(signals.confirmedDeliveryDate) || undefined,
    deliveryNoteNumber:
      typeof signals.deliveryNoteNumber === 'string' ? signals.deliveryNoteNumber : undefined,
    deliveryDate: toIsoDate(signals.deliveryDate) || undefined,
    invoiceNumber: typeof signals.invoiceNumber === 'string' ? signals.invoiceNumber : undefined,
    invoiceDate: toIsoDate(signals.invoiceDate) || undefined,
    dueDate: toIsoDate(signals.dueDate) || undefined,
    supplierName: typeof signals.supplierName === 'string' ? signals.supplierName : undefined,
    netAmount: toNumber(signals.netAmount) || undefined,
    taxRate: toNumber(signals.taxRate) || undefined,
    category: typeof signals.category === 'string' ? signals.category : undefined,
  }
}

function resolveKind(row: InboundInboxRow, override?: string): InboundDocumentKind {
  if (override === 'ab' || override === 'supplier_delivery_note' || override === 'supplier_invoice') {
    return override
  }

  if (
    row.document_kind === 'ab' ||
    row.document_kind === 'supplier_delivery_note' ||
    row.document_kind === 'supplier_invoice'
  ) {
    return row.document_kind
  }

  return parseSignals(row).kind
}

async function confirmAb(input: {
  supabase: DbClient
  row: InboundInboxRow
  userId: string
  supplierOrderId: string
  abNumber?: string
  confirmedDeliveryDate?: string
  notes?: string
}): Promise<void> {
  const nowIso = new Date().toISOString()

  const { data: existingOrder, error: existingError } = await input.supabase
    .from('supplier_orders')
    .select('status, notes')
    .eq('id', input.supplierOrderId)
    .eq('user_id', input.userId)
    .maybeSingle()

  if (existingError) {
    throw toError(existingError)
  }

  if (!existingOrder) {
    throw new Error('Ziel-Bestellung nicht gefunden.')
  }

  const nextStatus = ADVANCED_SUPPLIER_ORDER_STATUSES.has(existingOrder.status)
    ? existingOrder.status
    : 'ab_received'

  const mergedNotes = [existingOrder.notes, input.notes]
    .filter((entry) => typeof entry === 'string' && entry.trim().length > 0)
    .join('\n')

  const { error } = await input.supabase
    .from('supplier_orders')
    .update({
      status: nextStatus,
      ab_number: input.abNumber || null,
      ab_confirmed_delivery_date: input.confirmedDeliveryDate || null,
      ab_received_at: nowIso,
      ab_document_url: input.row.storage_path,
      ab_document_name: input.row.file_name,
      ab_document_mime_type: input.row.mime_type,
      notes: mergedNotes || null,
    })
    .eq('id', input.supplierOrderId)
    .eq('user_id', input.userId)

  if (error) {
    throw toError(error)
  }
}

async function confirmSupplierDeliveryNote(input: {
  supabase: DbClient
  row: InboundInboxRow
  userId: string
  projectId: string
  supplierOrderId?: string | null
  supplierName: string
  deliveryNoteNumber: string
  deliveryDate: string
  notes?: string
  assignmentConfidence?: number | null
}): Promise<{ deliveryNoteId: string }> {
  const nowIso = new Date().toISOString()

  const { data: inserted, error: insertError } = await input.supabase
    .from('delivery_notes')
    .insert({
      user_id: input.userId,
      supplier_name: input.supplierName,
      supplier_delivery_note_number: input.deliveryNoteNumber,
      delivery_date: input.deliveryDate,
      received_date: nowIso,
      status: 'matched',
      ai_matched: true,
      ai_confidence: input.assignmentConfidence || null,
      matched_project_id: input.projectId,
      matched_by_user_id: input.userId,
      matched_at: nowIso,
      supplier_order_id: input.supplierOrderId || null,
      document_url: input.row.storage_path,
      notes: input.notes || null,
    })
    .select('id')
    .single()

  if (insertError || !inserted?.id) {
    throw toError(insertError || new Error('Lieferschein konnte nicht erstellt werden.'))
  }

  if (input.supplierOrderId) {
    const { data: existingOrder, error: existingOrderError } = await input.supabase
      .from('supplier_orders')
      .select('status')
      .eq('id', input.supplierOrderId)
      .eq('user_id', input.userId)
      .maybeSingle()

    if (existingOrderError) {
      throw toError(existingOrderError)
    }

    const status = existingOrder && ADVANCED_SUPPLIER_ORDER_STATUSES.has(existingOrder.status)
      ? existingOrder.status
      : 'delivery_note_received'

    const { error: orderError } = await input.supabase
      .from('supplier_orders')
      .update({
        supplier_delivery_note_id: inserted.id,
        status,
      })
      .eq('id', input.supplierOrderId)
      .eq('user_id', input.userId)

    if (orderError) {
      throw toError(orderError)
    }
  }

  return { deliveryNoteId: inserted.id }
}

async function confirmSupplierInvoice(input: {
  supabase: DbClient
  row: InboundInboxRow
  userId: string
  projectId?: string | null
  supplierName: string
  invoiceNumber: string
  invoiceDate: string
  dueDate?: string | null
  netAmount: number
  taxRate: number
  category: string
  notes?: string
}): Promise<{ supplierInvoiceId: string }> {
  const normalizedTaxRate = Number.isFinite(input.taxRate) ? input.taxRate : 20
  const netAmount = Number.isFinite(input.netAmount) ? input.netAmount : 0
  const taxAmount = Number(((netAmount * normalizedTaxRate) / 100).toFixed(2))
  const grossAmount = Number((netAmount + taxAmount).toFixed(2))

  const { data, error } = await input.supabase
    .from('supplier_invoices')
    .insert({
      user_id: input.userId,
      supplier_name: input.supplierName,
      invoice_number: input.invoiceNumber,
      invoice_date: input.invoiceDate,
      due_date: input.dueDate || null,
      net_amount: netAmount,
      tax_rate: normalizedTaxRate,
      tax_amount: taxAmount,
      gross_amount: grossAmount,
      category: input.category || 'material',
      project_id: input.projectId || null,
      document_url: input.row.storage_path,
      document_name: input.row.file_name,
      notes: input.notes || null,
    })
    .select('id')
    .single()

  if (error || !data?.id) {
    throw toError(error || new Error('Eingangsrechnung konnte nicht erstellt werden.'))
  }

  return {
    supplierInvoiceId: data.id,
  }
}

export async function confirmInboxItem(input: {
  supabase: DbClient
  row: InboundInboxRow
  userId: string
  body: Record<string, unknown>
}): Promise<{
  kind: InboundDocumentKind
  supplierOrderId?: string
  projectId?: string
  supplierInvoiceId?: string
  deliveryNoteId?: string
}> {
  const parsedSignals = parseSignals(input.row)
  const kind = resolveKind(input.row, typeof input.body.kind === 'string' ? input.body.kind : undefined)

  if (kind === 'ab') {
    const supplierOrderId =
      (typeof input.body.supplierOrderId === 'string' && input.body.supplierOrderId) ||
      input.row.assigned_supplier_order_id

    if (!supplierOrderId) {
      throw new Error('Für AB-Bestätigung ist eine Ziel-Bestellung erforderlich.')
    }

    await confirmAb({
      supabase: input.supabase,
      row: input.row,
      userId: input.userId,
      supplierOrderId,
      abNumber:
        (typeof input.body.abNumber === 'string' && input.body.abNumber) || parsedSignals.abNumber,
      confirmedDeliveryDate:
        toIsoDate(input.body.confirmedDeliveryDate) || parsedSignals.confirmedDeliveryDate,
      notes: typeof input.body.notes === 'string' ? input.body.notes : undefined,
    })

    return {
      kind,
      supplierOrderId,
      projectId: input.row.assigned_project_id || undefined,
    }
  }

  if (kind === 'supplier_delivery_note') {
    const projectId =
      (typeof input.body.projectId === 'string' && input.body.projectId) || input.row.assigned_project_id
    if (!projectId) {
      throw new Error('Für Lieferscheine ist eine Projektzuordnung erforderlich.')
    }

    const supplierOrderId =
      (typeof input.body.supplierOrderId === 'string' && input.body.supplierOrderId) ||
      input.row.assigned_supplier_order_id

    const supplierName =
      (typeof input.body.supplierName === 'string' && input.body.supplierName) ||
      parsedSignals.supplierName ||
      input.row.sender_name ||
      input.row.sender_email ||
      'Unbekannt'

    const deliveryNoteNumber =
      (typeof input.body.deliveryNoteNumber === 'string' && input.body.deliveryNoteNumber) ||
      parsedSignals.deliveryNoteNumber ||
      `LS-${Date.now()}`

    const deliveryDate =
      toIsoDate(input.body.deliveryDate) || parsedSignals.deliveryDate || new Date().toISOString().slice(0, 10)

    const result = await confirmSupplierDeliveryNote({
      supabase: input.supabase,
      row: input.row,
      userId: input.userId,
      projectId,
      supplierOrderId,
      supplierName,
      deliveryNoteNumber,
      deliveryDate,
      notes: typeof input.body.notes === 'string' ? input.body.notes : undefined,
      assignmentConfidence: input.row.assignment_confidence,
    })

    return {
      kind,
      supplierOrderId: supplierOrderId || undefined,
      projectId,
      deliveryNoteId: result.deliveryNoteId,
    }
  }

  if (kind === 'supplier_invoice') {
    const projectId =
      (typeof input.body.projectId === 'string' && input.body.projectId) || input.row.assigned_project_id

    const supplierName =
      (typeof input.body.supplierName === 'string' && input.body.supplierName) ||
      parsedSignals.supplierName ||
      input.row.sender_name ||
      input.row.sender_email ||
      'Unbekannt'

    const invoiceNumber =
      (typeof input.body.invoiceNumber === 'string' && input.body.invoiceNumber) ||
      parsedSignals.invoiceNumber

    if (!invoiceNumber) {
      throw new Error('Rechnungsnummer fehlt für Eingangsrechnungs-Buchung.')
    }

    const invoiceDate =
      toIsoDate(input.body.invoiceDate) || parsedSignals.invoiceDate || new Date().toISOString().slice(0, 10)

    const netAmount = toNumber(input.body.netAmount) || parsedSignals.netAmount || 0
    if (netAmount <= 0) {
      throw new Error('Netto-Betrag muss größer als 0 sein.')
    }

    const taxRate = toNumber(input.body.taxRate) || parsedSignals.taxRate || 20

    const result = await confirmSupplierInvoice({
      supabase: input.supabase,
      row: input.row,
      userId: input.userId,
      projectId,
      supplierName,
      invoiceNumber,
      invoiceDate,
      dueDate: toIsoDate(input.body.dueDate) || parsedSignals.dueDate,
      netAmount,
      taxRate,
      category:
        (typeof input.body.category === 'string' && input.body.category) || parsedSignals.category || 'material',
      notes: typeof input.body.notes === 'string' ? input.body.notes : undefined,
    })

    return {
      kind,
      projectId: projectId || undefined,
      supplierInvoiceId: result.supplierInvoiceId,
    }
  }

  throw new Error('Dokumenttyp ist unbekannt und kann nicht bestätigt werden.')
}
