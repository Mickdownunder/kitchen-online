'use client'

import React from 'react'
import type { CustomerProject, SupplierInvoice } from '@/types'
import { useSupplierInvoiceForm } from '@/hooks/useSupplierInvoiceForm'
import { useSupplierInvoicesData } from '@/hooks/useSupplierInvoicesData'
import { logger } from '@/lib/utils/logger'
import SupplierInvoicesViewContent from './SupplierInvoicesViewContent'

interface SupplierInvoicesViewProps {
  projects?: CustomerProject[]
  onStatsChange?: (stats: { totalTax: number; count: number }) => void
}

export default function SupplierInvoicesView({
  projects = [],
  onStatsChange,
}: SupplierInvoicesViewProps) {
  const dataState = useSupplierInvoicesData({ onStatsChange })
  const formState = useSupplierInvoiceForm({ onSaved: dataState.loadInvoices })

  const handleSubmit = async (event: React.FormEvent) => {
    try {
      await formState.handleSubmit(event)
    } catch (error) {
      logger.error(
        'Fehler beim Speichern',
        { component: 'SupplierInvoicesView' },
        error instanceof Error ? error : new Error(String(error)),
      )
      alert('Fehler beim Speichern der Rechnung')
    }
  }

  const handleAddCustomCategory = async () => {
    const name = window.prompt('Neue Kategorie eingeben (z. B. „Beratung“, „Schulung“):')
    if (!name?.trim()) {
      return
    }

    try {
      const addedCategory = await dataState.addCustomCategory(name.trim())
      formState.setFormData((previousData) => ({ ...previousData, category: addedCategory.name }))
    } catch (error) {
      logger.error(
        'Fehler beim Hinzufügen der Kategorie',
        { component: 'SupplierInvoicesView' },
        error instanceof Error ? error : new Error(String(error)),
      )
      alert(error instanceof Error ? error.message : 'Kategorie konnte nicht hinzugefügt werden.')
    }
  }

  const handleDelete = async (invoice: SupplierInvoice) => {
    if (
      !confirm(`Rechnung "${invoice.invoiceNumber}" von ${invoice.supplierName} wirklich löschen?`)
    ) {
      return
    }

    try {
      await dataState.removeInvoice(invoice.id)
    } catch (error) {
      logger.error(
        'Fehler beim Löschen',
        { component: 'SupplierInvoicesView' },
        error instanceof Error ? error : new Error(String(error)),
      )
      alert('Fehler beim Löschen der Rechnung')
    }
  }

  const handleMarkPaid = async () => {
    if (!dataState.payingInvoice) {
      return
    }

    try {
      await dataState.confirmMarkPaid()
    } catch (error) {
      logger.error(
        'Fehler beim Markieren als bezahlt',
        { component: 'SupplierInvoicesView' },
        error instanceof Error ? error : new Error(String(error)),
      )
      alert('Fehler beim Markieren als bezahlt')
    }
  }

  const handleMarkUnpaid = async (invoice: SupplierInvoice) => {
    try {
      await dataState.markUnpaid(invoice.id)
    } catch (error) {
      logger.error(
        'Fehler beim Zurücksetzen',
        { component: 'SupplierInvoicesView' },
        error instanceof Error ? error : new Error(String(error)),
      )
      alert('Fehler beim Zurücksetzen')
    }
  }

  return (
    <SupplierInvoicesViewContent
      projects={projects}
      dataState={dataState}
      formState={formState}
      onSubmit={event => {
        void handleSubmit(event)
      }}
      onAddCustomCategory={() => {
        void handleAddCustomCategory()
      }}
      onDelete={invoice => {
        void handleDelete(invoice)
      }}
      onMarkPaid={() => {
        void handleMarkPaid()
      }}
      onMarkUnpaid={invoice => {
        void handleMarkUnpaid(invoice)
      }}
    />
  )
}
