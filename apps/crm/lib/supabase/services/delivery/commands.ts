import type {
  CustomerDeliveryNote,
  DeliveryNote,
  GoodsReceipt,
  GoodsReceiptItem,
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
import { getTodayIsoDate, requireAuthenticatedUserId, toNumber } from './validators'

export async function createDeliveryNote(deliveryNote: CreateDeliveryNoteInput): Promise<DeliveryNote> {
  const userId = requireAuthenticatedUserId(await getCurrentUser())

  const { data, error } = await supabase
    .from('delivery_notes')
    .insert({
      user_id: userId,
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
      document_url: deliveryNote.documentUrl || null,
      raw_text: deliveryNote.rawText || null,
      notes: deliveryNote.notes || null,
    })
    .select()
    .single()

  if (error) {
    throw error
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

    await supabase.from('delivery_note_items').insert(itemsToInsert)
  }

  return (await getDeliveryNote(data.id)) as DeliveryNote
}

export async function updateDeliveryNote(
  id: string,
  updates: UpdateDeliveryNoteInput,
): Promise<DeliveryNote> {
  const userId = requireAuthenticatedUserId(await getCurrentUser())

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
  if (updates.documentUrl !== undefined) updateData.document_url = updates.documentUrl
  if (updates.rawText !== undefined) updateData.raw_text = updates.rawText
  if (updates.notes !== undefined) updateData.notes = updates.notes

  const { data, error } = await supabase
    .from('delivery_notes')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw error
  }

  return mapDeliveryNoteFromDB(data)
}

export async function matchDeliveryNoteToProject(
  deliveryNoteId: string,
  projectId: string,
  confidence?: number,
): Promise<DeliveryNote> {
  const userId = requireAuthenticatedUserId(await getCurrentUser())

  return updateDeliveryNote(deliveryNoteId, {
    matchedProjectId: projectId,
    matchedByUserId: userId,
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
    .select('quantity, quantity_delivered')
    .eq('id', itemId)
    .single()

  if (!item) {
    return
  }

  const deliveryItem = item as InvoiceItemDeliveryRow
  const newQuantityDelivered = toNumber(deliveryItem.quantity_delivered) + quantityReceived
  const totalQuantity = toNumber(deliveryItem.quantity)

  let deliveryStatus: string
  if (newQuantityDelivered >= totalQuantity) {
    deliveryStatus = 'delivered'
  } else if (newQuantityDelivered > 0) {
    deliveryStatus = 'partially_delivered'
  } else {
    deliveryStatus = 'ordered'
  }

  await supabase
    .from('invoice_items')
    .update({
      quantity_delivered: newQuantityDelivered,
      delivery_status: deliveryStatus,
      actual_delivery_date: getTodayIsoDate(),
    })
    .eq('id', itemId)
}

async function updateProjectDeliveryStatus(projectId: string): Promise<void> {
  const { data: items } = await supabase
    .from('invoice_items')
    .select('delivery_status, quantity, quantity_delivered')
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

  const allOrdered = typedItems.every((item) => item.delivery_status !== 'not_ordered')

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

export async function createGoodsReceipt(goodsReceipt: CreateGoodsReceiptInput): Promise<GoodsReceipt> {
  const userId = requireAuthenticatedUserId(await getCurrentUser())

  const { data, error } = await supabase
    .from('goods_receipts')
    .insert({
      project_id: goodsReceipt.projectId,
      delivery_note_id: goodsReceipt.deliveryNoteId || null,
      user_id: userId,
      receipt_date: goodsReceipt.receiptDate || new Date().toISOString(),
      receipt_type: goodsReceipt.receiptType,
      status: goodsReceipt.status || 'pending',
      notes: goodsReceipt.notes || null,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  if (goodsReceipt.items && goodsReceipt.items.length > 0) {
    const itemsToInsert = goodsReceipt.items.map((item: GoodsReceiptItem) => ({
      goods_receipt_id: data.id,
      project_item_id: item.projectItemId,
      delivery_note_item_id: item.deliveryNoteItemId || null,
      quantity_received: item.quantityReceived,
      quantity_expected: item.quantityExpected,
      status: item.status || 'received',
      notes: item.notes || null,
    }))

    await supabase.from('goods_receipt_items').insert(itemsToInsert)

    for (const item of goodsReceipt.items) {
      await updateInvoiceItemDeliveryStatus(item.projectItemId, item.quantityReceived)
    }
  }

  await updateProjectDeliveryStatus(goodsReceipt.projectId)

  return (await getGoodsReceipts(goodsReceipt.projectId).then((receipts) => receipts.find((receipt) => receipt.id === data.id))) as GoodsReceipt
}

export async function createCustomerDeliveryNote(
  deliveryNote: CreateCustomerDeliveryNoteInput,
): Promise<CustomerDeliveryNote> {
  const userId = requireAuthenticatedUserId(await getCurrentUser())

  const { getNextDeliveryNoteNumber } = await import('../company')
  const deliveryNoteNumber =
    deliveryNote.deliveryNoteNumber || (await getNextDeliveryNoteNumber())

  try {
    const { data, error } = await supabase
      .from('customer_delivery_notes')
      .insert({
        user_id: userId,
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
        throw new Error(
          'Die Tabelle customer_delivery_notes existiert noch nicht. Bitte führen Sie das SQL-Script in Supabase aus.',
        )
      }

      throw error
    }

    return mapCustomerDeliveryNoteFromDB(data)
  } catch (error: unknown) {
    const err = error as { message?: string; stack?: string }
    logger.error('createCustomerDeliveryNote failed', {
      component: 'delivery',
      message: err?.message,
      stack: err?.stack,
    })
    throw error
  }
}

export async function updateCustomerDeliveryNote(
  id: string,
  updates: UpdateCustomerDeliveryNoteInput,
): Promise<CustomerDeliveryNote> {
  const userId = requireAuthenticatedUserId(await getCurrentUser())

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
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw error
  }

  return mapCustomerDeliveryNoteFromDB(data)
}

export async function addCustomerSignature(
  deliveryNoteId: string,
  signature: string,
  signedBy: string,
): Promise<CustomerDeliveryNote> {
  return updateCustomerDeliveryNote(deliveryNoteId, {
    customerSignature: signature,
    customerSignatureDate: getTodayIsoDate(),
    signedBy,
    status: 'signed',
  })
}

export async function deleteDeliveryNote(id: string): Promise<void> {
  const userId = requireAuthenticatedUserId(await getCurrentUser())

  const deliveryNote = await getDeliveryNote(id)
  if (!deliveryNote) {
    throw new Error('Lieferschein nicht gefunden')
  }

  const { error: itemsError } = await supabase
    .from('delivery_note_items')
    .delete()
    .eq('delivery_note_id', id)

  if (itemsError) {
    logger.warn('Fehler beim Löschen der Items (möglicherweise CASCADE)', { component: 'delivery' }, itemsError as Error)
  }

  const { error } = await supabase
    .from('delivery_notes')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    logger.error('Fehler beim Löschen des Lieferscheins', { component: 'delivery' }, error as Error)
    throw error
  }
}

export async function deleteCustomerDeliveryNote(id: string): Promise<void> {
  const userId = requireAuthenticatedUserId(await getCurrentUser())

  const deliveryNote = await getCustomerDeliveryNote(id)
  if (!deliveryNote) {
    throw new Error('Kunden-Lieferschein nicht gefunden')
  }

  const { error } = await supabase
    .from('customer_delivery_notes')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    logger.error('Fehler beim Löschen des Kunden-Lieferscheins', { component: 'delivery' }, error as Error)
    throw error
  }
}
