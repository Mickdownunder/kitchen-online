'use client'

import React, { useState } from 'react'
import { CustomerProject, ProjectDocument, Customer } from '@/types'
import { ProjectModalHeader } from './Project/ProjectModalHeader'
import { ProjectModalTabs } from './Project/ProjectModalTabs'
import { ProjectBasicsTab } from './Project/ProjectBasicsTab'
import { ProjectItemsTab } from './Project/ProjectItemsTab'
import { ProjectControllingTab } from './Project/ProjectControllingTab'
import { ProjectDocsTab } from './Project/ProjectDocsTab'
import { ProjectDocumentsTab } from './Project/ProjectDocumentsTab'
import { ProjectTicketsTab } from './Project/ProjectTicketsTab'
import { ProjectModalFooter } from './Project/ProjectModalFooter'
import { useProjectForm } from './Project/useProjectForm'
import { useProjectSubmit } from './Project/useProjectSubmit'

interface ProjectModalProps {
  project?: Partial<CustomerProject>
  onClose: () => void
  onSave: (project: CustomerProject) => void
  onDelete?: (id: string) => void
  existingProjects?: CustomerProject[]
  existingCustomers?: Customer[]
}

const ProjectModal: React.FC<ProjectModalProps> = ({
  project,
  onClose,
  onSave,
  onDelete,
  existingCustomers = [],
}) => {
  const [activeTab, setActiveTab] = useState<
    'basics' | 'items' | 'controlling' | 'docs' | 'documents' | 'payments' | 'tickets'
  >('basics')
  const [previewDoc, setPreviewDoc] = useState<ProjectDocument | null>(null)

  const {
    formData,
    setFormData,
    customers,
    selectedCustomerId,
    setSelectedCustomerId,
    customerSearchTerm,
    setCustomerSearchTerm,
    showCustomerDropdown,
    setShowCustomerDropdown,
    addressSuggestions,
    setAddressSuggestions,
    addressInput,
    handleAddressInput,
    filteredCustomers,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    salutation,
    setSalutation,
    isLoadingAddress,
    setIsManualNameUpdate,
    companyName,
    setCompanyName,
    taxId,
    setTaxId,
    contactPerson,
    setContactPerson,
    calculations,
    addItem,
    updateItem,
    removeItem,
    // Articles
    articles,
    articleSearchTerm,
    setArticleSearchTerm,
    showArticleDropdown,
    setShowArticleDropdown,
    filteredArticles,
    addArticleAsItem,
    // Employees
    employees,
  } = useProjectForm(project, existingCustomers)

  const { handleSubmit } = useProjectSubmit({
    formData,
    currentAddress: addressInput,
    calculations,
    onSave,
    onClose,
  })

  // Focus trap and keyboard handlers
  const modalRef = React.useRef<HTMLDivElement>(null)
  const previousActiveElementRef = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    // Store the previously focused element
    previousActiveElementRef.current = document.activeElement as HTMLElement

    // Focus the modal when it opens
    if (modalRef.current) {
      const firstFocusable = modalRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement
      firstFocusable?.focus()
    }

    // Handle Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
      // Restore focus when modal closes
      previousActiveElementRef.current?.focus()
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md"
      onClick={e => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-modal-title"
    >
      <div
        ref={modalRef}
        className="flex w-full max-w-7xl flex-col overflow-hidden rounded-[3rem] border border-white/20 bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
        style={{ height: '98vh', maxHeight: '98vh', width: '95vw', maxWidth: '95vw' }}
        role="document"
      >
        <ProjectModalHeader formData={formData} onClose={onClose} id="project-modal-title" />

        <div className="border-b border-slate-100 bg-slate-50/50 px-10 py-8">
          <ProjectModalTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            formData={formData}
            onClose={onClose}
          />
        </div>

        <div className="flex-1 overflow-y-auto bg-white p-10">
          {activeTab === 'basics' && (
            <ProjectBasicsTab
              formData={formData}
              setFormData={setFormData}
              customers={customers}
              employees={employees}
              selectedCustomerId={selectedCustomerId}
              setSelectedCustomerId={setSelectedCustomerId}
              customerSearchTerm={customerSearchTerm}
              setCustomerSearchTerm={setCustomerSearchTerm}
              showCustomerDropdown={showCustomerDropdown}
              setShowCustomerDropdown={setShowCustomerDropdown}
              addressSuggestions={addressSuggestions}
              setAddressSuggestions={setAddressSuggestions}
              addressInput={addressInput}
              handleAddressInput={handleAddressInput}
              filteredCustomers={filteredCustomers}
              firstName={firstName}
              setFirstName={setFirstName}
              lastName={lastName}
              setLastName={setLastName}
              salutation={salutation}
              setSalutation={setSalutation}
              isLoadingAddress={isLoadingAddress}
              setIsManualNameUpdate={setIsManualNameUpdate}
              companyName={companyName}
              setCompanyName={setCompanyName}
              taxId={taxId}
              setTaxId={setTaxId}
              contactPerson={contactPerson}
              setContactPerson={setContactPerson}
            />
          )}

          {activeTab === 'items' && (
            <ProjectItemsTab
              formData={formData}
              setFormData={setFormData}
              calculations={calculations}
              addItem={addItem}
              articles={articles}
              articleSearchTerm={articleSearchTerm}
              setArticleSearchTerm={setArticleSearchTerm}
              showArticleDropdown={showArticleDropdown}
              setShowArticleDropdown={setShowArticleDropdown}
              filteredArticles={filteredArticles}
              addArticleAsItem={addArticleAsItem}
              updateItem={updateItem}
              removeItem={removeItem}
            />
          )}

          {activeTab === 'controlling' && (
            <ProjectControllingTab formData={formData} calculations={calculations} />
          )}

          {activeTab === 'docs' && (
            <ProjectDocsTab
              formData={formData}
              setFormData={setFormData}
              previewDoc={previewDoc}
              setPreviewDoc={setPreviewDoc}
            />
          )}

          {activeTab === 'documents' && formData.id && (
            <ProjectDocumentsTab project={formData as CustomerProject} />
          )}

          {activeTab === 'tickets' && (
            <ProjectTicketsTab projectId={formData.id} />
          )}
        </div>

        <ProjectModalFooter
          formData={formData}
          calculations={calculations}
          onClose={onClose}
          onDelete={onDelete}
          onSave={handleSubmit}
        />
      </div>
    </div>
  )
}

export default ProjectModal
