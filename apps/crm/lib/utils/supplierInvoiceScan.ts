export const SUPPLIER_INVOICE_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

interface SupplierInvoiceDocumentUploadResult {
  documentUrl: string
  documentName: string
}

export interface SupplierInvoiceScanAnalysisResult {
  supplierName?: string
  supplierUid?: string | null
  invoiceNumber?: string
  invoiceDate?: string
  dueDate?: string | null
  netAmount?: number
  taxRate?: number
  category?: string
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.includes(',') ? result.split(',')[1] : result
      resolve(base64 || '')
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function uploadSupplierInvoiceDocument(file: File): Promise<SupplierInvoiceDocumentUploadResult> {
  const form = new FormData()
  form.append('file', file)

  const response = await fetch('/api/accounting/supplier-invoices/upload', {
    method: 'POST',
    body: form,
  })

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(errorBody.error || 'Hochladen fehlgeschlagen')
  }

  return response.json() as Promise<SupplierInvoiceDocumentUploadResult>
}

async function analyzeSupplierInvoiceDocument(
  file: File,
  onAnalyzeStart: () => void,
): Promise<SupplierInvoiceScanAnalysisResult> {
  onAnalyzeStart()
  const base64 = await fileToBase64(file)

  const response = await fetch('/api/accounting/supplier-invoices/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Data: base64, mimeType: file.type }),
  })

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(errorBody.error || 'Auslesen fehlgeschlagen')
  }

  return response.json() as Promise<SupplierInvoiceScanAnalysisResult>
}

export async function uploadAndAnalyzeSupplierInvoice(
  file: File,
  onAnalyzeStart: () => void,
): Promise<SupplierInvoiceDocumentUploadResult & SupplierInvoiceScanAnalysisResult> {
  const [uploadResult, analysisResult] = await Promise.all([
    uploadSupplierInvoiceDocument(file),
    analyzeSupplierInvoiceDocument(file, onAnalyzeStart),
  ])

  return {
    ...analysisResult,
    documentUrl: uploadResult.documentUrl,
    documentName: uploadResult.documentName,
  }
}
