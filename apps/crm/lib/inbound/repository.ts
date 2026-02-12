import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database.types'
import type {
  InboundInboxItemPayload,
  InboundInboxRow,
  InboundRecipientContext,
  InboundProcessingStatus,
  SupplierOrderCandidate,
} from './types'
import type { SupplierOrderMatchRow } from './matching'

type DbClient = SupabaseClient<Database>

interface PostgrestErrorLike {
  code?: string
  message?: string
}

function asError(error: unknown): Error {
  if (error instanceof Error) {
    return error
  }
  return new Error(String(error || 'Unknown error'))
}

export async function resolveInboundRecipientContext(
  supabase: DbClient,
  recipients: string[],
): Promise<InboundRecipientContext | null> {
  const normalizedRecipients = recipients.map((entry) => entry.toLowerCase()).filter(Boolean)

  if (normalizedRecipients.length > 0) {
    const { data: companyRows, error: inboundError } = await supabase
      .from('company_settings')
      .select('id, user_id, inbound_email, inbound_email_ab, inbound_email_invoices, email')
      .not('user_id', 'is', null)

    if (inboundError) {
      throw asError(inboundError)
    }

    const inboundMatch = (companyRows || []).find((row) => {
      if (!row.user_id) {
        return false
      }

      const possibleInboundMails = [
        row.inbound_email_ab,
        row.inbound_email_invoices,
        row.inbound_email,
      ]
        .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : ''))
        .filter(Boolean)

      return possibleInboundMails.some((email) => normalizedRecipients.includes(email))
    })

    if (inboundMatch?.user_id) {
      return {
        userId: String(inboundMatch.user_id),
        companyId: inboundMatch.id,
      }
    }

    const mailboxMatch = (companyRows || []).find((row) => {
      if (!row.user_id || !row.email) {
        return false
      }
      return normalizedRecipients.includes(String(row.email).toLowerCase())
    })

    if (mailboxMatch?.user_id) {
      return {
        userId: String(mailboxMatch.user_id),
        companyId: mailboxMatch.id,
      }
    }
  }

  const fallbackUserId = process.env.INBOUND_DEFAULT_USER_ID?.trim()
  if (!fallbackUserId) {
    return null
  }

  const { data: fallbackCompany, error: fallbackError } = await supabase
    .from('company_settings')
    .select('id')
    .eq('user_id', fallbackUserId)
    .limit(1)
    .maybeSingle()

  if (fallbackError) {
    throw asError(fallbackError)
  }

  return {
    userId: fallbackUserId,
    companyId: fallbackCompany?.id || null,
  }
}

export async function insertInboundInboxItem(
  supabase: DbClient,
  payload: InboundInboxItemPayload,
): Promise<{ inserted: true; row: InboundInboxRow } | { inserted: false }> {
  const { data, error } = await supabase
    .from('inbound_document_inbox')
    .insert({
      user_id: payload.userId,
      company_id: payload.companyId,
      source_provider: payload.sourceProvider,
      source_message_id: payload.sourceMessageId,
      source_attachment_id: payload.sourceAttachmentId,
      dedupe_key: payload.dedupeKey,
      sender_email: payload.senderEmail,
      sender_name: payload.senderName,
      recipient_email: payload.recipientEmail,
      subject: payload.subject,
      received_at: payload.receivedAt,
      storage_path: payload.storagePath,
      file_name: payload.fileName,
      mime_type: payload.mimeType,
      file_size: payload.fileSize,
      content_sha256: payload.contentSha256,
      extracted_payload: payload.extractedPayload || ({} as Json),
    })
    .select('*')
    .single()

  if (error) {
    const maybe = error as PostgrestErrorLike
    if (maybe.code === '23505') {
      return { inserted: false }
    }
    throw asError(error)
  }

  return {
    inserted: true,
    row: data as InboundInboxRow,
  }
}

export async function insertInboundEvent(input: {
  supabase: DbClient
  inboxItemId: string
  userId: string
  eventType: string
  fromStatus?: InboundProcessingStatus | null
  toStatus?: InboundProcessingStatus | null
  payload?: Json
}): Promise<void> {
  const { error } = await input.supabase.from('inbound_document_events').insert({
    inbox_item_id: input.inboxItemId,
    user_id: input.userId,
    event_type: input.eventType,
    from_status: input.fromStatus || null,
    to_status: input.toStatus || null,
    payload: input.payload || ({} as Json),
  })

  if (error) {
    throw asError(error)
  }
}

export async function getPendingInboxItems(
  supabase: DbClient,
  limit: number,
): Promise<InboundInboxRow[]> {
  const { data, error } = await supabase
    .from('inbound_document_inbox')
    .select('*')
    .in('processing_status', ['received', 'classified'])
    .order('received_at', { ascending: true })
    .limit(limit)

  if (error) {
    throw asError(error)
  }

  return (data || []) as InboundInboxRow[]
}

export async function loadInboxItemByIdForUser(
  supabase: DbClient,
  id: string,
  userId: string,
): Promise<InboundInboxRow | null> {
  const { data, error } = await supabase
    .from('inbound_document_inbox')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw asError(error)
  }

  return (data as InboundInboxRow | null) || null
}

export async function updateInboxItem(
  supabase: DbClient,
  id: string,
  userId: string,
  updates: Partial<Database['public']['Tables']['inbound_document_inbox']['Update']>,
): Promise<InboundInboxRow> {
  const { data, error } = await supabase
    .from('inbound_document_inbox')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) {
    throw asError(error)
  }

  return data as InboundInboxRow
}

export async function listInboxItemsForUser(input: {
  supabase: DbClient
  userId: string
  limit: number
  kinds?: string[]
  statuses?: string[]
}): Promise<InboundInboxRow[]> {
  let query = input.supabase
    .from('inbound_document_inbox')
    .select('*')
    .eq('user_id', input.userId)
    .order('received_at', { ascending: false })
    .limit(input.limit)

  if (input.kinds && input.kinds.length > 0) {
    query = query.in('document_kind', input.kinds)
  }

  if (input.statuses && input.statuses.length > 0) {
    query = query.in('processing_status', input.statuses)
  }

  const { data, error } = await query
  if (error) {
    throw asError(error)
  }

  return (data || []) as InboundInboxRow[]
}

export async function loadSupplierOrderCandidates(
  supabase: DbClient,
  userId: string,
): Promise<SupplierOrderMatchRow[]> {
  const { data, error } = await supabase
    .from('supplier_orders')
    .select(
      'id, order_number, project_id, projects(order_number), suppliers(name, order_email, email)',
    )
    .eq('user_id', userId)

  if (error) {
    throw asError(error)
  }

  return (data || []).map((entry) => {
    const row = entry as {
      id: string
      order_number: string
      project_id: string
      projects: { order_number: string | null } | { order_number: string | null }[] | null
      suppliers:
        | { name: string | null; order_email: string | null; email: string | null }
        | { name: string | null; order_email: string | null; email: string | null }[]
        | null
    }

    const projectRelation = Array.isArray(row.projects) ? row.projects[0] : row.projects
    const supplierRelation = Array.isArray(row.suppliers) ? row.suppliers[0] : row.suppliers

    return {
      orderId: row.id,
      orderNumber: row.order_number,
      projectId: row.project_id,
      projectOrderNumber: projectRelation?.order_number || null,
      supplierName: supplierRelation?.name || null,
      supplierOrderEmail: supplierRelation?.order_email || null,
      supplierEmail: supplierRelation?.email || null,
    }
  })
}

export function mapCandidatesToJson(candidates: SupplierOrderCandidate[]): Json {
  return candidates.map((candidate) => ({
    orderId: candidate.orderId,
    orderNumber: candidate.orderNumber,
    projectId: candidate.projectId,
    projectOrderNumber: candidate.projectOrderNumber,
    supplierName: candidate.supplierName,
    score: candidate.score,
    reasons: candidate.reasons,
  })) as Json
}
