import { useState, useEffect } from 'react'
import { CustomerProject, ProjectStatus } from '@/types'
import type { Customer } from '@/types'
import { generateOrderNumber } from '@/lib/utils/orderNumberGenerator'
import { useCustomerSelection } from '@/hooks/useCustomerSelection'
import { useAddressAutocomplete } from '@/hooks/useAddressAutocomplete'
import { useArticleSelection } from '@/hooks/useArticleSelection'
import { useProjectItems } from '@/hooks/useProjectItems'
import { useProjectCalculations } from '@/hooks/useProjectCalculations'
import { useEmployees } from '@/hooks/useEmployees'

/**
 * Main Hook für Project-Form-Management
 *
 * Orchestriert alle Sub-Hooks und stellt einheitliche API bereit
 * Backward compatible - behält die gleiche API wie vorher
 */
export function useProjectForm(
  initialProject?: Partial<CustomerProject>,
  existingCustomers: Customer[] = []
) {
  // Basis Form-State
  const [formData, setFormData] = useState<Partial<CustomerProject>>({
    customerName: '',
    address: '',
    phone: '',
    email: '',
    orderNumber: generateOrderNumber(),
    status: ProjectStatus.PLANNING,
    isMeasured: false,
    isOrdered: false,
    isInstallationAssigned: false,
    isDepositPaid: false,
    isFinalPaid: false,
    totalAmount: 0,
    depositAmount: 0,
    items: [],
    complaints: [],
    documents: [],
    notes: '',
    partialPayments: [],
    ...initialProject,
  })

  // Local state für setIsManualNameUpdate (wird an beide Hooks weitergegeben)
  const [_isManualNameUpdate, setIsManualNameUpdate] = useState(false)

  // Address-Autocomplete Hook (muss vor Customer-Selection kommen, da setAddressInput benötigt wird)
  const addressAutocomplete = useAddressAutocomplete({
    formData,
    setFormData,
  })

  // Customer-Selection Hook
  const customerSelection = useCustomerSelection({
    existingCustomers,
    formData,
    setFormData,
    setAddressInput: addressAutocomplete.setAddressInput,
    setIsManualNameUpdate,
  })

  // Article-Selection Hook
  const articleSelection = useArticleSelection({
    formData,
    setFormData,
  })

  // Project-Items Hook
  const projectItems = useProjectItems({
    formData,
    setFormData,
  })

  // Project-Calculations Hook
  const { calculations } = useProjectCalculations({
    formData,
    setFormData,
  })

  // Employees Hook
  const { employees } = useEmployees()

  // Initialize partial payments if not exists (Legacy-Migration)
  // HINWEIS: Dieser Code existiert nur für die Migration alter Projekte mit depositAmount.
  // Neue Anzahlungen werden über die Zahlungsseite erstellt, wo fortlaufende Rechnungsnummern
  // korrekt generiert werden (getNextInvoiceNumber).
  // Die hier generierte Nummer ist ein Platzhalter für Legacy-Daten.
  useEffect(() => {
    if (!formData.partialPayments && formData.depositAmount && formData.depositAmount > 0) {
      setFormData(prev => ({
        ...prev,
        partialPayments: [
          {
            id: `partial-${Date.now()}`,
            // Legacy-Platzhalter - echte fortlaufende Nummern werden über Zahlungsseite generiert
            invoiceNumber: prev.invoiceNumber
              ? `${prev.invoiceNumber}-A1`
              : `R-${new Date().getFullYear()}-${prev.orderNumber}-A1`,
            amount: prev.depositAmount || 0,
            date: prev.orderDate || prev.measurementDate || new Date().toISOString().split('T')[0],
            description: 'Anzahlung',
            isPaid: prev.isDepositPaid || false,
            paidDate: prev.isDepositPaid ? new Date().toISOString().split('T')[0] : undefined,
          },
        ],
      }))
    }
  }, [
    formData.partialPayments,
    formData.depositAmount,
    formData.invoiceNumber,
    formData.orderNumber,
    formData.orderDate,
    formData.measurementDate,
    formData.isDepositPaid,
  ])

  // Return unified API (backward compatible)
  return {
    formData,
    setFormData,
    // Customer Selection
    customers: customerSelection.customers,
    selectedCustomerId: customerSelection.selectedCustomerId,
    setSelectedCustomerId: customerSelection.setSelectedCustomerId,
    customerSearchTerm: customerSelection.customerSearchTerm,
    setCustomerSearchTerm: customerSelection.setCustomerSearchTerm,
    showCustomerDropdown: customerSelection.showCustomerDropdown,
    setShowCustomerDropdown: customerSelection.setShowCustomerDropdown,
    filteredCustomers: customerSelection.filteredCustomers,
    firstName: customerSelection.firstName,
    setFirstName: customerSelection.setFirstName,
    lastName: customerSelection.lastName,
    setLastName: customerSelection.setLastName,
    salutation: customerSelection.salutation,
    setSalutation: customerSelection.setSalutation,
    companyName: customerSelection.companyName,
    setCompanyName: customerSelection.setCompanyName,
    taxId: customerSelection.taxId,
    setTaxId: customerSelection.setTaxId,
    contactPerson: customerSelection.contactPerson,
    setContactPerson: customerSelection.setContactPerson,
    // Address Autocomplete
    addressSuggestions: addressAutocomplete.addressSuggestions,
    setAddressSuggestions: addressAutocomplete.setAddressSuggestions,
    addressInput: addressAutocomplete.addressInput,
    handleAddressInput: addressAutocomplete.handleAddressInput,
    isLoadingAddress: addressAutocomplete.isLoadingAddress,
    setIsManualNameUpdate,
    // Calculations
    calculations,
    // Items
    addItem: projectItems.addItem,
    updateItem: projectItems.updateItem,
    removeItem: projectItems.removeItem,
    // Articles
    articles: articleSelection.articles,
    articleSearchTerm: articleSelection.articleSearchTerm,
    setArticleSearchTerm: articleSelection.setArticleSearchTerm,
    showArticleDropdown: articleSelection.showArticleDropdown,
    setShowArticleDropdown: articleSelection.setShowArticleDropdown,
    filteredArticles: articleSelection.filteredArticles,
    addArticleAsItem: articleSelection.addArticleAsItem,
    selectedArticleForPosition: articleSelection.selectedArticleForPosition,
    setSelectedArticleForPosition: articleSelection.setSelectedArticleForPosition,
    // Employees
    employees,
  }
}
