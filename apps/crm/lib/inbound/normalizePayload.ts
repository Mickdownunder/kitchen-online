import { decodeBase64ToBuffer, normalizeEmail, sanitizeInboundFileName, sha256HexFromBuffer } from './encoding'
import type { NormalizedInboundAttachment, NormalizedInboundEmail } from './types'

interface LooseRecord {
  [key: string]: unknown
}

function toRecord(value: unknown): LooseRecord {
  if (!value || typeof value !== 'object') {
    return {}
  }
  return value as LooseRecord
}

function toString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => toString(entry))
      .filter((entry): entry is string => Boolean(entry))
  }

  const asSingle = toString(value)
  return asSingle ? [asSingle] : []
}

function parseFromField(value: string | null): { email: string | null; name: string | null } {
  if (!value) {
    return { email: null, name: null }
  }

  const withNameMatch = value.match(/^(.*)<([^>]+)>$/)
  if (withNameMatch) {
    return {
      name: withNameMatch[1]?.trim() || null,
      email: normalizeEmail(withNameMatch[2] || null),
    }
  }

  return {
    name: null,
    email: normalizeEmail(value),
  }
}

function normalizeAttachment(entry: unknown, index: number): NormalizedInboundAttachment | null {
  const record = toRecord(entry)

  const fileName =
    toString(record.filename) || toString(record.fileName) || toString(record.name) || `attachment-${index + 1}`

  const base64 =
    toString(record.content) || toString(record.content_base64) || toString(record.base64) || toString(record.data)

  if (!base64) {
    return null
  }

  const decoded = decodeBase64ToBuffer(base64)
  if (!decoded) {
    return null
  }

  const mimeType =
    toString(record.contentType) || toString(record.content_type) || toString(record.mimeType) || null

  const externalId =
    toString(record.id) || toString(record.attachmentId) || sha256HexFromBuffer(Buffer.from(`${fileName}:${index}`))

  const explicitSize = typeof record.size === 'number' && Number.isFinite(record.size) ? record.size : null

  return {
    externalId,
    fileName: sanitizeInboundFileName(fileName),
    mimeType,
    size: explicitSize ?? decoded.length,
    contentBase64: decoded.toString('base64'),
  }
}

function normalizeMessageId(raw: unknown): string {
  const fromBody =
    toString(raw) ||
    toString((raw as LooseRecord)?.messageId) ||
    toString((raw as LooseRecord)?.message_id) ||
    toString((raw as LooseRecord)?.id)

  if (fromBody) {
    return fromBody
  }

  return `inbound-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function normalizeInboundPayload(payload: unknown): NormalizedInboundEmail | null {
  const root = toRecord(payload)
  const nestedData = toRecord(root.data)

  const source = Object.keys(nestedData).length > 0 ? nestedData : root

  const messageId = normalizeMessageId(source.messageId || source.message_id || source.id)

  const rawFrom = toString(source.from) || toString(source.sender)
  const parsedFrom = parseFromField(rawFrom)

  const recipientList = [
    ...toStringArray(source.to),
    ...toStringArray(source.recipients),
    ...toStringArray(root.to),
  ]
    .map((entry) => parseFromField(entry).email)
    .filter((entry): entry is string => Boolean(entry))

  const attachmentSource = Array.isArray(source.attachments)
    ? source.attachments
    : Array.isArray(root.attachments)
      ? root.attachments
      : []

  const attachments = attachmentSource
    .map((entry, index) => normalizeAttachment(entry, index))
    .filter((entry): entry is NormalizedInboundAttachment => Boolean(entry))

  if (attachments.length === 0) {
    return null
  }

  const receivedAt =
    toString(source.receivedAt) ||
    toString(source.received_at) ||
    toString(source.created_at) ||
    new Date().toISOString()

  const subject = toString(source.subject) || '(ohne Betreff)'

  return {
    provider: root.type ? 'resend' : 'generic',
    messageId,
    fromEmail: parsedFrom.email,
    fromName: parsedFrom.name,
    to: Array.from(new Set(recipientList)),
    subject,
    text: toString(source.text) || toString(source.textBody) || null,
    html: toString(source.html) || toString(source.htmlBody) || null,
    receivedAt,
    attachments,
  }
}
