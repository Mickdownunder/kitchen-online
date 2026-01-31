'use client'

import React, { useEffect, useState } from 'react'
import {
  Search,
  MapPin,
  History,
  Bot,
  User,
  ChevronDown,
  Loader2,
  Calendar,
  Building2,
  FileText,
  UserCircle,
} from 'lucide-react'
import { CustomerProject, Customer, Employee } from '@/types'
import { PaymentScheduleSection } from './PaymentScheduleSection'
import { getCompanySettings } from '@/lib/supabase/services'
import { DEFAULT_ORDER_FOOTER_TEMPLATES } from '@/lib/constants/orderFooterTemplates'

interface ProjectBasicsTabProps {
  formData: Partial<CustomerProject>
  setFormData: React.Dispatch<React.SetStateAction<Partial<CustomerProject>>>
  customers: Customer[]
  employees: Employee[]
  selectedCustomerId: string
  setSelectedCustomerId: (id: string) => void
  customerSearchTerm: string
  setCustomerSearchTerm: (term: string) => void
  showCustomerDropdown: boolean
  setShowCustomerDropdown: (show: boolean) => void
  addressSuggestions: Array<{ display: string; full: string }>
  setAddressSuggestions: (suggestions: Array<{ display: string; full: string }>) => void
  addressInput: string
  handleAddressInput: (value: string) => void
  filteredCustomers: Customer[]
  firstName: string
  setFirstName: (name: string) => void
  lastName: string
  setLastName: (name: string) => void
  salutation: string
  setSalutation: (salutation: string) => void
  isLoadingAddress: boolean
  setIsManualNameUpdate: (value: boolean) => void
  companyName: string
  setCompanyName: (name: string) => void
  taxId: string
  setTaxId: (id: string) => void
  contactPerson: string
  setContactPerson: (person: string) => void
}

export function ProjectBasicsTab({
  formData,
  setFormData,
  employees,
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
}: ProjectBasicsTabProps) {
  const [showSalespersonDropdown, setShowSalespersonDropdown] = useState(false)
  const [orderFooterTemplates, setOrderFooterTemplates] = useState<
    { name: string; body: string }[]
  >([])

  useEffect(() => {
    getCompanySettings().then(settings => {
      if (settings?.orderFooterTemplates?.length) {
        setOrderFooterTemplates(settings.orderFooterTemplates)
      } else {
        setOrderFooterTemplates(DEFAULT_ORDER_FOOTER_TEMPLATES)
      }
    })
  }, [])

  // Filter for salespersons (geschaeftsfuehrer, administration, verkaeufer can be assigned)
  const salespersons = employees.filter(
    emp =>
      emp.isActive &&
      (emp.role === 'verkaeufer' ||
        emp.role === 'geschaeftsfuehrer' ||
        emp.role === 'administration')
  )
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        !target.closest('.customer-dropdown-container') &&
        !target.closest('.address-autocomplete-container')
      ) {
        setShowCustomerDropdown(false)
        setAddressSuggestions([])
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [setShowCustomerDropdown, setAddressSuggestions])

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 grid grid-cols-1 gap-12 lg:grid-cols-3">
      {/* Status-Checkpoints - Jetzt oben links für bessere Sichtbarkeit */}
      <div className="order-1 lg:order-2 lg:col-span-1">
        <section className="shadow-lg/30 sticky top-8 space-y-5 rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50/90 to-slate-100/90 p-6">
          <div className="mb-2 flex items-center gap-3">
            <Calendar className="h-5 w-5 text-amber-500/80" />
            <h4 className="text-sm font-semibold uppercase tracking-widest text-slate-600">
              Termine
            </h4>
          </div>
          <div className="space-y-4">
            {/* Aufmaß */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-600">
                Aufmaß
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="flex-1 cursor-pointer rounded-xl bg-white px-4 py-3 text-sm font-medium outline-none ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-indigo-400"
                  value={formData.measurementDate || ''}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, measurementDate: e.target.value }))
                  }
                />
                <input
                  type="time"
                  className="w-24 cursor-pointer rounded-xl bg-white px-3 py-3 text-sm font-medium outline-none ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-indigo-400"
                  value={formData.measurementTime || ''}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, measurementTime: e.target.value }))
                  }
                  placeholder="Uhrzeit"
                />
              </div>
            </div>
            {/* Lieferung */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-600">
                Lieferung
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="flex-1 cursor-pointer rounded-xl bg-white px-4 py-3 text-sm font-medium outline-none ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-emerald-400"
                  value={formData.deliveryDate || ''}
                  onChange={e => setFormData(prev => ({ ...prev, deliveryDate: e.target.value }))}
                />
                <input
                  type="time"
                  className="w-24 cursor-pointer rounded-xl bg-white px-3 py-3 text-sm font-medium outline-none ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-emerald-400"
                  value={formData.deliveryTime || ''}
                  onChange={e => setFormData(prev => ({ ...prev, deliveryTime: e.target.value }))}
                  placeholder="Uhrzeit"
                />
              </div>
            </div>
            {/* Montage */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-600">
                Montage
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="flex-1 cursor-pointer rounded-xl bg-white px-4 py-3 text-sm font-medium outline-none ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-amber-400"
                  value={formData.installationDate || ''}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, installationDate: e.target.value }))
                  }
                />
                <input
                  type="time"
                  className="w-24 cursor-pointer rounded-xl bg-white px-3 py-3 text-sm font-medium outline-none ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-amber-400"
                  value={formData.installationTime || ''}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, installationTime: e.target.value }))
                  }
                  placeholder="Uhrzeit"
                />
              </div>
            </div>

            {/* Art der Abholung/Lieferung */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-600">
                Art der Abholung/Lieferung
              </label>
              <div className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="deliveryType"
                    value="delivery"
                    checked={(formData.deliveryType || 'delivery') === 'delivery'}
                    onChange={() =>
                      setFormData(prev => ({ ...prev, deliveryType: 'delivery' as const }))
                    }
                    className="h-4 w-4 cursor-pointer accent-amber-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Lieferung und Montage</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="deliveryType"
                    value="pickup"
                    checked={formData.deliveryType === 'pickup'}
                    onChange={() =>
                      setFormData(prev => ({ ...prev, deliveryType: 'pickup' as const }))
                    }
                    className="h-4 w-4 cursor-pointer accent-amber-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Abholer</span>
                </label>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="order-2 space-y-10 lg:order-1 lg:col-span-2">
        <section className="space-y-4">
          <h4 className="ml-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            Kunden-Details
          </h4>

          {/* Customer Selection */}
          <div className="customer-dropdown-container relative">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">
              Bestehenden Kunden auswählen
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-slate-500/70" />
              <input
                type="text"
                placeholder="Kunde suchen (Name oder E-Mail)..."
                value={customerSearchTerm}
                onChange={e => {
                  setCustomerSearchTerm(e.target.value)
                  setShowCustomerDropdown(true)
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                className="w-full rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 py-3 pl-10 pr-4 text-sm font-medium shadow-sm outline-none ring-1 ring-slate-200 transition-all hover:shadow-md hover:ring-amber-300 focus:bg-white focus:ring-2 focus:ring-amber-500"
              />
              {showCustomerDropdown && filteredCustomers.length > 0 && (
                <div
                  className="shadow-lg/50 absolute z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200/60 bg-white/95 backdrop-blur-sm"
                  onClick={e => e.stopPropagation()}
                >
                  {filteredCustomers.map(customer => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId(customer.id)
                        setCustomerSearchTerm(`${customer.firstName} ${customer.lastName}`)
                        setShowCustomerDropdown(false)
                      }}
                      className="w-full border-b border-slate-100 px-4 py-3 text-left transition-all last:border-0 hover:bg-slate-50"
                    >
                      <p className="font-bold text-slate-900">
                        {customer.firstName} {customer.lastName}
                      </p>
                      <p className="text-sm text-slate-500">{customer.contact.email}</p>
                      <p className="text-xs text-slate-400">
                        {customer.address.street}, {customer.address.city}
                      </p>
                    </button>
                  ))}
                </div>
              )}
              {showCustomerDropdown &&
                filteredCustomers.length === 0 &&
                customerSearchTerm.length > 0 && (
                  <div className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-4 text-center text-slate-500 shadow-2xl">
                    <p className="text-sm">Keine Kunden gefunden</p>
                  </div>
                )}
            </div>
            {selectedCustomerId && (
              <div className="mt-2 flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-3">
                <span className="text-sm font-bold text-green-700">Kunde ausgewählt</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomerId('')
                    setCustomerSearchTerm('')
                    setFormData(prev => ({ ...prev, customerId: undefined }))
                  }}
                  className="text-sm font-bold text-green-700 hover:text-green-900"
                >
                  Entfernen
                </button>
              </div>
            )}
          </div>

          {/* Anrede */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">
              Anrede
            </label>
            <select
              value={salutation}
              onChange={e => {
                const newSal = e.target.value
                setSalutation(newSal)
                if (newSal === 'Firma') {
                  // Bei Firma: Setze customerName auf Firmenname
                  setFormData(prev => ({
                    ...prev,
                    customerName: companyName || 'Firma',
                    companyName: companyName || prev.companyName,
                  }))
                } else {
                  const sal = newSal ? `${newSal} ` : ''
                  const newName = `${sal}${firstName} ${lastName}`.trim()
                  setFormData(prev => ({ ...prev, customerName: newName }))
                }
                setIsManualNameUpdate(true)
              }}
              className="w-full rounded-xl bg-gradient-to-br from-slate-50/80 to-slate-100/80 px-4 py-3 text-sm font-medium text-slate-700 outline-none ring-1 ring-slate-200/60 transition-all hover:ring-slate-300/60 focus:bg-white focus:ring-2 focus:ring-amber-400/50"
            >
              <option value="">-</option>
              <option value="Herr">Herr</option>
              <option value="Frau">Frau</option>
              <option value="Familie">Familie</option>
              <option value="Herr und Frau">Herr und Frau</option>
              <option value="Dr.">Dr.</option>
              <option value="Prof.">Prof.</option>
              <option value="Prof. Dr.">Prof. Dr.</option>
              <option value="Ing.">Ing.</option>
              <option value="Dipl.-Ing.">Dipl.-Ing.</option>
              <option value="Mag.">Mag.</option>
              <option value="Mag. Dr.">Mag. Dr.</option>
              <option value="Firma">Firma</option>
            </select>
          </div>

          {/* Conditional: Firma oder Privatperson */}
          {salutation === 'Firma' ? (
            <>
              {/* Firmenfelder */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">
                    <Building2 className="mr-1.5 inline h-3.5 w-3.5" />
                    Firmenname
                  </label>
                  <input
                    type="text"
                    placeholder="Firmenname"
                    value={companyName}
                    onChange={e => {
                      const newCompany = e.target.value
                      setCompanyName(newCompany)
                      setFormData(prev => ({
                        ...prev,
                        customerName: newCompany || 'Firma',
                        companyName: newCompany,
                      }))
                      setIsManualNameUpdate(true)
                    }}
                    className="w-full rounded-xl bg-gradient-to-br from-slate-50/80 to-slate-100/80 px-4 py-3 text-sm font-medium text-slate-700 outline-none ring-1 ring-slate-200/60 transition-all hover:ring-slate-300/60 focus:bg-white focus:ring-2 focus:ring-amber-400/50"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">
                    <FileText className="mr-1.5 inline h-3.5 w-3.5" />
                    ATU-Nummer / UID
                  </label>
                  <input
                    type="text"
                    placeholder="ATU12345678"
                    value={taxId}
                    onChange={e => {
                      const newTaxId = e.target.value
                      setTaxId(newTaxId)
                      setFormData(prev => ({ ...prev, taxId: newTaxId }))
                    }}
                    className="w-full rounded-xl bg-gradient-to-br from-slate-50/80 to-slate-100/80 px-4 py-3 text-sm font-medium text-slate-700 outline-none ring-1 ring-slate-200/60 transition-all hover:ring-slate-300/60 focus:bg-white focus:ring-2 focus:ring-amber-400/50"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">
                  <UserCircle className="mr-1.5 inline h-3.5 w-3.5" />
                  Ansprechpartner
                </label>
                <input
                  type="text"
                  placeholder="Name des Ansprechpartners"
                  value={contactPerson}
                  onChange={e => {
                    const newContact = e.target.value
                    setContactPerson(newContact)
                    setFormData(prev => ({ ...prev, contactPerson: newContact }))
                  }}
                  className="w-full rounded-xl bg-gradient-to-br from-slate-50/80 to-slate-100/80 px-4 py-3 text-sm font-medium text-slate-700 outline-none ring-1 ring-slate-200/60 transition-all hover:ring-slate-300/60 focus:bg-white focus:ring-2 focus:ring-amber-400/50"
                />
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Vorname
                </label>
                <input
                  type="text"
                  placeholder="Vorname"
                  value={firstName}
                  onChange={e => {
                    const newFirst = e.target.value
                    setFirstName(newFirst)
                    const sal = salutation ? `${salutation} ` : ''
                    const newName = `${sal}${newFirst} ${lastName}`.trim()
                    setFormData(prev => ({ ...prev, customerName: newName }))
                    setIsManualNameUpdate(true)
                  }}
                  className="w-full rounded-xl bg-gradient-to-br from-slate-50/80 to-slate-100/80 px-4 py-3 text-sm font-medium text-slate-700 outline-none ring-1 ring-slate-200/60 transition-all hover:ring-slate-300/60 focus:bg-white focus:ring-2 focus:ring-amber-400/50"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Nachname
                </label>
                <input
                  type="text"
                  placeholder="Nachname"
                  value={lastName}
                  onChange={e => {
                    const newLast = e.target.value
                    setLastName(newLast)
                    const sal = salutation ? `${salutation} ` : ''
                    const newName = `${sal}${firstName} ${newLast}`.trim()
                    setFormData(prev => ({ ...prev, customerName: newName }))
                    setIsManualNameUpdate(true)
                  }}
                  className="w-full rounded-xl bg-gradient-to-br from-slate-50/80 to-slate-100/80 px-4 py-3 text-sm font-medium text-slate-700 outline-none ring-1 ring-slate-200/60 transition-all hover:ring-slate-300/60 focus:bg-white focus:ring-2 focus:ring-amber-400/50"
                />
              </div>
            </div>
          )}

          {/* Address with real autocomplete */}
          <div className="address-autocomplete-container relative">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">
              Adresse
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 transform text-slate-500/70" />
              {isLoadingAddress && (
                <Loader2 className="absolute right-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 transform animate-spin text-amber-400/70" />
              )}
              <input
                type="text"
                placeholder="Straße, Hausnummer, PLZ, Stadt (z.B. Hauptstraße 1, 1010 Wien)"
                value={addressInput}
                onChange={e => handleAddressInput(e.target.value)}
                className="shadow-sm/50 hover:shadow-md/30 w-full rounded-xl bg-gradient-to-br from-slate-50/80 to-slate-100/80 py-3 pl-10 pr-10 text-sm font-medium text-slate-700 outline-none ring-1 ring-slate-200/60 transition-all hover:ring-slate-300/60 focus:bg-white focus:ring-2 focus:ring-amber-400/50"
              />
              {addressSuggestions.length > 0 && (
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                  {addressSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        handleAddressInput(suggestion.full)
                        setAddressSuggestions([])
                      }}
                      className="group w-full border-b border-slate-100/60 px-4 py-2.5 text-left transition-all last:border-0 hover:bg-gradient-to-r hover:from-amber-50/50 hover:to-amber-100/50"
                    >
                      <p className="text-sm font-medium text-slate-700 group-hover:text-amber-800">
                        {suggestion.display}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500/80 group-hover:text-amber-600/80">
                        {suggestion.full}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Auftragsdatum & Contact */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">
                Auftragsdatum
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-slate-500/70" />
                <input
                  type="date"
                  value={formData.orderDate || ''}
                  onChange={e => setFormData(prev => ({ ...prev, orderDate: e.target.value }))}
                  className="w-full rounded-xl bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">
                Telefon
              </label>
              <input
                type="tel"
                placeholder="Telefon"
                value={formData.phone || ''}
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">
                E-Mail
              </label>
              <input
                type="email"
                placeholder="E-Mail"
                value={formData.email || ''}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Salesperson Selection */}
          <div className="relative">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">
              Verkäufer / Betreuer
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform text-slate-400" />
              <button
                type="button"
                onClick={() => setShowSalespersonDropdown(!showSalespersonDropdown)}
                className="shadow-sm/50 hover:shadow-md/30 flex w-full items-center justify-between rounded-xl bg-gradient-to-br from-slate-50/80 to-slate-100/80 py-3 pl-10 pr-4 text-left text-sm font-medium text-slate-700 outline-none ring-1 ring-slate-200/60 transition-all hover:bg-white hover:ring-slate-300/60"
              >
                <span className={formData.salespersonName ? 'text-slate-900' : 'text-slate-400'}>
                  {formData.salespersonName || 'Verkäufer auswählen...'}
                </span>
                <ChevronDown
                  className={`h-5 w-5 text-slate-400 transition-transform ${showSalespersonDropdown ? 'rotate-180' : ''}`}
                />
              </button>
              {showSalespersonDropdown && (
                <div className="absolute z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        salespersonId: undefined,
                        salespersonName: undefined,
                      }))
                      setShowSalespersonDropdown(false)
                    }}
                    className="w-full border-b border-slate-100 px-4 py-3 text-left text-slate-400 transition-all hover:bg-slate-50"
                  >
                    Keinen Verkäufer zuweisen
                  </button>
                  {salespersons.length > 0 ? (
                    salespersons.map(emp => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            salespersonId: emp.id,
                            salespersonName: `${emp.firstName} ${emp.lastName}`,
                          }))
                          setShowSalespersonDropdown(false)
                        }}
                        className={`w-full border-b border-slate-100 px-4 py-3 text-left transition-all last:border-0 hover:bg-slate-50 ${
                          formData.salespersonId === emp.id ? 'bg-amber-50' : ''
                        }`}
                      >
                        <p className="font-bold text-slate-900">
                          {emp.firstName} {emp.lastName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {emp.role === 'geschaeftsfuehrer'
                            ? 'Geschäftsführer'
                            : emp.role === 'administration'
                              ? 'Administration'
                              : emp.role === 'buchhaltung'
                                ? 'Buchhaltung'
                                : emp.role === 'verkaeufer'
                                  ? 'Verkäufer'
                                  : emp.role === 'monteur'
                                    ? 'Monteur'
                                    : 'Unbekannt'}
                          {emp.commissionRate ? ` · ${emp.commissionRate}% Provision` : ''}
                        </p>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-center text-sm text-slate-500">
                      Keine Mitarbeiter vorhanden. Bitte unter &quot;Firmenstammdaten&quot; anlegen.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Invoice Number */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">
                Rechnungsnummer
              </label>
              <input
                type="text"
                placeholder="R-2025-001"
                value={formData.invoiceNumber || ''}
                onChange={e => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                className="w-full rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                const year = new Date().getFullYear()
                const number = String(
                  (formData.orderNumber?.match(/\d+$/) || ['0001'])[0]
                ).padStart(4, '0')
                setFormData(prev => ({ ...prev, invoiceNumber: `R-${year}-${number}` }))
              }}
              className="mt-6 rounded-2xl bg-amber-500 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-900 transition-all hover:bg-amber-600"
            >
              AUTO
            </button>
          </div>
        </section>

        {/* Payment Schedule */}
        <PaymentScheduleSection formData={formData} setFormData={setFormData} />

        {/* Hinweise für Auftrag (PDF) – oberhalb der KI-Protokollierung */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-400" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Hinweise für Auftrag (PDF)
            </h4>
          </div>
          <p className="text-xs text-slate-500">
            Dieser Text erscheint im Auftrags-PDF unter den Positionen, oberhalb der Unterschrift.
            Z. B. Zahlungsmodalitäten, Reklamationen-Hinweis, Unterschrift Kunde, Schlusstext.
          </p>
          {orderFooterTemplates.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Vorlage einfügen:</span>
              {orderFooterTemplates.map((t, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    const current = formData.orderFooterText ?? ''
                    const sep = current.length > 0 && !current.endsWith('\n') ? '\n\n' : ''
                    setFormData(prev => ({
                      ...prev,
                      orderFooterText: (prev.orderFooterText ?? '') + sep + t.body,
                    }))
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-amber-50 hover:ring-1 hover:ring-amber-300"
                >
                  {t.name || `Vorlage ${idx + 1}`}
                </button>
              ))}
            </div>
          ) : null}
          <textarea
            rows={6}
            placeholder="Zahlungsmodalitäten, Reklamationen, Unterschrift Kunde, Schlusstext..."
            className="min-h-[120px] w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-amber-400"
            value={formData.orderFooterText ?? ''}
            onChange={e =>
              setFormData(prev => ({ ...prev, orderFooterText: e.target.value || undefined }))
            }
          />
        </section>

        {/* Projekt-Verlauf / Notizen (KI-Protokollierung) – ganz unten */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-400" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Projekt-Verlauf / Notizen
            </h4>
          </div>
          <div className="rounded-[2rem] border border-white/5 bg-slate-900 p-8 shadow-inner">
            <textarea
              placeholder="Füge hier manuelle Notizen hinzu oder lass die KI protokollieren..."
              className="min-h-[150px] w-full resize-none border-none bg-transparent font-mono text-sm leading-relaxed text-amber-500 outline-none"
              value={formData.notes || ''}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
            <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4">
              <Bot className="h-4 w-4 text-slate-500" />
              <span className="text-[10px] font-bold uppercase italic tracking-widest text-slate-500">
                KI-Protokollierung aktiv
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
