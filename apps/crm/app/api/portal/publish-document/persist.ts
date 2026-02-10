import { NextResponse } from 'next/server'
import { apiErrors } from '@/lib/utils/errorHandling'
import { logger } from '@/lib/utils/logger'
import type { PublishRequest } from './schema'
import { normalizeDocumentNameForDedup, sanitizeFileName } from './helpers'
import type { AuthorizationContext, RenderedDocument } from './types'

export async function persistDocument(
  request: PublishRequest,
  rendered: RenderedDocument,
  context: AuthorizationContext,
): Promise<NextResponse> {
  const expectedName = normalizeDocumentNameForDedup(rendered.fileName)

  const { data: existingDocs, error: existingDocsError } = await context.serviceClient
    .from('documents')
    .select('id, name')
    .eq('project_id', request.projectId)
    .eq('type', rendered.portalType)

  if (existingDocsError) {
    return apiErrors.internal(new Error(existingDocsError.message), {
      component: 'api/portal/publish-document',
      projectId: request.projectId,
    })
  }

  const existingMatch = (existingDocs || []).find(
    (doc) => normalizeDocumentNameForDedup(doc.name) === expectedName,
  )

  if (existingMatch) {
    logger.info('Document already exists - returning existing record', {
      component: 'api/portal/publish-document',
      projectId: request.projectId,
      existingDocumentId: existingMatch.id,
      existingDocumentName: existingMatch.name,
    })

    return NextResponse.json({
      success: true,
      documentId: existingMatch.id,
      type: rendered.portalType,
      name: existingMatch.name,
      alreadyExists: true,
    })
  }

  const timestamp = Date.now()
  const sanitizedName = sanitizeFileName(rendered.fileName)
  const storagePath = `${request.projectId}/${rendered.portalType}/${sanitizedName.replace('.pdf', '')}_${timestamp}.pdf`

  const { error: uploadError } = await context.serviceClient.storage
    .from('documents')
    .upload(storagePath, rendered.pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (uploadError) {
    return apiErrors.internal(uploadError as unknown as Error, {
      component: 'api/portal/publish-document',
      projectId: request.projectId,
    })
  }

  const { data: document, error: dbError } = await context.serviceClient
    .from('documents')
    .insert({
      project_id: request.projectId,
      user_id: context.user.id,
      type: rendered.portalType,
      name: rendered.fileName,
      file_path: storagePath,
      file_size: rendered.pdfBuffer.length,
      mime_type: 'application/pdf',
      uploaded_at: new Date().toISOString(),
      uploaded_by: context.user.id,
    })
    .select('id')
    .single()

  if (dbError) {
    await context.serviceClient.storage.from('documents').remove([storagePath])
    return apiErrors.internal(new Error(dbError.message), {
      component: 'api/portal/publish-document',
      projectId: request.projectId,
    })
  }

  return NextResponse.json({
    success: true,
    documentId: document.id,
    type: rendered.portalType,
    name: rendered.fileName,
  })
}
