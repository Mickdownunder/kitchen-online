'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ListInvoice } from '@/hooks/useInvoiceFilters'
import type { ReminderPreviewData } from '@/components/invoices/ReminderPreviewModal'
import { logger } from '@/lib/utils/logger'

type ReminderType = 'first' | 'second' | 'final'

interface ReminderPayload {
  recipientEmail: string
  subject: string
  text: string
  html: string
}

interface UseInvoiceFormOptions {
  loadInvoices: (silent?: boolean) => Promise<void>
  onProjectUpdate?: () => void
  onSuccessMessage: (message: string) => void
  onErrorMessage: (message: string) => void
}

interface UseInvoiceFormResult {
  reminderDropdownOpen: string | null
  setReminderDropdownOpen: (value: string | null) => void
  sendingReminder: string | null
  reminderModalOpen: boolean
  reminderPreviewData: ReminderPreviewData | null
  reminderPreviewLoading: boolean
  cancelModalOpen: boolean
  invoiceToCancel: ListInvoice | null
  handleOpenReminderPreview: (invoice: ListInvoice, reminderType: ReminderType) => Promise<void>
  handleConfirmSendReminder: (payload: ReminderPayload) => Promise<void>
  closeReminderModal: () => void
  openCancelModal: (invoice: ListInvoice) => void
  closeCancelModal: () => void
  handleCreditNoteSuccess: () => Promise<void>
}

export function useInvoiceForm({
  loadInvoices,
  onProjectUpdate,
  onSuccessMessage,
  onErrorMessage,
}: UseInvoiceFormOptions): UseInvoiceFormResult {
  const [reminderDropdownOpen, setReminderDropdownOpen] = useState<string | null>(null)
  const [sendingReminder, setSendingReminder] = useState<string | null>(null)
  const [reminderModalOpen, setReminderModalOpen] = useState(false)
  const [reminderPreviewData, setReminderPreviewData] = useState<ReminderPreviewData | null>(null)
  const [reminderPreviewLoading, setReminderPreviewLoading] = useState(false)
  const [reminderModalInvoice, setReminderModalInvoice] = useState<ListInvoice | null>(null)
  const [reminderModalType, setReminderModalType] = useState<ReminderType | null>(null)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [invoiceToCancel, setInvoiceToCancel] = useState<ListInvoice | null>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (reminderDropdownOpen && !(event.target as HTMLElement).closest('.relative')) {
        setReminderDropdownOpen(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [reminderDropdownOpen])

  const closeReminderModal = useCallback((): void => {
    setReminderModalOpen(false)
    setReminderModalInvoice(null)
    setReminderModalType(null)
    setReminderPreviewData(null)
  }, [])

  const handleOpenReminderPreview = useCallback(
    async (invoice: ListInvoice, reminderType: ReminderType): Promise<void> => {
      setReminderDropdownOpen(null)
      setReminderModalInvoice(invoice)
      setReminderModalType(reminderType)
      setReminderPreviewData(null)
      setReminderModalOpen(true)
      setReminderPreviewLoading(true)

      try {
        const response = await fetch('/api/reminders/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: invoice.projectId,
            invoiceId: invoice.id,
            reminderType,
          }),
        })
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Vorschau konnte nicht geladen werden')
        }

        setReminderPreviewData(data)
      } catch (error: unknown) {
        logger.error(
          'Error loading reminder preview',
          { component: 'useInvoiceForm' },
          error as Error,
        )
        onErrorMessage(error instanceof Error ? error.message : 'Vorschau konnte nicht geladen werden')
        setReminderModalOpen(false)
      } finally {
        setReminderPreviewLoading(false)
      }
    },
    [onErrorMessage],
  )

  const handleConfirmSendReminder = useCallback(
    async (payload: ReminderPayload): Promise<void> => {
      if (!reminderModalInvoice || !reminderModalType) {
        return
      }

      setSendingReminder(reminderModalInvoice.id)
      try {
        const response = await fetch('/api/reminders/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: reminderModalInvoice.projectId,
            invoiceId: reminderModalInvoice.id,
            reminderType: reminderModalType,
            recipientEmail: payload.recipientEmail,
            subject: payload.subject,
            html: payload.html,
            text: payload.text,
          }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Fehler beim Senden der Mahnung')
        }

        onSuccessMessage(
          `${reminderModalType === 'first' ? '1.' : reminderModalType === 'second' ? '2.' : 'Letzte'} Mahnung erfolgreich gesendet!`,
        )
        closeReminderModal()
        setSendingReminder(null)
        onProjectUpdate?.()
        await loadInvoices(true)
      } catch (error) {
        setSendingReminder(null)
        throw error
      }
    },
    [closeReminderModal, loadInvoices, onProjectUpdate, onSuccessMessage, reminderModalInvoice, reminderModalType],
  )

  const openCancelModal = useCallback((invoice: ListInvoice): void => {
    setInvoiceToCancel(invoice)
    setCancelModalOpen(true)
  }, [])

  const closeCancelModal = useCallback((): void => {
    setCancelModalOpen(false)
    setInvoiceToCancel(null)
  }, [])

  const handleCreditNoteSuccess = useCallback(async (): Promise<void> => {
    onSuccessMessage('Stornorechnung erfolgreich erstellt')
    await loadInvoices(true)
    onProjectUpdate?.()
  }, [loadInvoices, onProjectUpdate, onSuccessMessage])

  return {
    reminderDropdownOpen,
    setReminderDropdownOpen,
    sendingReminder,
    reminderModalOpen,
    reminderPreviewData,
    reminderPreviewLoading,
    cancelModalOpen,
    invoiceToCancel,
    handleOpenReminderPreview,
    handleConfirmSendReminder,
    closeReminderModal,
    openCancelModal,
    closeCancelModal,
    handleCreditNoteSuccess,
  }
}
