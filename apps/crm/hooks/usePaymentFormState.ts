'use client'

import { useCallback, useState } from 'react'
import { peekNextInvoiceNumber } from '@/lib/supabase/services/company'
import { calculatePercentAmount } from '@/lib/utils/accountingAmounts'
import type { Invoice } from '@/types'
import type { PaymentFormData } from '@/hooks/payments.types'

interface UsePaymentFormStateOptions {
  grossTotal: number
}

interface UsePaymentFormStateResult {
  editingPaymentId: string | null
  newPaymentForm: PaymentFormData | null
  setNewPaymentForm: (value: PaymentFormData | null) => void
  percentInput: string
  editingPercentInput: string
  invoiceNumber: string
  setInvoiceNumber: (value: string) => void
  suggestedInvoiceNumber: string
  resetForm: () => void
  handleQuickPercent: (percent: number) => void
  handlePercentChange: (value: string, fromAmountField?: boolean) => void
  handlePercentBlur: () => void
  handleEditingPercentChange: (value: string, fromAmountField?: boolean) => void
  handleEditingPercentBlur: () => void
  startNewPayment: (canCreate: boolean, paymentCount: number) => Promise<void>
  startEditPayment: (invoice: Invoice) => void
}

const TODAY = (): string => new Date().toISOString().split('T')[0]

export function usePaymentFormState({
  grossTotal,
}: UsePaymentFormStateOptions): UsePaymentFormStateResult {
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)
  const [newPaymentForm, setNewPaymentFormInternal] = useState<PaymentFormData | null>(null)
  const [percentInput, setPercentInput] = useState('')
  const [editingPercentInput, setEditingPercentInput] = useState('')
  const [invoiceNumber, setInvoiceNumberInternal] = useState('')
  const [suggestedInvoiceNumber, setSuggestedInvoiceNumber] = useState('')

  const setNewPaymentForm = useCallback((value: PaymentFormData | null): void => {
    setNewPaymentFormInternal(value)
  }, [])

  const setInvoiceNumber = useCallback((value: string): void => {
    setInvoiceNumberInternal(value)
  }, [])

  const resetForm = useCallback((): void => {
    setEditingPaymentId(null)
    setNewPaymentFormInternal(null)
    setPercentInput('')
    setEditingPercentInput('')
    setInvoiceNumberInternal('')
    setSuggestedInvoiceNumber('')
  }, [])

  const handleQuickPercent = useCallback(
    (percent: number): void => {
      if (grossTotal <= 0) {
        return
      }
      const amount = calculatePercentAmount(grossTotal, percent)
      setNewPaymentFormInternal((current) => ({ ...current, amount }))
      setPercentInput(percent.toString())
    },
    [grossTotal],
  )

  const handlePercentChange = useCallback(
    (value: string, fromAmountField?: boolean): void => {
      setPercentInput(value)
      if (fromAmountField) {
        return
      }
      const percent = parseFloat(value) || 0
      if (!Number.isNaN(percent) && percent >= 0 && percent <= 100 && grossTotal > 0) {
        setNewPaymentFormInternal((current) => ({
          ...current,
          amount: calculatePercentAmount(grossTotal, percent),
        }))
      } else if (value === '' || value === '.') {
        setNewPaymentFormInternal((current) => ({ ...current, amount: undefined }))
      }
    },
    [grossTotal],
  )

  const handlePercentBlur = useCallback((): void => {
    if (!percentInput) {
      return
    }

    const percent = parseFloat(percentInput) || 0
    if (percent >= 0 && percent <= 100) {
      setPercentInput(percent.toFixed(1))
    } else {
      setPercentInput('')
    }
  }, [percentInput])

  const handleEditingPercentChange = useCallback(
    (value: string, fromAmountField?: boolean): void => {
      setEditingPercentInput(value)
      if (fromAmountField) {
        return
      }
      const percent = parseFloat(value) || 0
      if (!Number.isNaN(percent) && percent >= 0 && percent <= 100 && grossTotal > 0) {
        setNewPaymentFormInternal((current) => ({
          ...current,
          amount: calculatePercentAmount(grossTotal, percent),
        }))
      } else if (value === '' || value === '.') {
        setNewPaymentFormInternal((current) => ({ ...current, amount: undefined }))
      }
    },
    [grossTotal],
  )

  const handleEditingPercentBlur = useCallback((): void => {
    if (!editingPercentInput) {
      return
    }
    const percent = parseFloat(editingPercentInput) || 0
    if (percent >= 0 && percent <= 100) {
      setEditingPercentInput(percent.toFixed(1))
    } else {
      setEditingPercentInput('')
    }
  }, [editingPercentInput])

  const startNewPayment = useCallback(
    async (canCreate: boolean, paymentCount: number): Promise<void> => {
      if (!canCreate) {
        return
      }
      const suggested = await peekNextInvoiceNumber()
      setSuggestedInvoiceNumber(suggested)
      setInvoiceNumberInternal(suggested)

      setNewPaymentFormInternal({
        description: `Anzahlung ${paymentCount + 1}`,
        amount: undefined,
        date: TODAY(),
      })
      setEditingPaymentId(null)
      setPercentInput('')
      setEditingPercentInput('')
    },
    [],
  )

  const startEditPayment = useCallback(
    (invoice: Invoice): void => {
      setEditingPaymentId(invoice.id)
      setNewPaymentFormInternal({
        description: invoice.description,
        amount: invoice.amount,
        date: invoice.invoiceDate,
      })

      if (grossTotal > 0 && invoice.amount > 0) {
        setEditingPercentInput(((invoice.amount / grossTotal) * 100).toFixed(1))
      } else {
        setEditingPercentInput('')
      }
    },
    [grossTotal],
  )

  return {
    editingPaymentId,
    newPaymentForm,
    setNewPaymentForm,
    percentInput,
    editingPercentInput,
    invoiceNumber,
    setInvoiceNumber,
    suggestedInvoiceNumber,
    resetForm,
    handleQuickPercent,
    handlePercentChange,
    handlePercentBlur,
    handleEditingPercentChange,
    handleEditingPercentBlur,
    startNewPayment,
    startEditPayment,
  }
}
