import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database.types'
import { logger } from '@/lib/utils/logger'
import { extractHeuristicSignals } from './classification'
import { extractSignalsWithAI } from './ai'
import { buildAssignmentDecision, type SupplierOrderMatchRow } from './matching'
import {
  getPendingInboxItems,
  insertInboundEvent,
  loadSupplierOrderCandidates,
  mapCandidatesToJson,
  updateInboxItem,
} from './repository'
import type { DocumentSignals, InboundInboxRow } from './types'
import { toInboundProcessingStatus } from './status'

type DbClient = SupabaseClient<Database>

function toJson(value: unknown): Json {
  return value as unknown as Json
}

function mergeSignals(heuristic: DocumentSignals, ai: DocumentSignals | null): DocumentSignals {
  if (!ai) {
    return heuristic
  }

  return {
    ...heuristic,
    ...ai,
    kind: ai.kind !== 'unknown' ? ai.kind : heuristic.kind,
    confidence: Math.max(heuristic.confidence, ai.confidence),
    orderNumbers: Array.from(new Set([...heuristic.orderNumbers, ...ai.orderNumbers])),
    projectOrderNumbers: Array.from(new Set([...heuristic.projectOrderNumbers, ...ai.projectOrderNumbers])),
    warnings: Array.from(new Set([...(heuristic.warnings || []), ...(ai.warnings || [])])),
    source: 'hybrid',
    raw: toJson({
      heuristic,
      ai: ai.raw || null,
    }),
  }
}

function toDocumentText(item: InboundInboxRow): string {
  const extracted = item.extracted_payload && typeof item.extracted_payload === 'object'
    ? (item.extracted_payload as Record<string, unknown>)
    : {}

  const textValue = typeof extracted.emailText === 'string' ? extracted.emailText : ''
  const htmlValue = typeof extracted.emailHtml === 'string' ? extracted.emailHtml : ''
  return `${textValue}\n${htmlValue}`.trim()
}

async function downloadAttachmentBase64(
  supabase: DbClient,
  storagePath: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage.from('documents').download(storagePath)
  if (error || !data) {
    return null
  }
  const buffer = Buffer.from(await data.arrayBuffer())
  if (buffer.length === 0) {
    return null
  }
  return buffer.toString('base64')
}

function normalizeMimeType(mimeType: string | null, fileName: string): string {
  if (mimeType && mimeType.trim()) {
    return mimeType
  }

  const lowered = fileName.toLowerCase()
  if (lowered.endsWith('.pdf')) return 'application/pdf'
  if (lowered.endsWith('.png')) return 'image/png'
  if (lowered.endsWith('.jpg') || lowered.endsWith('.jpeg')) return 'image/jpeg'
  if (lowered.endsWith('.webp')) return 'image/webp'
  return 'application/pdf'
}

async function processSingleItem(input: {
  supabase: DbClient
  item: InboundInboxRow
  candidateRows: SupplierOrderMatchRow[]
}): Promise<{ status: 'processed' | 'failed'; id: string }> {
  const item = input.item

  try {
    const documentText = toDocumentText(item)
    const heuristicSignals = extractHeuristicSignals({
      fileName: item.file_name,
      subject: item.subject || '',
      bodyText: documentText,
    })

    const attachmentBase64 = await downloadAttachmentBase64(input.supabase, item.storage_path)
    const aiSignals = attachmentBase64
      ? await extractSignalsWithAI({
          mimeType: normalizeMimeType(item.mime_type, item.file_name),
          base64Data: attachmentBase64,
          fileName: item.file_name,
          subject: item.subject || '',
          senderEmail: item.sender_email,
          bodyText: documentText,
        })
      : null

    const mergedSignals = mergeSignals(heuristicSignals, aiSignals)

    const decision = buildAssignmentDecision({
      signals: mergedSignals,
      senderEmail: item.sender_email,
      searchableText: `${item.subject || ''}\n${documentText}`,
      candidates: input.candidateRows,
    })

    const normalizedStatus =
      mergedSignals.kind === 'unknown' && decision.status === 'preassigned'
        ? 'needs_review'
        : decision.status

    const updatedRow = await updateInboxItem(input.supabase, item.id, item.user_id, {
      document_kind: mergedSignals.kind,
      processing_status: normalizedStatus,
      processing_error: null,
      extracted_payload: {
        ...(item.extracted_payload && typeof item.extracted_payload === 'object'
          ? (item.extracted_payload as Record<string, unknown>)
          : {}),
        signals: mergedSignals,
      } as unknown as Json,
      assignment_candidates: mapCandidatesToJson(decision.candidates),
      assignment_confidence: decision.confidence,
      assigned_supplier_order_id: decision.assignedSupplierOrderId || null,
      assigned_project_id: decision.assignedProjectId || null,
    })

    await insertInboundEvent({
      supabase: input.supabase,
      inboxItemId: updatedRow.id,
      userId: item.user_id,
      eventType: normalizedStatus === 'preassigned' ? 'preassigned' : 'needs_review',
      fromStatus: toInboundProcessingStatus(item.processing_status),
      toStatus: normalizedStatus,
      payload: {
        confidence: decision.confidence,
        kind: mergedSignals.kind,
      } as unknown as Json,
    })

    return { status: 'processed', id: item.id }
  } catch (error) {
    logger.error('Inbound item processing failed', { component: 'inbound-processor', inboxItemId: item.id }, error as Error)

    await updateInboxItem(input.supabase, item.id, item.user_id, {
      processing_status: 'failed',
      processing_error: error instanceof Error ? error.message : 'Unknown processing error',
    })

    await insertInboundEvent({
      supabase: input.supabase,
      inboxItemId: item.id,
      userId: item.user_id,
      eventType: 'failed',
      fromStatus: toInboundProcessingStatus(item.processing_status),
      toStatus: 'failed',
      payload: {
        message: error instanceof Error ? error.message : 'Unknown processing error',
      } as unknown as Json,
    })

    return { status: 'failed', id: item.id }
  }
}

export async function processInboundInboxBatch(input: {
  supabase: DbClient
  limit: number
}): Promise<{ processed: number; failed: number; total: number }> {
  const limit = Number.isFinite(input.limit) ? Math.max(1, Math.min(100, input.limit)) : 20
  const pendingItems = await getPendingInboxItems(input.supabase, limit)

  if (pendingItems.length === 0) {
    return {
      processed: 0,
      failed: 0,
      total: 0,
    }
  }

  const candidateCache = new Map<string, SupplierOrderMatchRow[]>()

  let processed = 0
  let failed = 0

  for (const item of pendingItems) {
    let candidateRows = candidateCache.get(item.user_id)
    if (!candidateRows) {
      candidateRows = await loadSupplierOrderCandidates(input.supabase, item.user_id)
      candidateCache.set(item.user_id, candidateRows)
    }

    const result = await processSingleItem({
      supabase: input.supabase,
      item,
      candidateRows,
    })

    if (result.status === 'processed') {
      processed += 1
    } else {
      failed += 1
    }
  }

  return {
    processed,
    failed,
    total: pendingItems.length,
  }
}
