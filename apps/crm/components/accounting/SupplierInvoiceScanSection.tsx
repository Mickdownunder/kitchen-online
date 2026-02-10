import React from 'react'
import { AlertCircle, ExternalLink, FileCheck, Upload } from 'lucide-react'
import type { CreateSupplierInvoiceInput } from '@/lib/supabase/services/supplierInvoices'
import type { SupplierInvoice } from '@/types'
import type { ScanStatus } from '@/hooks/useSupplierInvoiceForm'

interface SupplierInvoiceScanSectionProps {
  formData: CreateSupplierInvoiceInput
  editingInvoice: SupplierInvoice | null
  scanStatus: ScanStatus
  scanError: string | null
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onDrop: (event: React.DragEvent) => void
  onDragOver: (event: React.DragEvent) => void
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void
}

export function SupplierInvoiceScanSection({
  formData,
  editingInvoice,
  scanStatus,
  scanError,
  fileInputRef,
  onDrop,
  onDragOver,
  onFileSelect,
}: SupplierInvoiceScanSectionProps) {
  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/80 p-6 transition-colors hover:border-amber-400 hover:bg-amber-50"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/jpeg,image/png,image/webp"
        onChange={onFileSelect}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="flex w-full flex-col items-center gap-3 py-4 text-left"
      >
        {scanStatus === 'uploading' || scanStatus === 'analyzing' ? (
          <>
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
            <span className="font-medium text-slate-700">
              {scanStatus === 'uploading' ? 'Wird hochgeladen…' : 'Rechnung wird ausgelesen…'}
            </span>
          </>
        ) : scanStatus === 'done' ? (
          <>
            <FileCheck className="h-12 w-12 text-emerald-500" />
            <span className="font-medium text-emerald-700">
              Felder wurden vorausgefüllt – bitte prüfen Sie die Daten unten.
            </span>
          </>
        ) : scanStatus === 'error' ? (
          <>
            <AlertCircle className="h-12 w-12 text-red-500" />
            <span className="font-medium text-red-700">{scanError}</span>
            <span className="text-sm text-slate-600">Klicken Sie hier, um es erneut zu versuchen.</span>
          </>
        ) : (
          <>
            <Upload className="h-12 w-12 text-amber-500" />
            <span className="text-lg font-bold text-slate-800">
              Rechnung hier ablegen oder Foto/PDF auswählen
            </span>
            <span className="text-sm text-slate-500">
              PDF oder Bild (JPG, PNG) – die KI füllt die Felder vor.
            </span>
          </>
        )}
      </button>
      {(formData.documentName || formData.documentUrl) && (
        <p className="mt-2 text-center text-sm text-slate-600">
          Beleg: <span className="font-medium">{formData.documentName || 'Datei'}</span>
          {editingInvoice?.id && editingInvoice.documentUrl && (
            <>
              {' · '}
              <a
                href={`/api/accounting/supplier-invoices/${editingInvoice.id}/document`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-amber-600 hover:underline"
              >
                Beleg anzeigen
                <ExternalLink className="h-3 w-3" />
              </a>
            </>
          )}
        </p>
      )}
    </div>
  )
}
