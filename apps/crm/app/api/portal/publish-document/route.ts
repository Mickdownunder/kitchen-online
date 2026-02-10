import { NextRequest, NextResponse } from 'next/server'
import { apiErrors } from '@/lib/utils/errorHandling'
import { authorizePublish } from './auth'
import { parsePublishRequest } from './request'
import { publishDocument } from './usecase'

export async function POST(request: NextRequest) {
  try {
    const payload = await parsePublishRequest(request)
    if (!payload) {
      return apiErrors.badRequest({ component: 'api/portal/publish-document' })
    }

    const authorization = await authorizePublish(payload.documentType, payload.projectId)
    if (authorization instanceof NextResponse) {
      return authorization
    }

    return publishDocument(payload, authorization)
  } catch (error: unknown) {
    return apiErrors.internal(error as Error, { component: 'api/portal/publish-document' })
  }
}
