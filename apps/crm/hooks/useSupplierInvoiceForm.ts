'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type DragEvent,
  type FormEvent,
  type RefObject,
  type SetStateAction,
} from 'react'
import { SupplierInvoice, SupplierInvoiceCategory } from '@/types'
import {
  createSupplierInvoice,
  updateSupplierInvoice,
  type CreateSupplierInvoiceInput,
} from '@/lib/supabase/services/supplierInvoices'
import {
  calculateSkontoAmount,
  calculateSupplierInvoiceAmounts,
  type SupplierInvoiceAmounts,
} from '@/lib/utils/accountingAmounts'
import { roundTo2Decimals } from '@/lib/utils/priceCalculations'
import {
  SUPPLIER_INVOICE_ALLOWED_MIME_TYPES,
  uploadAndAnalyzeSupplierInvoice,
} from '@/lib/utils/supplierInvoiceScan'

function createDefaultFormData(): CreateSupplierInvoiceInput {
  return {
    supplierName: '',
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    netAmount: 0,
    taxRate: 20,
    category: 'material',
    projectId: undefined,
  }
}

export type ScanStatus = 'idle' | 'uploading' | 'analyzing' | 'done' | 'error'

export interface UseSupplierInvoiceFormOptions {
  onSaved: () => Promise<void>
}

export interface UseSupplierInvoiceFormResult {
  showForm: boolean
  setShowForm: Dispatch<SetStateAction<boolean>>
  editingInvoice: SupplierInvoice | null
  formData: CreateSupplierInvoiceInput
  setFormData: Dispatch<SetStateAction<CreateSupplierInvoiceInput>>
  saving: boolean
  scanStatus: ScanStatus
  scanError: string | null
  fileInputRef: RefObject<HTMLInputElement | null>
  calculatedAmounts: SupplierInvoiceAmounts
  resetForm: () => void
  closeForm: () => void
  openCreateForm: () => void
  openEditForm: (invoice: SupplierInvoice) => void
  handleSubmit: (event: FormEvent) => Promise<void>
  handleDrop: (event: DragEvent) => void
  handleFileSelect: (event: ChangeEvent<HTMLInputElement>) => void
}

export function useSupplierInvoiceForm({
  onSaved,
}: UseSupplierInvoiceFormOptions): UseSupplierInvoiceFormResult {
  const [showForm, setShowForm] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<SupplierInvoice | null>(null)
  const [formData, setFormData] = useState<CreateSupplierInvoiceInput>(createDefaultFormData)
  const [saving, setSaving] = useState(false)
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle')
  const [scanError, setScanError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const calculatedAmounts = useMemo(() => {
    return calculateSupplierInvoiceAmounts(formData.netAmount || 0, formData.taxRate || 20)
  }, [formData.netAmount, formData.taxRate])

  useEffect(() => {
    const skontoPercent = formData.skontoPercent
    if (skontoPercent == null || skontoPercent <= 0 || calculatedAmounts.grossAmount <= 0) {
      return
    }

    const nextSkontoAmount = calculateSkontoAmount(calculatedAmounts.grossAmount, skontoPercent)
    setFormData((previousData) =>
      previousData.skontoAmount === nextSkontoAmount
        ? previousData
        : { ...previousData, skontoAmount: nextSkontoAmount },
    )
  }, [calculatedAmounts.grossAmount, formData.skontoPercent])

  const resetForm = (): void => {
    setFormData(createDefaultFormData())
    setScanStatus('idle')
    setScanError(null)
  }

  const closeForm = (): void => {
    setShowForm(false)
    setEditingInvoice(null)
  }

  const openCreateForm = (): void => {
    resetForm()
    setEditingInvoice(null)
    setShowForm(true)
  }

  const openEditForm = (invoice: SupplierInvoice): void => {
    setEditingInvoice(invoice)
    setFormData({
      supplierName: invoice.supplierName,
      supplierUid: invoice.supplierUid,
      supplierAddress: invoice.supplierAddress,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      netAmount: invoice.netAmount,
      taxRate: invoice.taxRate,
      category: invoice.category,
      projectId: invoice.projectId,
      skontoPercent: invoice.skontoPercent,
      skontoAmount: invoice.skontoAmount,
      notes: invoice.notes,
      documentUrl: invoice.documentUrl,
      documentName: invoice.documentName,
    })
    setScanStatus('idle')
    setScanError(null)
    setShowForm(true)
  }

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    setSaving(true)

    try {
      const roundedData: CreateSupplierInvoiceInput = {
        ...formData,
        netAmount: roundTo2Decimals(formData.netAmount),
        taxAmount:
          formData.taxAmount !== undefined ? roundTo2Decimals(formData.taxAmount) : undefined,
        grossAmount:
          formData.grossAmount !== undefined ? roundTo2Decimals(formData.grossAmount) : undefined,
        skontoAmount:
          formData.skontoAmount !== undefined
            ? roundTo2Decimals(formData.skontoAmount)
            : undefined,
      }

      if (editingInvoice) {
        const updateResult = await updateSupplierInvoice(editingInvoice.id, roundedData)
        if (!updateResult.ok) {
          throw new Error(updateResult.message)
        }
      } else {
        const createResult = await createSupplierInvoice(roundedData)
        if (!createResult.ok) {
          throw new Error(createResult.message)
        }
      }

      await onSaved()
      closeForm()
      resetForm()
    } finally {
      setSaving(false)
    }
  }

  const processScannedFile = async (file: File): Promise<void> => {
    const isAllowedMimeType = SUPPLIER_INVOICE_ALLOWED_MIME_TYPES.includes(
      file.type as (typeof SUPPLIER_INVOICE_ALLOWED_MIME_TYPES)[number],
    )
    if (!isAllowedMimeType) {
      setScanError('Bitte PDF oder Bild (JPG, PNG, WebP) wählen.')
      setScanStatus('error')
      return
    }

    setScanError(null)
    setScanStatus('uploading')

    try {
      const scanResult = await uploadAndAnalyzeSupplierInvoice(file, () => {
        setScanStatus('analyzing')
      })

      setFormData((previousData) => ({
        ...previousData,
        supplierName: scanResult.supplierName ?? previousData.supplierName,
        supplierUid: scanResult.supplierUid ?? previousData.supplierUid,
        invoiceNumber: scanResult.invoiceNumber ?? previousData.invoiceNumber,
        invoiceDate: scanResult.invoiceDate ?? previousData.invoiceDate,
        dueDate: scanResult.dueDate ?? previousData.dueDate,
        netAmount: scanResult.netAmount ?? previousData.netAmount,
        taxRate: scanResult.taxRate ?? previousData.taxRate,
        category:
          (scanResult.category as SupplierInvoiceCategory | undefined) ?? previousData.category,
        documentUrl: scanResult.documentUrl,
        documentName: scanResult.documentName,
      }))
      setScanStatus('done')
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Fehler beim Verarbeiten')
      setScanStatus('error')
    }
  }

  const handleDrop = (event: DragEvent): void => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file) {
      void processScannedFile(file)
    }
  }

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0]
    if (file) {
      void processScannedFile(file)
    }
    event.target.value = ''
  }

  return {
    showForm,
    setShowForm,
    editingInvoice,
    formData,
    setFormData,
    saving,
    scanStatus,
    scanError,
    fileInputRef,
    calculatedAmounts,
    resetForm,
    closeForm,
    openCreateForm,
    openEditForm,
    handleSubmit,
    handleDrop,
    handleFileSelect,
  }
}
