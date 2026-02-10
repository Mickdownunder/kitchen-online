import { useState, useEffect } from 'react'
import { CustomerProject, ProjectStatus } from '@/types'
import type { Customer } from '@/types'
import { peekNextOrderNumber } from '@/lib/supabase/services/company'
import { getSupplierInvoices } from '@/lib/supabase/services/supplierInvoices'
import { parseAddressFromDB } from '@/lib/utils/addressFormatter'
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
  // Basis Form-State (Adresse aus initialProject parsen → Einzelfelder)
  const [formData, setFormData] = useState<Partial<CustomerProject>>(() => {
    const base = {
      customerName: '',
      address: '',
      phone: '',
      email: '',
      orderNumber: '',
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
    }
    const merged = { ...base, ...initialProject }
    if (merged.address && !merged.addressStreet) {
      const parsed = parseAddressFromDB(merged.address)
      return {
        ...merged,
        addressStreet: parsed.street,
        addressHouseNumber: parsed.houseNumber,
        addressPostalCode: parsed.postalCode,
        addressCity: parsed.city,
      }
    }
    return merged
  })

  // Local state für setIsManualNameUpdate (wird an beide Hooks weitergegeben)
  const [, setIsManualNameUpdate] = useState(false)

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

  // Wareneinsatz aus verknüpften Eingangsrechnungen (für Marge)
  const [supplierInvoiceTotal, setSupplierInvoiceTotal] = useState(0)
  useEffect(() => {
    let isActive = true

    if (!formData.id) {
      const timer = window.setTimeout(() => {
        if (isActive) {
          setSupplierInvoiceTotal(0)
        }
      }, 0)
      return () => {
        isActive = false
        window.clearTimeout(timer)
      }
    }

    getSupplierInvoices(formData.id)
      .then(invoices => {
        if (!isActive) return
        const total = invoices.reduce((sum, inv) => sum + inv.netAmount, 0)
        setSupplierInvoiceTotal(total)
      })
      .catch(() => {
        if (isActive) {
          setSupplierInvoiceTotal(0)
        }
      })

    return () => {
      isActive = false
    }
  }, [formData.id])

  // Project-Calculations Hook (nutzt Eingangsrechnungen wenn verknüpft)
  const { calculations } = useProjectCalculations({
    formData,
    setFormData,
    supplierInvoiceTotal,
  })

  // Employees Hook
  const { employees } = useEmployees()

  // Bei neuem Projekt: Vorschau der nächsten Auftragsnummer laden
  useEffect(() => {
    if (!initialProject?.id && !formData.orderNumber) {
      peekNextOrderNumber().then(num => setFormData(prev => ({ ...prev, orderNumber: num })))
    }
  }, [initialProject?.id, formData.orderNumber])

  // Return unified API (backward compatible)
  return {
    formData,
    setFormData,
    fromSupplierInvoices: supplierInvoiceTotal > 0,
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
