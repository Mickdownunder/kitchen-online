import { NextResponse } from 'next/server'
import { validatePublishPayload } from './guards'
import { persistDocument } from './persist'
import { renderDocumentPdf } from './render'
import type { PublishRequest } from './schema'
import type { AuthorizationContext } from './types'

export async function publishDocument(
  payload: PublishRequest,
  authorization: AuthorizationContext,
): Promise<NextResponse> {
  const validationError = await validatePublishPayload(payload, authorization)
  if (validationError) {
    return validationError
  }

  const rendered = await renderDocumentPdf(payload)
  return persistDocument(payload, rendered, authorization)
}
