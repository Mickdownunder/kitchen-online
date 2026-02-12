import crypto from 'crypto'

export function sanitizeInboundFileName(fileName: string): string {
  const normalized = fileName.trim() || 'document'
  return normalized.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export function stripDataUriPrefix(value: string): string {
  const trimmed = value.trim()
  const marker = ';base64,'
  const markerIndex = trimmed.indexOf(marker)
  if (trimmed.startsWith('data:') && markerIndex > -1) {
    return trimmed.slice(markerIndex + marker.length).trim()
  }
  return trimmed
}

export function decodeBase64ToBuffer(raw: string): Buffer | null {
  const normalized = stripDataUriPrefix(raw)
  if (!normalized) {
    return null
  }

  try {
    const buffer = Buffer.from(normalized, 'base64')
    if (!buffer.length) {
      return null
    }

    // Reject obvious non-base64 garbage.
    const reencoded = buffer.toString('base64').replace(/=+$/g, '')
    const input = normalized.replace(/\s+/g, '').replace(/=+$/g, '')
    if (!reencoded || reencoded.length < Math.min(8, input.length)) {
      return null
    }

    return buffer
  } catch {
    return null
  }
}

export function sha256HexFromBuffer(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

export function computeInboundDedupeKey(parts: {
  userId: string
  messageId: string
  attachmentId: string
  contentSha256: string
}): string {
  const seed = `${parts.userId}:${parts.messageId}:${parts.attachmentId}:${parts.contentSha256}`
  return sha256HexFromBuffer(Buffer.from(seed, 'utf8'))
}

export function normalizeEmail(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }
  const trimmed = value.trim().toLowerCase()
  return trimmed.length > 0 ? trimmed : null
}

export function extractEmailDomain(email: string | null | undefined): string | null {
  const normalized = normalizeEmail(email)
  if (!normalized) {
    return null
  }
  const atIndex = normalized.lastIndexOf('@')
  if (atIndex < 1 || atIndex === normalized.length - 1) {
    return null
  }
  return normalized.slice(atIndex + 1)
}
