import type { Database } from '@/types/database.types'
import type { VoiceInboxEntry, VoiceInboxStatus } from '@/types'
import { fail, ok, type ServiceResult } from '@/lib/types/service'
import type { VoiceDbClient } from './types'

type VoiceInboxRow = Database['public']['Tables']['voice_inbox_entries']['Row']
type VoiceInboxUpdate = Database['public']['Tables']['voice_inbox_entries']['Update']

function mapVoiceInboxEntry(row: VoiceInboxRow): VoiceInboxEntry {
  return {
    id: row.id,
    companyId: row.company_id,
    userId: row.user_id,
    tokenId: row.token_id || undefined,
    source: row.source,
    locale: row.locale || undefined,
    idempotencyKey: row.idempotency_key,
    inputText: row.input_text,
    contextHints:
      row.context_hints && typeof row.context_hints === 'object' && !Array.isArray(row.context_hints)
        ? (row.context_hints as Record<string, unknown>)
        : {},
    status: row.status as VoiceInboxStatus,
    intentVersion: row.intent_version,
    intentPayload:
      row.intent_payload && typeof row.intent_payload === 'object' && !Array.isArray(row.intent_payload)
        ? (row.intent_payload as unknown as VoiceInboxEntry['intentPayload'])
        : undefined,
    confidence: typeof row.confidence === 'number' ? row.confidence : undefined,
    executionAction: row.execution_action || undefined,
    executionResult:
      row.execution_result && typeof row.execution_result === 'object' && !Array.isArray(row.execution_result)
        ? (row.execution_result as Record<string, unknown>)
        : undefined,
    errorMessage: row.error_message || undefined,
    needsConfirmationReason: row.needs_confirmation_reason || undefined,
    executionAttempts: row.execution_attempts,
    lastExecutedAt: row.last_executed_at || undefined,
    executedTaskId: row.executed_task_id || undefined,
    executedAppointmentId: row.executed_appointment_id || undefined,
    confirmedByUserId: row.confirmed_by_user_id || undefined,
    confirmedAt: row.confirmed_at || undefined,
    discardedByUserId: row.discarded_by_user_id || undefined,
    discardedAt: row.discarded_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

interface CreateVoiceInboxEntryInput {
  companyId: string
  userId: string
  tokenId?: string
  source: string
  locale?: string
  idempotencyKey: string
  inputText: string
  contextHints?: Record<string, unknown>
}

export async function createOrGetVoiceInboxEntry(
  client: VoiceDbClient,
  input: CreateVoiceInboxEntryInput,
): Promise<ServiceResult<{ entry: VoiceInboxEntry; created: boolean }>> {
  const { data, error } = await client
    .from('voice_inbox_entries')
    .insert({
      company_id: input.companyId,
      user_id: input.userId,
      token_id: input.tokenId || null,
      source: input.source,
      locale: input.locale || null,
      idempotency_key: input.idempotencyKey,
      input_text: input.inputText,
      context_hints: (input.contextHints || {}) as Database['public']['Tables']['voice_inbox_entries']['Insert']['context_hints'],
      status: 'captured',
    })
    .select('*')
    .single()

  if (!error) {
    return ok({
      entry: mapVoiceInboxEntry(data),
      created: true,
    })
  }

  const errorCode = (error as { code?: string }).code
  if (errorCode !== '23505') {
    return fail('INTERNAL', error.message || 'Voice Inbox konnte nicht geschrieben werden.', error)
  }

  const { data: existing, error: existingError } = await client
    .from('voice_inbox_entries')
    .select('*')
    .eq('company_id', input.companyId)
    .eq('idempotency_key', input.idempotencyKey)
    .maybeSingle()

  if (existingError || !existing) {
    return fail(
      'INTERNAL',
      existingError?.message || 'Idempotenter Voice Inbox Eintrag konnte nicht geladen werden.',
      existingError || error,
    )
  }

  return ok({
    entry: mapVoiceInboxEntry(existing),
    created: false,
  })
}

export async function updateVoiceInboxEntry(
  client: VoiceDbClient,
  companyId: string,
  entryId: string,
  updates: VoiceInboxUpdate,
): Promise<ServiceResult<VoiceInboxEntry>> {
  const { data, error } = await client
    .from('voice_inbox_entries')
    .update(updates)
    .eq('id', entryId)
    .eq('company_id', companyId)
    .select('*')
    .single()

  if (error) {
    const code = (error as { code?: string }).code
    if (code === 'PGRST116') {
      return fail('NOT_FOUND', 'Voice Inbox Eintrag wurde nicht gefunden.')
    }
    return fail('INTERNAL', error.message || 'Voice Inbox konnte nicht aktualisiert werden.', error)
  }

  return ok(mapVoiceInboxEntry(data))
}

export async function getVoiceInboxEntryById(
  client: VoiceDbClient,
  companyId: string,
  entryId: string,
): Promise<ServiceResult<VoiceInboxEntry>> {
  const { data, error } = await client
    .from('voice_inbox_entries')
    .select('*')
    .eq('id', entryId)
    .eq('company_id', companyId)
    .maybeSingle()

  if (error) {
    return fail('INTERNAL', error.message || 'Voice Inbox konnte nicht geladen werden.', error)
  }

  if (!data) {
    return fail('NOT_FOUND', 'Voice Inbox Eintrag wurde nicht gefunden.')
  }

  return ok(mapVoiceInboxEntry(data))
}

export async function listVoiceInboxEntries(
  client: VoiceDbClient,
  companyId: string,
  input: { statuses?: VoiceInboxStatus[]; limit?: number } = {},
): Promise<ServiceResult<VoiceInboxEntry[]>> {
  const limit = Number.isFinite(input.limit) ? Math.max(1, Math.min(200, input.limit || 50)) : 50

  let query = client
    .from('voice_inbox_entries')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (input.statuses && input.statuses.length > 0) {
    query = query.in('status', input.statuses)
  }

  const { data, error } = await query
  if (error) {
    return fail('INTERNAL', error.message || 'Voice Inbox konnte nicht geladen werden.', error)
  }

  return ok((data || []).map(mapVoiceInboxEntry))
}
