import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from './email'
import type { Database, Json } from '@/types/database.types'

type DbClient = SupabaseClient<Database>

type EmailOutboxStatus = 'queued' | 'processing' | 'sent' | 'failed'

interface EmailOutboxAttachment {
  filename: string
  content: string
  contentType?: string
}

export interface OutboxEmailPayload {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  attachments?: EmailOutboxAttachment[]
  from?: string
  fromName?: string
  replyTo?: string
}

interface QueueAndSendEmailOutboxInput {
  supabase: DbClient
  userId: string
  kind: string
  dedupeKey?: string | null
  payload: OutboxEmailPayload
  metadata?: Json
}

export interface QueueAndSendEmailOutboxResult {
  outboxId: string
  alreadySent: boolean
  sentAt: string
  providerMessageId: string | null
}

interface EmailOutboxRow {
  id: string
  user_id: string
  kind: string
  dedupe_key: string | null
  status: string
  attempts: number
  last_error: string | null
  provider_message_id: string | null
  processing_started_at: string | null
  sent_at: string | null
  payload: Json
  metadata: Json
}

interface OutboxErrorLike extends Error {
  code?: string
  details?: string
  hint?: string
}

interface SupabaseErrorLike {
  message: string
  code?: string
  details?: string
  hint?: string
}

export const EMAIL_OUTBOX_MIGRATION_HINT =
  'E-Mail-Outbox fehlt. Bitte Migration ausführen: 20260212150000_email_outbox.sql ' +
  '(z. B. mit `pnpm --filter @kitchen/db migrate`).'

function toOutboxError(error: SupabaseErrorLike): OutboxErrorLike {
  const next = new Error(error.message) as OutboxErrorLike
  if (error.code) {
    next.code = error.code
  }
  if (error.details) {
    next.details = error.details
  }
  if (error.hint) {
    next.hint = error.hint
  }
  return next
}

export function isEmailOutboxSchemaMissing(error: unknown): boolean {
  const err = (error || {}) as { code?: string; message?: string; details?: string; hint?: string }
  const code = String(err.code || '').toUpperCase()
  const blob = [err.message, err.details, err.hint].filter(Boolean).join(' ').toLowerCase()

  if (code === '42P01' || code === 'PGRST204' || code === 'PGRST205') {
    return blob.includes('email_outbox') || code === '42P01'
  }

  return blob.includes('email_outbox') && (blob.includes('does not exist') || blob.includes('could not find'))
}

function toMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error || 'unknown error')
}

function toPayloadJson(payload: OutboxEmailPayload): Json {
  return {
    to: Array.isArray(payload.to) ? payload.to : [payload.to],
    subject: payload.subject,
    html: payload.html || null,
    text: payload.text || null,
    attachments: (payload.attachments || []).map((attachment) => ({
      filename: attachment.filename,
      content: attachment.content,
      contentType: attachment.contentType || null,
    })),
    from: payload.from || null,
    fromName: payload.fromName || null,
    replyTo: payload.replyTo || null,
  } as Json
}

function fromPayloadJson(payload: Json): OutboxEmailPayload {
  const normalized = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
  const toValue = normalized.to
  const recipients = Array.isArray(toValue) ? toValue.map((entry) => String(entry || '').trim()).filter(Boolean) : []
  const attachmentsValue = normalized.attachments
  const attachments = Array.isArray(attachmentsValue)
    ? attachmentsValue
        .map((entry) => {
          if (!entry || typeof entry !== 'object') {
            return null
          }
          const record = entry as Record<string, unknown>
          const filename = String(record.filename || '').trim()
          const content = String(record.content || '').trim()
          if (!filename || !content) {
            return null
          }
          return {
            filename,
            content,
            contentType: record.contentType ? String(record.contentType) : undefined,
          } as EmailOutboxAttachment
        })
        .filter((entry): entry is EmailOutboxAttachment => Boolean(entry))
    : []

  return {
    to: recipients,
    subject: String(normalized.subject || ''),
    html: normalized.html ? String(normalized.html) : undefined,
    text: normalized.text ? String(normalized.text) : undefined,
    attachments,
    from: normalized.from ? String(normalized.from) : undefined,
    fromName: normalized.fromName ? String(normalized.fromName) : undefined,
    replyTo: normalized.replyTo ? String(normalized.replyTo) : undefined,
  }
}

async function loadOutboxByDedupeKey(
  supabase: DbClient,
  dedupeKey: string,
): Promise<EmailOutboxRow | null> {
  const { data, error } = await supabase
    .from('email_outbox')
    .select(
      'id, user_id, kind, dedupe_key, status, attempts, last_error, provider_message_id, processing_started_at, sent_at, payload, metadata',
    )
    .eq('dedupe_key', dedupeKey)
    .maybeSingle()

  if (error) {
    throw toOutboxError(error as SupabaseErrorLike)
  }

  return (data as EmailOutboxRow | null) || null
}

async function loadOutboxById(
  supabase: DbClient,
  id: string,
): Promise<EmailOutboxRow | null> {
  const { data, error } = await supabase
    .from('email_outbox')
    .select(
      'id, user_id, kind, dedupe_key, status, attempts, last_error, provider_message_id, processing_started_at, sent_at, payload, metadata',
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw toOutboxError(error as SupabaseErrorLike)
  }

  return (data as EmailOutboxRow | null) || null
}

async function updateOutboxStatus(
  supabase: DbClient,
  id: string,
  updates: Partial<{
    status: EmailOutboxStatus
    attempts: number
    last_error: string | null
    processing_started_at: string | null
    sent_at: string | null
    provider_message_id: string | null
  }>,
): Promise<void> {
  const { error } = await supabase
    .from('email_outbox')
    .update(updates)
    .eq('id', id)

  if (error) {
    throw toOutboxError(error as SupabaseErrorLike)
  }
}

async function dispatchExistingOutboxRow(input: {
  supabase: DbClient
  row: EmailOutboxRow
  payload?: OutboxEmailPayload
  metadata?: Json
}): Promise<QueueAndSendEmailOutboxResult> {
  const nowIso = new Date().toISOString()
  if (input.row.status === 'sent') {
    return {
      outboxId: input.row.id,
      alreadySent: true,
      sentAt: input.row.sent_at || nowIso,
      providerMessageId: input.row.provider_message_id || null,
    }
  }

  const payloadJson = toPayloadJson(input.payload || fromPayloadJson(input.row.payload))
  const nextAttempts = Math.max(0, Number(input.row.attempts || 0)) + 1

  const { data: claimedData, error: claimError } = await input.supabase
    .from('email_outbox')
    .update({
      status: 'processing',
      attempts: nextAttempts,
      last_error: null,
      processing_started_at: nowIso,
      payload: payloadJson,
      metadata: input.metadata || input.row.metadata || ({} as Json),
    })
    .eq('id', input.row.id)
    .in('status', ['queued', 'failed'])
    .select(
      'id, user_id, kind, dedupe_key, status, attempts, last_error, provider_message_id, processing_started_at, sent_at, payload, metadata',
    )
    .maybeSingle()

  if (claimError) {
    throw toOutboxError(claimError as SupabaseErrorLike)
  }

  if (!claimedData) {
    const latest = await loadOutboxById(input.supabase, input.row.id)
    if (latest?.status === 'sent') {
      return {
        outboxId: latest.id,
        alreadySent: true,
        sentAt: latest.sent_at || nowIso,
        providerMessageId: latest.provider_message_id || null,
      }
    }
    throw new Error('Outbox-Eintrag wird bereits verarbeitet.')
  }

  const claimedRow = claimedData as EmailOutboxRow
  try {
    const providerMessageId = await sendEmail(fromPayloadJson(claimedRow.payload))
    const sentAt = new Date().toISOString()

    await updateOutboxStatus(input.supabase, claimedRow.id, {
      status: 'sent',
      sent_at: sentAt,
      provider_message_id: providerMessageId,
      processing_started_at: null,
      last_error: null,
    })

    return {
      outboxId: claimedRow.id,
      alreadySent: false,
      sentAt,
      providerMessageId,
    }
  } catch (error) {
    await updateOutboxStatus(input.supabase, claimedRow.id, {
      status: 'failed',
      processing_started_at: null,
      last_error: toMessage(error),
    })
    throw error
  }
}

export async function queueAndSendEmailOutbox(
  input: QueueAndSendEmailOutboxInput,
): Promise<QueueAndSendEmailOutboxResult> {
  const normalizedDedupeKey = (input.dedupeKey || '').trim() || null
  const payloadJson = toPayloadJson(input.payload)

  let row: EmailOutboxRow | null = null

  if (normalizedDedupeKey) {
    row = await loadOutboxByDedupeKey(input.supabase, normalizedDedupeKey)
  }

  if (!row) {
    const { data, error } = await input.supabase
      .from('email_outbox')
      .insert({
        user_id: input.userId,
        kind: input.kind,
        dedupe_key: normalizedDedupeKey,
        status: 'queued',
        attempts: 0,
        payload: payloadJson,
        metadata: input.metadata || ({} as Json),
      })
      .select(
        'id, user_id, kind, dedupe_key, status, attempts, last_error, provider_message_id, processing_started_at, sent_at, payload, metadata',
      )
      .single()

    if (error) {
      const code = (error as { code?: string }).code
      if (code === '23505' && normalizedDedupeKey) {
        row = await loadOutboxByDedupeKey(input.supabase, normalizedDedupeKey)
      } else {
        throw toOutboxError(error as SupabaseErrorLike)
      }
    } else {
      row = data as EmailOutboxRow
    }
  }

  if (!row?.id) {
    throw new Error('Outbox-Eintrag konnte nicht erstellt werden.')
  }

  return dispatchExistingOutboxRow({
    supabase: input.supabase,
    row,
    payload: input.payload,
    metadata: input.metadata || row.metadata,
  })
}

export async function processEmailOutboxBatch(input: {
  supabase: DbClient
  limit?: number
}): Promise<{ processed: number; sent: number; failed: number }> {
  const limit = Math.min(100, Math.max(1, input.limit || 20))
  const { data, error } = await input.supabase
    .from('email_outbox')
    .select(
      'id, user_id, kind, dedupe_key, status, attempts, last_error, provider_message_id, processing_started_at, sent_at, payload, metadata',
    )
    .or('status.eq.queued,status.eq.failed')
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    throw toOutboxError(error as SupabaseErrorLike)
  }

  let processed = 0
  let sent = 0
  let failed = 0

  for (const row of (data || []) as EmailOutboxRow[]) {
    processed += 1
    try {
      await dispatchExistingOutboxRow({
        supabase: input.supabase,
        row,
      })
      sent += 1
    } catch {
      failed += 1
    }
  }

  return { processed, sent, failed }
}
