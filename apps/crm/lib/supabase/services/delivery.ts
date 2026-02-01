import { supabase } from '../client'
import {
  CustomerDeliveryNote,
  DeliveryNote,
  DeliveryNoteItem,
  GoodsReceipt,
  GoodsReceiptItem,
} from '@/types'
import { getCurrentUser } from './auth'
import { logger } from '@/lib/utils/logger'

// Delivery Notes
export async function getDeliveryNotes(): Promise<DeliveryNote[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('delivery_notes')
    .select(
      `
      *,
      delivery_note_items (*)
    `
    )
    .eq('user_id', user.id)
    .order('received_date', { ascending: false })

  if (error) {
    logger.error('Error fetching delivery notes', { component: 'delivery' }, error as Error)
    return []
  }

  return (data || []).map(mapDeliveryNoteFromDB)
}

export async function getDeliveryNote(id: string): Promise<DeliveryNote | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('delivery_notes')
    .select(
      `
      *,
      delivery_note_items (*)
    `
    )
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) {
    if ((error as { code?: string }).code === 'PGRST116') return null
    throw error
  }

  return mapDeliveryNoteFromDB(data)
}

export async function createDeliveryNote(
  deliveryNote: Omit<DeliveryNote, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & {
    items?: DeliveryNoteItem[]
  }
): Promise<DeliveryNote> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('delivery_notes')
    .insert({
      user_id: user.id,
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

  if (error) throw error

  // Insert items if provided
  if (deliveryNote.items && deliveryNote.items.length > 0) {
    const itemsToInsert = deliveryNote.items.map(item => ({
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
  updates: Partial<DeliveryNote>
): Promise<DeliveryNote> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {}
  if (updates.supplierName !== undefined) updateData.supplier_name = updates.supplierName
  if (updates.supplierDeliveryNoteNumber !== undefined)
    updateData.supplier_delivery_note_number = updates.supplierDeliveryNoteNumber
  if (updates.deliveryDate !== undefined) updateData.delivery_date = updates.deliveryDate
  if (updates.status !== undefined) updateData.status = updates.status
  if (updates.aiMatched !== undefined) updateData.ai_matched = updates.aiMatched
  if (updates.aiConfidence !== undefined) updateData.ai_confidence = updates.aiConfidence
  if (updates.matchedProjectId !== undefined)
    updateData.matched_project_id = updates.matchedProjectId
  if (updates.matchedByUserId !== undefined) updateData.matched_by_user_id = updates.matchedByUserId
  if (updates.matchedAt !== undefined) updateData.matched_at = updates.matchedAt
  if (updates.documentUrl !== undefined) updateData.document_url = updates.documentUrl
  if (updates.rawText !== undefined) updateData.raw_text = updates.rawText
  if (updates.notes !== undefined) updateData.notes = updates.notes

  const { data, error } = await supabase
    .from('delivery_notes')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw error

  return mapDeliveryNoteFromDB(data)
}

export async function matchDeliveryNoteToProject(
  deliveryNoteId: string,
  projectId: string,
  confidence?: number
): Promise<DeliveryNote> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  return await updateDeliveryNote(deliveryNoteId, {
    matchedProjectId: projectId,
    matchedByUserId: user.id,
    matchedAt: new Date().toISOString(),
    status: 'matched',
    aiMatched: confidence !== undefined,
    aiConfidence: confidence,
  })
}

// Goods Receipts
export async function getGoodsReceipts(projectId?: string): Promise<GoodsReceipt[]> {
  const user = await getCurrentUser()
  if (!user) return []

  let query = supabase
    .from('goods_receipts')
    .select(
      `
      *,
      goods_receipt_items (*)
    `
    )
    .eq('user_id', user.id)

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query.order('receipt_date', { ascending: false })

  if (error) {
    logger.error('Error fetching goods receipts', { component: 'delivery' }, error as Error)
    return []
  }

  return (data || []).map(mapGoodsReceiptFromDB)
}

export async function createGoodsReceipt(
  goodsReceipt: Omit<GoodsReceipt, 'id' | 'createdAt' | 'updatedAt'> & {
    items?: GoodsReceiptItem[]
  }
): Promise<GoodsReceipt> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('goods_receipts')
    .insert({
      project_id: goodsReceipt.projectId,
      delivery_note_id: goodsReceipt.deliveryNoteId || null,
      user_id: user.id,
      receipt_date: goodsReceipt.receiptDate || new Date().toISOString(),
      receipt_type: goodsReceipt.receiptType,
      status: goodsReceipt.status || 'pending',
      notes: goodsReceipt.notes || null,
    })
    .select()
    .single()

  if (error) throw error

  // Insert items if provided
  if (goodsReceipt.items && goodsReceipt.items.length > 0) {
    const itemsToInsert = goodsReceipt.items.map(item => ({
      goods_receipt_id: data.id,
      project_item_id: item.projectItemId,
      delivery_note_item_id: item.deliveryNoteItemId || null,
      quantity_received: item.quantityReceived,
      quantity_expected: item.quantityExpected,
      status: item.status || 'received',
      notes: item.notes || null,
    }))

    await supabase.from('goods_receipt_items').insert(itemsToInsert)

    // Update invoice items delivery status
    for (const item of goodsReceipt.items) {
      await updateInvoiceItemDeliveryStatus(item.projectItemId, item.quantityReceived)
    }
  }

  // Update project delivery status
  await updateProjectDeliveryStatus(goodsReceipt.projectId)

  return (await getGoodsReceipts(goodsReceipt.projectId).then(receipts =>
    receipts.find(r => r.id === data.id)
  )) as GoodsReceipt
}

// Helper: Update invoice item delivery status
async function updateInvoiceItemDeliveryStatus(
  itemId: string,
  quantityReceived: number
): Promise<void> {
  const { data: item } = await supabase
    .from('invoice_items')
    .select('quantity, quantity_delivered')
    .eq('id', itemId)
    .single()

  if (!item) return

  const newQuantityDelivered = parseFloat(String(item.quantity_delivered || 0)) + quantityReceived
  const totalQuantity = parseFloat(String(item.quantity || 0))

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
      actual_delivery_date: new Date().toISOString().split('T')[0],
    })
    .eq('id', itemId)
}

// Helper: Update project delivery status
async function updateProjectDeliveryStatus(projectId: string): Promise<void> {
  const { data: items } = await supabase
    .from('invoice_items')
    .select('delivery_status, quantity, quantity_delivered')
    .eq('project_id', projectId)

  if (!items || items.length === 0) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedItems = items as any[]
  const allDelivered = typedItems.every(
    (item) =>
      item.delivery_status === 'delivered' &&
      parseFloat(String(item.quantity_delivered || 0)) >= parseFloat(String(item.quantity || 0))
  )

  const partiallyDelivered = typedItems.some(
    (item) =>
      item.delivery_status === 'partially_delivered' ||
      (parseFloat(String(item.quantity_delivered || 0)) > 0 &&
        parseFloat(String(item.quantity_delivered || 0)) < parseFloat(String(item.quantity || 0)))
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
      ready_for_assembly_date: allDelivered ? new Date().toISOString().split('T')[0] : null,
    })
    .eq('id', projectId)
}

// Mapping functions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDeliveryNoteFromDB(dbNote: Record<string, any>): DeliveryNote {
  return {
    id: dbNote.id,
    userId: dbNote.user_id,
    supplierName: dbNote.supplier_name,
    supplierDeliveryNoteNumber: dbNote.supplier_delivery_note_number,
    deliveryDate: dbNote.delivery_date,
    receivedDate: dbNote.received_date,
    status: dbNote.status,
    aiMatched: dbNote.ai_matched || false,
    aiConfidence: dbNote.ai_confidence ? parseFloat(dbNote.ai_confidence) : undefined,
    matchedProjectId: dbNote.matched_project_id,
    matchedByUserId: dbNote.matched_by_user_id,
    matchedAt: dbNote.matched_at,
    documentUrl: dbNote.document_url,
    rawText: dbNote.raw_text,
    notes: dbNote.notes,
    createdAt: dbNote.created_at,
    updatedAt: dbNote.updated_at,
    items: (dbNote.delivery_note_items || []).map(mapDeliveryNoteItemFromDB),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDeliveryNoteItemFromDB(dbItem: Record<string, any>): DeliveryNoteItem {
  return {
    id: dbItem.id,
    deliveryNoteId: dbItem.delivery_note_id,
    positionNumber: dbItem.position_number,
    description: dbItem.description,
    modelNumber: dbItem.model_number,
    manufacturer: dbItem.manufacturer,
    quantityOrdered: parseFloat(dbItem.quantity_ordered || 0),
    quantityReceived: parseFloat(dbItem.quantity_received || 0),
    unit: dbItem.unit || 'Stk',
    matchedProjectItemId: dbItem.matched_project_item_id,
    aiMatched: dbItem.ai_matched || false,
    aiConfidence: dbItem.ai_confidence ? parseFloat(dbItem.ai_confidence) : undefined,
    status: dbItem.status,
    notes: dbItem.notes,
    createdAt: dbItem.created_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapGoodsReceiptFromDB(dbReceipt: Record<string, any>): GoodsReceipt {
  return {
    id: dbReceipt.id,
    projectId: dbReceipt.project_id,
    deliveryNoteId: dbReceipt.delivery_note_id,
    userId: dbReceipt.user_id,
    receiptDate: dbReceipt.receipt_date,
    receiptType: dbReceipt.receipt_type,
    status: dbReceipt.status,
    notes: dbReceipt.notes,
    createdAt: dbReceipt.created_at,
    updatedAt: dbReceipt.updated_at,
    items: (dbReceipt.goods_receipt_items || []).map(mapGoodsReceiptItemFromDB),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapGoodsReceiptItemFromDB(dbItem: Record<string, any>): GoodsReceiptItem {
  return {
    id: dbItem.id,
    goodsReceiptId: dbItem.goods_receipt_id,
    projectItemId: dbItem.project_item_id,
    deliveryNoteItemId: dbItem.delivery_note_item_id,
    quantityReceived: parseFloat(dbItem.quantity_received || 0),
    quantityExpected: parseFloat(dbItem.quantity_expected || 0),
    status: dbItem.status,
    notes: dbItem.notes,
    createdAt: dbItem.created_at,
  }
}

// ============================================
// KUNDEN-LIEFERSCHEIN SERVICES
// ============================================

export async function getCustomerDeliveryNotes(
  projectId?: string
): Promise<CustomerDeliveryNote[]> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      logger.warn('getCustomerDeliveryNotes: No user authenticated', { component: 'delivery' })
      return []
    }

    let query = supabase
      .from('customer_delivery_notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query

    if (error) {
      const errObj = error as Error & { code?: string; details?: string; hint?: string }
      logger.error('getCustomerDeliveryNotes error', {
        component: 'delivery',
        message: errObj.message,
        code: errObj.code,
        details: errObj.details,
        hint: errObj.hint,
      })
      // Wenn Tabelle nicht existiert, gib leeres Array zurück
      if (errObj.code === '42P01' || errObj.message?.includes('does not exist')) {
        logger.warn('customer_delivery_notes table does not exist yet. Please run the SQL script.', { component: 'delivery' })
        return []
      }
      return []
    }

    return (data || []).map(mapCustomerDeliveryNoteFromDB)
  } catch (error: unknown) {
    // Ignore aborted requests (normal during page navigation)
    const err = error as { message?: string; name?: string; stack?: string }
    if (err?.message?.includes('aborted') || err?.name === 'AbortError') {
      return []
    }
    logger.error('getCustomerDeliveryNotes failed', {
      component: 'delivery',
      message: err?.message,
      stack: err?.stack,
    })
    return []
  }
}

export async function getCustomerDeliveryNote(id: string): Promise<CustomerDeliveryNote | null> {
  try {
    const user = await getCurrentUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('customer_delivery_notes')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      logger.error('getCustomerDeliveryNote error', { component: 'delivery' }, error as Error)
      return null
    }

    return mapCustomerDeliveryNoteFromDB(data)
  } catch (error) {
    logger.error('getCustomerDeliveryNote failed', { component: 'delivery' }, error as Error)
    return null
  }
}

export async function createCustomerDeliveryNote(
  deliveryNote: Omit<CustomerDeliveryNote, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
): Promise<CustomerDeliveryNote> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  try {
    const { data, error } = await supabase
      .from('customer_delivery_notes')
      .insert({
        user_id: user.id,
        project_id: deliveryNote.projectId,
        delivery_note_number: deliveryNote.deliveryNoteNumber,
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
          'Die Tabelle customer_delivery_notes existiert noch nicht. Bitte führen Sie das SQL-Script in Supabase aus.'
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
  updates: Partial<CustomerDeliveryNote>
): Promise<CustomerDeliveryNote> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {}

  if (updates.deliveryNoteNumber !== undefined)
    updateData.delivery_note_number = updates.deliveryNoteNumber
  if (updates.deliveryDate !== undefined) updateData.delivery_date = updates.deliveryDate
  if (updates.deliveryAddress !== undefined) updateData.delivery_address = updates.deliveryAddress
  if (updates.items !== undefined) updateData.items = updates.items
  if (updates.status !== undefined) updateData.status = updates.status
  if (updates.customerSignature !== undefined)
    updateData.customer_signature = updates.customerSignature
  if (updates.customerSignatureDate !== undefined)
    updateData.customer_signature_date = updates.customerSignatureDate
  if (updates.signedBy !== undefined) updateData.signed_by = updates.signedBy
  if (updates.notes !== undefined) updateData.notes = updates.notes

  updateData.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('customer_delivery_notes')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw error

  return mapCustomerDeliveryNoteFromDB(data)
}

export async function addCustomerSignature(
  deliveryNoteId: string,
  signature: string,
  signedBy: string
): Promise<CustomerDeliveryNote> {
  return await updateCustomerDeliveryNote(deliveryNoteId, {
    customerSignature: signature,
    customerSignatureDate: new Date().toISOString().split('T')[0],
    signedBy: signedBy,
    status: 'signed',
  })
}

export async function deleteDeliveryNote(id: string): Promise<void> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  // Hole den Lieferschein vor dem Löschen für Audit-Log
  const deliveryNote = await getDeliveryNote(id)
  if (!deliveryNote) {
    throw new Error('Lieferschein nicht gefunden')
  }

  // Lösche zuerst die Items (falls Foreign Key nicht CASCADE ist)
  const { error: itemsError } = await supabase
    .from('delivery_note_items')
    .delete()
    .eq('delivery_note_id', id)

  if (itemsError) {
    logger.warn('Fehler beim Löschen der Items (möglicherweise CASCADE)', { component: 'delivery' }, itemsError as Error)
    // Nicht abbrechen, versuche Lieferschein trotzdem zu löschen
  }

  // Lösche den Lieferschein
  const { error } = await supabase
    .from('delivery_notes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    logger.error('Fehler beim Löschen des Lieferscheins', { component: 'delivery' }, error as Error)
    throw error
  }

  // Audit-Logging wird in der API-Route gemacht (server-seitig)
}

export async function deleteCustomerDeliveryNote(id: string): Promise<void> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  // Hole den Lieferschein vor dem Löschen für Audit-Log
  const deliveryNote = await getCustomerDeliveryNote(id)
  if (!deliveryNote) {
    throw new Error('Kunden-Lieferschein nicht gefunden')
  }

  // Lösche den Kunden-Lieferschein
  const { error } = await supabase
    .from('customer_delivery_notes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    logger.error('Fehler beim Löschen des Kunden-Lieferscheins', { component: 'delivery' }, error as Error)
    throw error
  }

  // Audit-Logging wird in der API-Route gemacht (server-seitig)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCustomerDeliveryNoteFromDB(dbNote: Record<string, any>): CustomerDeliveryNote {
  return {
    id: dbNote.id,
    projectId: dbNote.project_id,
    userId: dbNote.user_id,
    deliveryNoteNumber: dbNote.delivery_note_number,
    deliveryDate: dbNote.delivery_date,
    deliveryAddress: dbNote.delivery_address,
    status: dbNote.status,
    customerSignature: dbNote.customer_signature,
    customerSignatureDate: dbNote.customer_signature_date,
    signedBy: dbNote.signed_by,
    items: dbNote.items || undefined,
    notes: dbNote.notes,
    createdAt: dbNote.created_at,
    updatedAt: dbNote.updated_at,
  }
}
