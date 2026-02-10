import { NextResponse } from 'next/server'
import { apiErrors } from '@/lib/utils/errorHandling'
import { logger } from '@/lib/utils/logger'
import type { PublishRequest } from './schema'
import { sanitizeFileName } from './helpers'
import type { AuthorizationContext, RenderedDocument } from './types'

export async function persistDocument(
  request: PublishRequest,
  rendered: RenderedDocument,
  context: AuthorizationContext,
): Promise<NextResponse> {
  const baseFileName = rendered.fileName.replace('.pdf', '')

  const { data: existingDocs } = await context.serviceClient
    .from('documents')
    .select('id, name')
    .eq('project_id', request.projectId)
    .eq('type', rendered.portalType)
    .ilike('name', `${baseFileName}%`)

  if (existingDocs && existingDocs.length > 0) {
    logger.info('Document already exists - returning existing record', {
      component: 'api/portal/publish-document',
      projectId: request.projectId,
      existingDocumentId: existingDocs[0].id,
      existingDocumentName: existingDocs[0].name,
    })

    return NextResponse.json({
      success: true,
      documentId: existingDocs[0].id,
      type: rendered.portalType,
      name: existingDocs[0].name,
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
