interface LooseRecord {
  [key: string]: unknown
}

interface ResendAttachmentMeta {
  id: string
  file_name: string
  content_type: string | null
  size: number | null
  content: string
}

function toRecord(value: unknown): LooseRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
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

  const single = toString(value)
  return single ? [single] : []
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return null
}

function isResendReceivedEvent(payload: unknown): boolean {
  const root = toRecord(payload)
  return root.type === 'email.received' && typeof toRecord(root.data).email_id === 'string'
}

async function fetchResendJson(path: string, apiKey: string): Promise<LooseRecord> {
  const response = await fetch(`https://api.resend.com${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  })

  const json = (await response.json().catch(() => ({}))) as LooseRecord
  if (!response.ok) {
    const message = toString(json.message) || `Resend API error (${response.status})`
    throw new Error(message)
  }

  return json
}

async function fetchAttachmentBase64(downloadUrl: string, apiKey: string): Promise<string | null> {
  const response = await fetch(downloadUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  })

  if (!response.ok) {
    return null
  }

  const arrayBuffer = await response.arrayBuffer()
  if (arrayBuffer.byteLength === 0) {
    return null
  }

  return Buffer.from(arrayBuffer).toString('base64')
}

async function loadResendAttachments(emailId: string, apiKey: string): Promise<ResendAttachmentMeta[]> {
  const attachmentResponse = await fetchResendJson(`/emails/receiving/${emailId}/attachments`, apiKey)
  const rawList = Array.isArray(attachmentResponse.data)
    ? attachmentResponse.data
    : Array.isArray(attachmentResponse.attachments)
      ? attachmentResponse.attachments
      : []

  const result: ResendAttachmentMeta[] = []

  for (const rawAttachment of rawList) {
    const entry = toRecord(rawAttachment)

    const attachmentId = toString(entry.id)
    const fileName = toString(entry.file_name) || toString(entry.filename) || toString(entry.name)
    const contentType = toString(entry.content_type) || toString(entry.contentType)
    const size = toNumber(entry.size)
    const downloadUrl = toString(entry.download_url) || toString(entry.downloadUrl)

    if (!attachmentId || !fileName || !downloadUrl) {
      continue
    }

    const contentBase64 = await fetchAttachmentBase64(downloadUrl, apiKey)
    if (!contentBase64) {
      continue
    }

    result.push({
      id: attachmentId,
      file_name: fileName,
      content_type: contentType,
      size,
      content: contentBase64,
    })
  }

  return result
}

/**
 * Resend webhook payloads contain only metadata.
 * This helper hydrates full email body + attachments so downstream normalization can stay generic.
 */
export async function hydrateResendPayloadIfNeeded(payload: unknown): Promise<unknown> {
  if (!isResendReceivedEvent(payload)) {
    return payload
  }

  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('RESEND_API_KEY fehlt für Resend-Inbound-Verarbeitung.')
  }

  const root = toRecord(payload)
  const data = toRecord(root.data)
  const emailId = toString(data.email_id)
  if (!emailId) {
    return payload
  }

  const emailResponse = await fetchResendJson(`/emails/receiving/${emailId}`, apiKey)
  const emailData = toRecord(emailResponse.data)
  const attachments = await loadResendAttachments(emailId, apiKey)

  return {
    ...root,
    data: {
      id: emailId,
      message_id: toString(emailData.message_id) || toString(data.message_id) || emailId,
      from: toString(emailData.from) || toString(data.from),
      to: toStringArray(emailData.to).length > 0 ? toStringArray(emailData.to) : toStringArray(data.to),
      subject: toString(emailData.subject) || toString(data.subject) || '(ohne Betreff)',
      text: toString(emailData.text),
      html: toString(emailData.html),
      created_at: toString(emailData.created_at) || toString(data.created_at),
      attachments,
    },
  }
}

