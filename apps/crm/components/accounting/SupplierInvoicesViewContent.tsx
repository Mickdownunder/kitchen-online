'use client'

import React from 'react'
import type { CustomerProject, SupplierInvoice } from '@/types'
import type { UseSupplierInvoiceFormResult } from '@/hooks/useSupplierInvoiceForm'
import type { UseSupplierInvoicesDataResult } from '@/hooks/useSupplierInvoicesData'
import { SupplierInvoicesHeader } from '@/components/accounting/SupplierInvoicesHeader'
import { SupplierInvoicesTable } from '@/components/accounting/SupplierInvoicesTable'
import { SupplierInvoiceFormModal } from '@/components/accounting/SupplierInvoiceFormModal'
import { SupplierInvoicePaymentModal } from '@/components/accounting/SupplierInvoicePaymentModal'

interface SupplierInvoicesViewContentProps {
  projects: CustomerProject[]
  dataState: UseSupplierInvoicesDataResult
  formState: UseSupplierInvoiceFormResult
  onSubmit: (event: React.FormEvent) => void
  onAddCustomCategory: () => void
  onDelete: (invoice: SupplierInvoice) => void
  onMarkPaid: () => void
  onMarkUnpaid: (invoice: SupplierInvoice) => void
}

export default function SupplierInvoicesViewContent({
  projects,
  dataState,
  formState,
  onSubmit,
  onAddCustomCategory,
  onDelete,
  onMarkPaid,
  onMarkUnpaid,
}: SupplierInvoicesViewContentProps) {
  const {
    invoices,
    loading,
    searchTerm,
    setSearchTerm,
    filterCategory,
    setFilterCategory,
    filterStatus,
    setFilterStatus,
    customCategories,
    filteredInvoices,
    stats,
    payingInvoice,
    setPayingInvoice,
    paidDate,
    setPaidDate,
    paymentMethod,
    setPaymentMethod,
  } = dataState

  const {
    showForm,
    editingInvoice,
    formData,
    setFormData,
    saving,
    scanStatus,
    scanError,
    fileInputRef,
    calculatedAmounts,
    closeForm,
    openCreateForm,
    openEditForm,
    handleDrop,
    handleFileSelect,
  } = formState

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SupplierInvoicesHeader
        stats={stats}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterCategory={filterCategory}
        setFilterCategory={setFilterCategory}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        customCategories={customCategories}
        onOpenCreateForm={openCreateForm}
      />

      <SupplierInvoicesTable
        invoices={invoices}
        filteredInvoices={filteredInvoices}
        projects={projects}
        onEdit={openEditForm}
        onDelete={onDelete}
        onMarkUnpaid={onMarkUnpaid}
        onStartMarkPaid={setPayingInvoice}
      />

      <SupplierInvoiceFormModal
        isOpen={showForm}
        editingInvoice={editingInvoice}
        formData={formData}
        setFormData={setFormData}
        saving={saving}
        scanStatus={scanStatus}
        scanError={scanError}
        fileInputRef={fileInputRef}
        calculatedAmounts={calculatedAmounts}
        customCategories={customCategories}
        projects={projects}
        onClose={closeForm}
        onSubmit={onSubmit}
        onAddCustomCategory={onAddCustomCategory}
        onDrop={handleDrop}
        onFileSelect={handleFileSelect}
      />

      <SupplierInvoicePaymentModal
        payingInvoice={payingInvoice}
        paidDate={paidDate}
        setPaidDate={setPaidDate}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        onClose={() => setPayingInvoice(null)}
        onConfirm={onMarkPaid}
      />
    </div>
  )
}
