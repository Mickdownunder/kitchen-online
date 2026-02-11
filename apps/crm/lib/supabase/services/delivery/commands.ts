import { fail, ok, type ServiceResult } from '@/lib/types/service'
import type {
  CustomerDeliveryNote,
  DeliveryNote,
  GoodsReceipt,
} from '@/types'
import { logger } from '@/lib/utils/logger'
import { supabase } from '../../client'
import { getCurrentUser } from '../auth'
import {
  mapCustomerDeliveryNoteFromDB,
  mapDeliveryNoteFromDB,
} from './mappers'
import { getCustomerDeliveryNote, getDeliveryNote, getGoodsReceipts } from './queries'
import type {
  CreateCustomerDeliveryNoteInput,
  CreateDeliveryNoteInput,
  CreateGoodsReceiptInput,
  InvoiceItemDeliveryRow,
  ProjectDeliveryItemRow,
  UpdateCustomerDeliveryNoteInput,
  UpdateDeliveryNoteInput,
} from './types'
import {
  ensureAuthenticatedUserId,
  getTodayIsoDate,
  toInternalErrorResult,
  toNumber,
} from './validators'

export async function createDeliveryNote(
  deliveryNote: CreateDeliveryNoteInput,
): Promise<ServiceResult<DeliveryNote>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return userResult
  }

  const { data, error } = await supabase
    .from('delivery_notes')
    .insert({
      user_id: userResult.data,
      supplier_name: deliveryNote.supplierName,
      supplier_delivery_note_number: deliveryNote.supplierDeliveryNoteNumber,
      delivery_date: deliveryNote.deliveryDate,
      received_date: deliveryNote.receivedDate || new Date().toISOString(),
      status: deliveryNote.status || 'received',
      ai_matched: deliveryNote.aiMatched || false,
      ai_confidence: deliveryNote.aiConfidence || null,
      matched_project_id: deliveryNote.matchedProjectId || null,
      matched_by_user_id: deliveryNote.matchedByUserId || null,
      matched_at: deliveryNote.matchedAt || null,
      supplier_order_id: deliveryNote.supplierOrderId || null,
      document_url: deliveryNote.documentUrl || null,
      raw_text: deliveryNote.rawText || null,
      notes: deliveryNote.notes || null,
    })
    .select()
    .single()

  if (error) {
    return toInternalErrorResult(error)
  }

  if (deliveryNote.items && deliveryNote.items.length > 0) {
    const itemsToInsert = deliveryNote.items.map((item) => ({
      delivery_note_id: data.id,
      position_number: item.positionNumber || null,
      description: item.description,
      model_number: item.modelNumber || null,
      manufacturer: item.manufacturer || null,
      quantity_ordered: item.quantityOrdered,
      quantity_received: item.quantityReceived,
      unit: item.unit || 'Stk',
      matched_project_item_id: item.matchedProjectItemId || null,
      ai_matched: item.aiMatched || false,
      ai_confidence: item.aiConfidence || null,
      status: item.status || 'received',
      notes: item.notes || null,
    }))

    const { error: itemError } = await supabase.from('delivery_note_items').insert(itemsToInsert)
    if (itemError) {
      return toInternalErrorResult(itemError)
    }
  }

  return getDeliveryNote(data.id)
}

export async function updateDeliveryNote(
  id: string,
  updates: UpdateDeliveryNoteInput,
): Promise<ServiceResult<DeliveryNote>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return userResult
  }

  const updateData: Record<string, unknown> = {}
  if (updates.supplierName !== undefined) updateData.supplier_name = updates.supplierName
  if (updates.supplierDeliveryNoteNumber !== undefined) {
    updateData.supplier_delivery_note_number = updates.supplierDeliveryNoteNumber
  }
  if (updates.deliveryDate !== undefined) updateData.delivery_date = updates.deliveryDate
  if (updates.status !== undefined) updateData.status = updates.status
  if (updates.aiMatched !== undefined) updateData.ai_matched = updates.aiMatched
  if (updates.aiConfidence !== undefined) updateData.ai_confidence = updates.aiConfidence
  if (updates.matchedProjectId !== undefined) updateData.matched_project_id = updates.matchedProjectId
  if (updates.matchedByUserId !== undefined) updateData.matched_by_user_id = updates.matchedByUserId
  if (updates.matchedAt !== undefined) updateData.matched_at = updates.matchedAt
  if (updates.supplierOrderId !== undefined) updateData.supplier_order_id = updates.supplierOrderId
  if (updates.documentUrl !== undefined) updateData.document_url = updates.documentUrl
  if (updates.rawText !== undefined) updateData.raw_text = updates.rawText
  if (updates.notes !== undefined) updateData.notes = updates.notes

  const { data, error } = await supabase
    .from('delivery_notes')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userResult.data)
    .select()
    .single()

  if (error) {
    return toInternalErrorResult(error)
  }

  return ok(mapDeliveryNoteFromDB(data))
}

export async function matchDeliveryNoteToProject(
  deliveryNoteId: string,
  projectId: string,
  confidence?: number,
): Promise<ServiceResult<DeliveryNote>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return userResult
  }

  return updateDeliveryNote(deliveryNoteId, {
    matchedProjectId: projectId,
    matchedByUserId: userResult.data,
    matchedAt: new Date().toISOString(),
    status: 'matched',
    aiMatched: confidence !== undefined,
    aiConfidence: confidence,
  })
}

async function updateInvoiceItemDeliveryStatus(
  itemId: string,
  quantityReceived: number,
): Promise<void> {
  const { data: item } = await supabase
    .from('invoice_items')
    .select('quantity, quantity_ordered, quantity_delivered, delivery_status')
    .eq('id', itemId)
    .single()

  if (!item) {
    return
  }

  const deliveryItem = item as InvoiceItemDeliveryRow
  const receivedQuantity = Math.max(0, toNumber(quantityReceived))
  const newQuantityDelivered = toNumber(deliveryItem.quantity_delivered) + receivedQuantity
  const totalQuantity = toNumber(deliveryItem.quantity)
  const newQuantityOrdered = Math.max(toNumber(deliveryItem.quantity_ordered), newQuantityDelivered)

  let deliveryStatus: string
  if (newQuantityDelivered >= totalQuantity && totalQuantity > 0) {
    deliveryStatus = 'delivered'
  } else if (deliveryItem.delivery_status === 'missing') {
    deliveryStatus = 'missing'
  } else if (newQuantityDelivered > 0) {
    deliveryStatus = 'partially_delivered'
  } else if (newQuantityOrdered > 0) {
    deliveryStatus = 'ordered'
  } else {
    deliveryStatus = 'not_ordered'
  }

  const updates: Record<string, unknown> = {
    quantity_ordered: newQuantityOrdered,
    quantity_delivered: newQuantityDelivered,
    delivery_status: deliveryStatus,
  }
  if (receivedQuantity > 0) {
    updates.actual_delivery_date = getTodayIsoDate()
  }

  await supabase
    .from('invoice_items')
    .update(updates)
    .eq('id', itemId)
}

async function updateProjectDeliveryStatus(projectId: string): Promise<void> {
  const { data: items } = await supabase
    .from('invoice_items')
    .select('delivery_status, quantity, quantity_ordered, quantity_delivered')
    .eq('project_id', projectId)

  if (!items || items.length === 0) {
    return
  }

  const typedItems = items as ProjectDeliveryItemRow[]
  const allDelivered = typedItems.every(
    (item) => item.delivery_status === 'delivered' && toNumber(item.quantity_delivered) >= toNumber(item.quantity),
  )

  const partiallyDelivered = typedItems.some(
    (item) =>
      item.delivery_status === 'partially_delivered' ||
      (toNumber(item.quantity_delivered) > 0 && toNumber(item.quantity_delivered) < toNumber(item.quantity)),
  )

  const allOrdered = typedItems.every((item) => {
    const orderedQuantity = Math.max(toNumber(item.quantity_ordered), toNumber(item.quantity_delivered))
    const totalQuantity = toNumber(item.quantity)
    if (totalQuantity > 0 && orderedQuantity >= totalQuantity) {
      return true
    }
    return item.delivery_status !== 'not_ordered'
  })

  let deliveryStatus: string
  if (allDelivered) {
    deliveryStatus = 'fully_delivered'
  } else if (partiallyDelivered) {
    deliveryStatus = 'partially_delivered'
  } else if (allOrdered) {
    deliveryStatus = 'fully_ordered'
  } else {
    deliveryStatus = 'partially_ordered'
  }

  await supabase
    .from('projects')
    .update({
      delivery_status: deliveryStatus,
      all_items_delivered: allDelivered,
      ready_for_assembly_date: allDelivered ? getTodayIsoDate() : null,
    })
    .eq('id', projectId)
}

async function getGoodsReceiptByIdempotencyKey(
  userId: string,
  projectId: string,
  idempotencyKey?: string,
): Promise<ServiceResult<GoodsReceipt> | null> {
  const normalizedKey = idempotencyKey?.trim()
  if (!normalizedKey) {
    return null
  }

  const { data: existingRow, error: existingError } = await supabase
    .from('goods_receipts')
    .select('id')
    .eq('user_id', userId)
    .eq('idempotency_key', normalizedKey)
    .maybeSingle()

  if (existingError) {
    return toInternalErrorResult(existingError)
  }

  if (!existingRow?.id) {
    return null
  }

  const receiptsResult = await getGoodsReceipts(projectId)
  if (!receiptsResult.ok) {
    return receiptsResult
  }

  const existingReceipt = receiptsResult.data.find((entry) => entry.id === String(existingRow.id))
  if (!existingReceipt) {
    return fail('NOT_FOUND', `Goods receipt ${String(existingRow.id)} not found`)
  }

  return ok(existingReceipt)
}

export async function createGoodsReceipt(
  goodsReceipt: CreateGoodsReceiptInput,
): Promise<ServiceResult<GoodsReceipt>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return userResult
  }

  const idempotentResult = await getGoodsReceiptByIdempotencyKey(
    userResult.data,
    goodsReceipt.projectId,
    goodsReceipt.idempotencyKey,
  )
  if (idempotentResult) {
    return idempotentResult
  }

  const { data, error } = await supabase
    .from('goods_receipts')
    .insert({
      project_id: goodsReceipt.projectId,
      delivery_note_id: goodsReceipt.deliveryNoteId || null,
      supplier_order_id: goodsReceipt.supplierOrderId || null,
      user_id: userResult.data,
      receipt_date: goodsReceipt.receiptDate || new Date().toISOString(),
      receipt_type: goodsReceipt.receiptType,
      idempotency_key: goodsReceipt.idempotencyKey || null,
      status: goodsReceipt.status || 'pending',
      notes: goodsReceipt.notes || null,
    })
    .select()
    .single()

  if (error) {
    const normalizedKey = goodsReceipt.idempotencyKey?.trim()
    const errorCode = (error as { code?: string }).code
    if (normalizedKey && errorCode === '23505') {
      const retryResult = await getGoodsReceiptByIdempotencyKey(
        userResult.data,
        goodsReceipt.projectId,
        normalizedKey,
      )
      if (retryResult) {
        return retryResult
      }
    }
    return toInternalErrorResult(error)
  }

  if (goodsReceipt.items && goodsReceipt.items.length > 0) {
    const itemsToInsert = goodsReceipt.items.map((item) => ({
      goods_receipt_id: data.id,
      project_item_id: item.projectItemId,
      delivery_note_item_id: item.deliveryNoteItemId || null,
      quantity_received: item.quantityReceived,
      quantity_expected: item.quantityExpected,
      status: item.status || 'received',
      notes: item.notes || null,
    }))

    const { error: itemInsertError } = await supabase.from('goods_receipt_items').insert(itemsToInsert)
    if (itemInsertError) {
      return toInternalErrorResult(itemInsertError)
    }

    for (const item of goodsReceipt.items) {
      await updateInvoiceItemDeliveryStatus(item.projectItemId, item.quantityReceived)
    }
  }

  await updateProjectDeliveryStatus(goodsReceipt.projectId)

  if (goodsReceipt.supplierOrderId) {
    const { data: projectState } = await supabase
      .from('projects')
      .select('all_items_delivered')
      .eq('id', goodsReceipt.projectId)
      .maybeSingle()

    const targetStatus = projectState?.all_items_delivered
      ? 'ready_for_installation'
      : 'goods_receipt_booked'

    await supabase
      .from('supplier_orders')
      .update({
        goods_receipt_id: data.id,
        booked_at: projectState?.all_items_delivered ? new Date().toISOString() : null,
        status: targetStatus,
      })
      .eq('id', goodsReceipt.supplierOrderId)
      .eq('user_id', userResult.data)
  }

  const receiptsResult = await getGoodsReceipts(goodsReceipt.projectId)
  if (!receiptsResult.ok) {
    return receiptsResult
  }

  const createdReceipt = receiptsResult.data.find((receipt) => receipt.id === data.id)
  if (!createdReceipt) {
    return fail('NOT_FOUND', `Goods receipt ${data.id} not found`)
  }

  return ok(createdReceipt)
}

export async function createCustomerDeliveryNote(
  deliveryNote: CreateCustomerDeliveryNoteInput,
): Promise<ServiceResult<CustomerDeliveryNote>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return userResult
  }

  let deliveryNoteNumber = deliveryNote.deliveryNoteNumber
  if (!deliveryNoteNumber) {
    const { getNextDeliveryNoteNumber } = await import('../company')
    deliveryNoteNumber = await getNextDeliveryNoteNumber()
  }

  const { data, error } = await supabase
    .from('customer_delivery_notes')
    .insert({
      user_id: userResult.data,
      project_id: deliveryNote.projectId,
      delivery_note_number: deliveryNoteNumber,
      delivery_date: deliveryNote.deliveryDate,
      delivery_address: deliveryNote.deliveryAddress || null,
      items: deliveryNote.items || null,
      status: deliveryNote.status || 'draft',
      customer_signature: deliveryNote.customerSignature || null,
      customer_signature_date: deliveryNote.customerSignatureDate || null,
      signed_by: deliveryNote.signedBy || null,
      notes: deliveryNote.notes || null,
    })
    .select()
    .single()

  if (error) {
    const errObj = error as Error & { code?: string; details?: string; hint?: string }
    logger.error('createCustomerDeliveryNote error', {
      component: 'delivery',
      message: errObj.message,
      code: errObj.code,
      details: errObj.details,
      hint: errObj.hint,
    })

    if (errObj.code === '42P01' || errObj.message?.includes('does not exist')) {
      return fail(
        'INTERNAL',
        'Die Tabelle customer_delivery_notes existiert noch nicht. Bitte führen Sie das SQL-Script in Supabase aus.',
        error,
      )
    }

    return toInternalErrorResult(error)
  }

  return ok(mapCustomerDeliveryNoteFromDB(data))
}

export async function updateCustomerDeliveryNote(
  id: string,
  updates: UpdateCustomerDeliveryNoteInput,
): Promise<ServiceResult<CustomerDeliveryNote>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return userResult
  }

  const updateData: Record<string, unknown> = {}

  if (updates.deliveryNoteNumber !== undefined) updateData.delivery_note_number = updates.deliveryNoteNumber
  if (updates.deliveryDate !== undefined) updateData.delivery_date = updates.deliveryDate
  if (updates.deliveryAddress !== undefined) updateData.delivery_address = updates.deliveryAddress
  if (updates.items !== undefined) updateData.items = updates.items
  if (updates.status !== undefined) updateData.status = updates.status
  if (updates.customerSignature !== undefined) updateData.customer_signature = updates.customerSignature
  if (updates.customerSignatureDate !== undefined) {
    updateData.customer_signature_date = updates.customerSignatureDate
  }
  if (updates.signedBy !== undefined) updateData.signed_by = updates.signedBy
  if (updates.notes !== undefined) updateData.notes = updates.notes

  updateData.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('customer_delivery_notes')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userResult.data)
    .select()
    .single()

  if (error) {
    return toInternalErrorResult(error)
  }

  return ok(mapCustomerDeliveryNoteFromDB(data))
}

export async function addCustomerSignature(
  deliveryNoteId: string,
  signature: string,
  signedBy: string,
): Promise<ServiceResult<CustomerDeliveryNote>> {
  return updateCustomerDeliveryNote(deliveryNoteId, {
    customerSignature: signature,
    customerSignatureDate: getTodayIsoDate(),
    signedBy,
    status: 'signed',
  })
}

export async function deleteDeliveryNote(id: string): Promise<ServiceResult<void>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return userResult
  }

  const deliveryNoteResult = await getDeliveryNote(id)
  if (!deliveryNoteResult.ok) {
    if (deliveryNoteResult.code === 'NOT_FOUND') {
      return deliveryNoteResult
    }
    return deliveryNoteResult
  }

  const { error: itemsError } = await supabase
    .from('delivery_note_items')
    .delete()
    .eq('delivery_note_id', id)

  if (itemsError) {
    logger.warn(
      'Fehler beim Löschen der Items (möglicherweise CASCADE)',
      { component: 'delivery' },
      itemsError as Error,
    )
  }

  const { error } = await supabase
    .from('delivery_notes')
    .delete()
    .eq('id', id)
    .eq('user_id', userResult.data)

  if (error) {
    logger.error('Fehler beim Löschen des Lieferscheins', { component: 'delivery' }, error as Error)
    return toInternalErrorResult(error)
  }

  return ok(undefined)
}

export async function deleteCustomerDeliveryNote(id: string): Promise<ServiceResult<void>> {
  const userResult = ensureAuthenticatedUserId(await getCurrentUser())
  if (!userResult.ok) {
    return userResult
  }

  const deliveryNoteResult = await getCustomerDeliveryNote(id)
  if (!deliveryNoteResult.ok) {
    return deliveryNoteResult
  }

  const { error } = await supabase
    .from('customer_delivery_notes')
    .delete()
    .eq('id', id)
    .eq('user_id', userResult.data)

  if (error) {
    logger.error('Fehler beim Löschen des Kunden-Lieferscheins', { component: 'delivery' }, error as Error)
    return toInternalErrorResult(error)
  }

  return ok(undefined)
}
