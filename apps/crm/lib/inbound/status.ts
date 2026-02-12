import { INBOUND_ALLOWED_PROCESSING_STATUSES } from './constants'
import type { InboundProcessingStatus } from './types'

export function toInboundProcessingStatus(
  value: string | null | undefined,
): InboundProcessingStatus | null {
  if (!value) {
    return null
  }

  if (INBOUND_ALLOWED_PROCESSING_STATUSES.has(value as InboundProcessingStatus)) {
    return value as InboundProcessingStatus
  }

  return null
}
