import type {
  SupplierDocumentKind,
  SupplierOrderAbAnalysisResult,
  SupplierOrderDeliveryAnalysisResult,
} from './types'

export async function uploadSupplierOrderDocument(
  supplierOrderId: string,
  kind: SupplierDocumentKind,
  file: File,
): Promise<{ storagePath: string; fileName: string; mimeType: string | null }> {
  const formData = new FormData()
  formData.set('kind', kind)
  formData.set('file', file)

  const response = await fetch(`/api/supplier-orders/${supplierOrderId}/documents`, {
    method: 'POST',
    body: formData,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload?.success === false || !payload?.data?.storagePath) {
    throw new Error(payload?.error || 'Dokument konnte nicht hochgeladen werden.')
  }

  return {
    storagePath: String(payload.data.storagePath),
    fileName: String(payload.data.fileName || file.name || 'Dokument'),
    mimeType: payload.data.mimeType ? String(payload.data.mimeType) : null,
  }
}

export async function analyzeSupplierOrderDocument(
  supplierOrderId: string,
  kind: SupplierDocumentKind,
  file: File,
): Promise<SupplierOrderAbAnalysisResult | SupplierOrderDeliveryAnalysisResult> {
  const formData = new FormData()
  formData.set('kind', kind)
  formData.set('file', file)

  const response = await fetch(`/api/supplier-orders/${supplierOrderId}/document-analysis`, {
    method: 'POST',
    body: formData,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload?.success === false || !payload?.data?.kind) {
    throw new Error(payload?.error || 'Dokument konnte nicht analysiert werden.')
  }

  return payload.data as SupplierOrderAbAnalysisResult | SupplierOrderDeliveryAnalysisResult
}
