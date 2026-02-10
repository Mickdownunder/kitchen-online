'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BankAccount,
  CompanySettings,
  CustomerDeliveryNote,
  CustomerProject,
} from '@/types'
import {
  getCompanySettings,
  getCustomerDeliveryNotes,
  getDeliveryNotes,
  getInvoices,
} from '@/lib/supabase/services'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import {
  extractPublishedDocumentKeys,
  filterDocuments,
  getDocumentPublishKey,
  mapCustomerDeliveryNotesToDocuments,
  mapInvoicesToDocuments,
  mapOrderToDocument,
  mapProjectAttachmentsToDocuments,
  mapSupplierDeliveryNotesToDocuments,
  sortDocumentsByDateDesc,
} from './projectDocuments.mappers'
import type { DocumentItem, DocumentType } from './projectDocuments.types'

interface UseProjectDocumentQueriesResult {
  documents: DocumentItem[]
  filteredDocuments: DocumentItem[]
  loading: boolean
  filter: DocumentType
  setFilter: (nextFilter: DocumentType) => void
  searchTerm: string
  setSearchTerm: (nextSearchTerm: string) => void
  companySettings: CompanySettings | null
  bankAccount: BankAccount | null
  viewCustomerDeliveryNote: CustomerDeliveryNote | null
  setViewCustomerDeliveryNote: (note: CustomerDeliveryNote | null) => void
  showOrderDownloadModal: boolean
  setShowOrderDownloadModal: (show: boolean) => void
  orderDownloadAppendAgb: boolean
  setOrderDownloadAppendAgb: (append: boolean) => void
  isPublished: (doc: DocumentItem) => boolean
  markDocumentAsPublished: (doc: DocumentItem) => void
}

function isAbort(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  return error.message.includes('aborted') || error.name === 'AbortError'
}

export function useProjectDocumentQueries(
  project: CustomerProject,
): UseProjectDocumentQueriesResult {
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<DocumentType>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null)
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null)
  const [viewCustomerDeliveryNote, setViewCustomerDeliveryNote] =
    useState<CustomerDeliveryNote | null>(null)
  const [showOrderDownloadModal, setShowOrderDownloadModal] = useState(false)
  const [orderDownloadAppendAgb, setOrderDownloadAppendAgb] = useState(false)
  const [publishedDocs, setPublishedDocs] = useState<Set<string>>(new Set())

  const loadCompanySettings = useCallback(async () => {
    try {
      const settings = await getCompanySettings()
      setCompanySettings(settings)
    } catch (error) {
      logger.error('Error loading company settings', { component: 'ProjectDocumentsTab' }, error as Error)
    }
  }, [])

  const loadBankAccount = useCallback(async () => {
    try {
      if (!companySettings?.id) {
        return
      }

      const { getBankAccounts } = await import('@/lib/supabase/services')
      const accounts = await getBankAccounts(companySettings.id)
      const defaultBank = accounts.find((account) => account.isDefault) || accounts[0]
      setBankAccount(defaultBank || null)
    } catch (error) {
      logger.error('Error loading bank account', { component: 'ProjectDocumentsTab' }, error as Error)
    }
  }, [companySettings?.id])

  const loadPublishedDocuments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('name, type')
        .eq('project_id', project.id)
        .in('type', ['RECHNUNGEN', 'LIEFERSCHEINE', 'KAUFVERTRAG'])

      if (error) {
        throw error
      }

      setPublishedDocs(extractPublishedDocumentKeys(data))
    } catch (error) {
      logger.error('Error loading published documents', { component: 'ProjectDocumentsTab' }, error as Error)
    }
  }, [project.id])

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true)
      const allDocuments: DocumentItem[] = []

      try {
        const invoicesResult = await getInvoices(project.id)
        if (!invoicesResult.ok) {
          throw new Error('Failed to load invoices')
        }

        allDocuments.push(...mapInvoicesToDocuments(invoicesResult.data, project))
      } catch (error: unknown) {
        if (isAbort(error)) {
          return
        }
        logger.debug('Could not load invoices', { component: 'ProjectDocumentsTab', error })
      }

      try {
        const customerDeliveryNotes = await getCustomerDeliveryNotes(project.id)
        allDocuments.push(...mapCustomerDeliveryNotesToDocuments(customerDeliveryNotes, project))
      } catch (error: unknown) {
        if (isAbort(error)) {
          return
        }
        logger.debug('Could not load customer delivery notes', { component: 'ProjectDocumentsTab', error })
      }

      try {
        const supplierDeliveryNotes = await getDeliveryNotes()
        allDocuments.push(...mapSupplierDeliveryNotesToDocuments(supplierDeliveryNotes, project))
      } catch (error: unknown) {
        if (isAbort(error)) {
          return
        }
        logger.debug('Could not load supplier delivery notes', { component: 'ProjectDocumentsTab', error })
      }

      allDocuments.push(...mapProjectAttachmentsToDocuments(project.documents, project))

      const orderDocument = mapOrderToDocument(project)
      if (orderDocument) {
        allDocuments.push(orderDocument)
      }

      setDocuments(sortDocumentsByDateDesc(allDocuments))
    } catch (error) {
      logger.error('Error loading documents', { component: 'ProjectDocumentsTab' }, error as Error)
    } finally {
      setLoading(false)
    }
  }, [project])

  useEffect(() => {
    void loadDocuments()
    void loadCompanySettings()
    void loadPublishedDocuments()
  }, [loadDocuments, loadCompanySettings, loadPublishedDocuments])

  useEffect(() => {
    if (!companySettings?.id) {
      return
    }

    void loadBankAccount()
  }, [companySettings?.id, loadBankAccount])

  const filteredDocuments = useMemo(
    () => filterDocuments(documents, filter, searchTerm),
    [documents, filter, searchTerm],
  )

  const isPublished = useCallback((doc: DocumentItem): boolean => {
    return publishedDocs.has(getDocumentPublishKey(doc))
  }, [publishedDocs])

  const markDocumentAsPublished = useCallback((doc: DocumentItem) => {
    setPublishedDocs((previousDocs) => {
      return new Set([...previousDocs, getDocumentPublishKey(doc)])
    })
  }, [])

  return {
    documents,
    filteredDocuments,
    loading,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
    companySettings,
    bankAccount,
    viewCustomerDeliveryNote,
    setViewCustomerDeliveryNote,
    showOrderDownloadModal,
    setShowOrderDownloadModal,
    orderDownloadAppendAgb,
    setOrderDownloadAppendAgb,
    isPublished,
    markDocumentAsPublished,
  }
}
