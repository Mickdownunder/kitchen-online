import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { apiErrors } from '@/lib/utils/errorHandling'
import { logger } from '@/lib/utils/logger'
import {
  computeInboundDedupeKey,
  sanitizeInboundFileName,
  sha256HexFromBuffer,
} from '@/lib/inbound/encoding'
import {
  INBOUND_ALLOWED_ATTACHMENT_MIME_TYPES,
  INBOUND_MAX_ATTACHMENT_SIZE_BYTES,
} from '@/lib/inbound/constants'
import { normalizeInboundPayload } from '@/lib/inbound/normalizePayload'
import { verifyInboundWebhookAuth, verifyOptionalResendSignature } from '@/lib/inbound/security'
import { hydrateResendPayloadIfNeeded } from '@/lib/inbound/resend'
import {
  insertInboundEvent,
  insertInboundInboxItem,
  resolveInboundRecipientContext,
} from '@/lib/inbound/repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function inferMimeType(fileName: string, rawMimeType: string | null): string | null {
  if (rawMimeType && rawMimeType.trim()) {
    return rawMimeType.toLowerCase()
  }

  const lowered = fileName.toLowerCase()
  if (lowered.endsWith('.pdf')) return 'application/pdf'
  if (lowered.endsWith('.png')) return 'image/png'
  if (lowered.endsWith('.jpg') || lowered.endsWith('.jpeg')) return 'image/jpeg'
  if (lowered.endsWith('.webp')) return 'image/webp'
  return null
}

export async function POST(request: NextRequest) {
  try {
    const querySecret = request.nextUrl.searchParams.get('secret')
    if (!verifyInboundWebhookAuth(request.headers, querySecret)) {
      return apiErrors.unauthorized({ component: 'api/inbound/email/webhook' })
    }

    const rawBody = await request.text()

    if (!verifyOptionalResendSignature(rawBody, request.headers)) {
      return apiErrors.forbidden({ component: 'api/inbound/email/webhook', reason: 'signature_invalid' })
    }

    let payload: unknown
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return apiErrors.badRequest({ component: 'api/inbound/email/webhook', reason: 'invalid_json' })
    }

    const hydratedPayload = await hydrateResendPayloadIfNeeded(payload)
    const normalized = normalizeInboundPayload(hydratedPayload)
    if (!normalized) {
      return NextResponse.json(
        {
          success: false,
          error: 'Keine verarbeitbaren Anhänge im Inbound-Payload gefunden.',
        },
        { status: 400 },
      )
    }

    const supabase = await createServiceClient()

    const recipientContext = await resolveInboundRecipientContext(supabase, normalized.to)
    if (!recipientContext) {
      logger.warn('Inbound document skipped because no recipient mapping exists', {
        component: 'api/inbound/email/webhook',
        recipients: normalized.to,
        messageId: normalized.messageId,
      })

      return NextResponse.json({
        success: true,
        received: 0,
        skipped: normalized.attachments.length,
        duplicates: 0,
        message: 'Empfänger konnte keiner Firma zugeordnet werden.',
      })
    }

    const now = new Date()
    const basePath = `inbound-documents/${recipientContext.userId}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${normalized.messageId}`

    let received = 0
    let skipped = 0
    let duplicates = 0

    for (const attachment of normalized.attachments) {
      const fileBuffer = Buffer.from(attachment.contentBase64, 'base64')
      const fileSize = attachment.size ?? fileBuffer.length
      const fileName = sanitizeInboundFileName(attachment.fileName)
      const mimeType = inferMimeType(fileName, attachment.mimeType)

      if (!fileBuffer.length || fileSize <= 0 || fileSize > INBOUND_MAX_ATTACHMENT_SIZE_BYTES) {
        skipped += 1
        continue
      }

      if (!mimeType || !INBOUND_ALLOWED_ATTACHMENT_MIME_TYPES.has(mimeType)) {
        skipped += 1
        continue
      }

      const contentSha256 = sha256HexFromBuffer(fileBuffer)
      const dedupeKey = computeInboundDedupeKey({
        userId: recipientContext.userId,
        messageId: normalized.messageId,
        attachmentId: attachment.externalId,
        contentSha256,
      })

      const storagePath = `${basePath}/${attachment.externalId}_${Date.now()}_${fileName}`

      const { error: uploadError } = await supabase.storage.from('documents').upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      })

      if (uploadError) {
        logger.error('Inbound document upload failed', { component: 'api/inbound/email/webhook' }, uploadError as Error)
        skipped += 1
        continue
      }

      const insertResult = await insertInboundInboxItem(supabase, {
        userId: recipientContext.userId,
        companyId: recipientContext.companyId,
        sourceProvider: normalized.provider,
        sourceMessageId: normalized.messageId,
        sourceAttachmentId: attachment.externalId,
        dedupeKey,
        senderEmail: normalized.fromEmail,
        senderName: normalized.fromName,
        recipientEmail: normalized.to[0] || null,
        subject: normalized.subject,
        receivedAt: normalized.receivedAt,
        storagePath,
        fileName,
        mimeType,
        fileSize,
        contentSha256,
        extractedPayload: {
          emailText: normalized.text,
          emailHtml: normalized.html,
          source: {
            provider: normalized.provider,
            fromEmail: normalized.fromEmail,
            fromName: normalized.fromName,
            to: normalized.to,
          },
        },
      })

      if (!insertResult.inserted) {
        await supabase.storage.from('documents').remove([storagePath])
        duplicates += 1
        continue
      }

      await insertInboundEvent({
        supabase,
        inboxItemId: insertResult.row.id,
        userId: recipientContext.userId,
        eventType: 'received',
        toStatus: 'received',
        payload: {
          provider: normalized.provider,
          messageId: normalized.messageId,
          attachmentId: attachment.externalId,
        },
      })

      received += 1
    }

    return NextResponse.json({
      success: true,
      received,
      skipped,
      duplicates,
    })
  } catch (error) {
    return apiErrors.internal(error as Error, { component: 'api/inbound/email/webhook' })
  }
}
