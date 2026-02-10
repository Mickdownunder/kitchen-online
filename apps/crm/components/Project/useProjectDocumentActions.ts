'use client'

import { useCallback, useState } from 'react'
import {
  publishDeliveryNoteToPortal,
  publishInvoiceToPortal,
  publishOrderToPortal,
} from '@/lib/supabase/services'
import { logger } from '@/lib/utils/logger'
import type {
  DocumentItem,
  SignatureAudit,
  UseProjectDocumentActionOptions,
} from './projectDocuments.types'

interface UseProjectDocumentActionsResult {
  showSignatureModal: boolean
  setShowSignatureModal: (show: boolean) => void
  signatureAudit: SignatureAudit | null
  setSignatureAudit: (audit: SignatureAudit | null) => void
  publishingDoc: string | null
  sendingOrderEmail: boolean
  sendingPortalAccess: boolean
  portalAccessError: string | null
  canPublish: (doc: DocumentItem) => boolean
  handlePublishToPortal: (doc: DocumentItem) => Promise<void>
  handleSendOrderEmail: () => Promise<void>
  handleSendPortalAccess: (
    onPortalAccessSent?: (accessCode: string) => void,
    onSuccess?: () => void,
  ) => Promise<void>
  loadSignatureAudit: () => Promise<void>
}

export function useProjectDocumentActions({
  project,
  companySettings,
  onDocumentPublished,
}: UseProjectDocumentActionOptions): UseProjectDocumentActionsResult {
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [signatureAudit, setSignatureAudit] = useState<SignatureAudit | null>(null)
  const [publishingDoc, setPublishingDoc] = useState<string | null>(null)
  const [sendingOrderEmail, setSendingOrderEmail] = useState(false)
  const [sendingPortalAccess, setSendingPortalAccess] = useState(false)
  const [portalAccessError, setPortalAccessError] = useState<string | null>(null)

  const canPublish = useCallback((doc: DocumentItem): boolean => {
    return ['invoice', 'customer-delivery-note', 'order'].includes(doc.type)
  }, [])

  const handlePublishToPortal = useCallback(async (doc: DocumentItem) => {
    if (!companySettings) {
      alert('Bitte Firmenstammdaten hinterlegen.')
      return
    }

    setPublishingDoc(doc.id)

    try {
      if (doc.type === 'invoice') {
        const result = await publishInvoiceToPortal({
          invoice: doc.data.invoice || doc.data.payment,
          project,
        })

        if (!result.success) {
          throw new Error(result.error || 'Fehler beim Veröffentlichen')
        }
      } else if (doc.type === 'customer-delivery-note') {
        const result = await publishDeliveryNoteToPortal({
          deliveryNote: doc.data.note,
          project,
        })

        if (!result.success) {
          throw new Error(result.error || 'Fehler beim Veröffentlichen')
        }
      } else if (doc.type === 'order') {
        const result = await publishOrderToPortal({
          project,
          appendAgb: !!companySettings.agbText?.trim(),
        })

        if (!result.success) {
          throw new Error(result.error || 'Fehler beim Veröffentlichen')
        }
      } else {
        alert('Dieser Dokumenttyp kann nicht ins Portal veröffentlicht werden.')
        return
      }

      onDocumentPublished(doc)
      alert(`"${doc.title}" wurde im Kundenportal veröffentlicht.`)
    } catch (error) {
      logger.error('Error publishing to portal', { component: 'ProjectDocumentsTab', doc: doc.id }, error as Error)
      alert(`Fehler beim Veröffentlichen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
    } finally {
      setPublishingDoc(null)
    }
  }, [companySettings, onDocumentPublished, project])

  const handleSendOrderEmail = useCallback(async () => {
    if (!project.email?.trim()) {
      alert('Bitte E-Mail-Adresse des Kunden im Projekt hinterlegen.')
      return
    }

    if (!companySettings) {
      alert('Bitte Firmenstammdaten hinterlegen.')
      return
    }

    setSendingOrderEmail(true)

    try {
      const response = await fetch('/api/email/send-with-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: project.email.trim(),
          subject: `Auftrag ${project.orderNumber} zur Unterschrift`,
          pdfType: 'order',
          projectId: project.id,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Senden')
      }

      alert('Auftrag wurde per E-Mail versendet. Der Kunde erhält den Link zur Online-Unterschrift.')
    } catch (error) {
      logger.error('Error sending order email', { component: 'ProjectDocumentsTab' }, error as Error)
      alert(`Fehler beim Senden: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
    } finally {
      setSendingOrderEmail(false)
    }
  }, [companySettings, project.email, project.id, project.orderNumber])

  const handleSendPortalAccess = useCallback(async (
    onPortalAccessSent?: (accessCode: string) => void,
    onSuccess?: () => void,
  ) => {
    if (!project.email?.trim()) {
      setPortalAccessError('Bitte zuerst die Kunden-E-Mail in den Stammdaten eintragen.')
      return
    }

    setSendingPortalAccess(true)
    setPortalAccessError(null)

    try {
      const response = await fetch('/api/projects/send-portal-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        setPortalAccessError(data.error || 'Fehler beim Senden')
        return
      }

      if (data.accessCode && onPortalAccessSent) {
        onPortalAccessSent(data.accessCode)
      }

      onSuccess?.()
    } catch {
      setPortalAccessError('Fehler beim Senden')
    } finally {
      setSendingPortalAccess(false)
    }
  }, [project.email, project.id])

  const loadSignatureAudit = useCallback(async () => {
    setShowSignatureModal(true)

    try {
      const response = await fetch(`/api/projects/${project.id}/order-sign-audit`)
      const data = await response.json()

      setSignatureAudit(
        response.ok && data
          ? {
              ip_address: data.ip_address ?? null,
              user_agent: data.user_agent ?? null,
              geodata: data.geodata ?? null,
            }
          : null,
      )
    } catch {
      setSignatureAudit(null)
    }
  }, [project.id])

  return {
    showSignatureModal,
    setShowSignatureModal,
    signatureAudit,
    setSignatureAudit,
    publishingDoc,
    sendingOrderEmail,
    sendingPortalAccess,
    portalAccessError,
    canPublish,
    handlePublishToPortal,
    handleSendOrderEmail,
    handleSendPortalAccess,
    loadSignatureAudit,
  }
}
