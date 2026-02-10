'use client'

import React, { useEffect, useState } from 'react'
import { Bot, FileText, History } from 'lucide-react'
import { CustomerProject, Customer, Employee } from '@/types'
import { PaymentScheduleSection } from './PaymentScheduleSection'
import { getCompanySettings } from '@/lib/supabase/services'
import { DEFAULT_ORDER_FOOTER_TEMPLATES } from '@/lib/constants/orderFooterTemplates'
import { CustomerSection } from './basics/CustomerSection'
import { ScheduleSection } from './basics/ScheduleSection'

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
  setAddressSuggestions: (suggestions: Array<{ display: string; full: string }>) => void
  filteredCustomers: Customer[]
  firstName: string
  setFirstName: (name: string) => void
  lastName: string
  setLastName: (name: string) => void
  salutation: string
  setSalutation: (salutation: string) => void
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
  setAddressSuggestions,
  filteredCustomers,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  salutation,
  setSalutation,
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
    getCompanySettings().then((settings) => {
      if (settings?.orderFooterTemplates?.length) {
        setOrderFooterTemplates(settings.orderFooterTemplates)
      } else {
        setOrderFooterTemplates(DEFAULT_ORDER_FOOTER_TEMPLATES)
      }
    })
  }, [])

  const salespersons = employees.filter(
    (employee) =>
      employee.isActive &&
      (employee.role === 'verkaeufer' ||
        employee.role === 'geschaeftsfuehrer' ||
        employee.role === 'administration'),
  )

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
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
  }, [setAddressSuggestions, setShowCustomerDropdown])

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 grid grid-cols-1 gap-12 lg:grid-cols-3">
      <div className="order-1 lg:order-2 lg:col-span-1">
        <ScheduleSection formData={formData} setFormData={setFormData} />
      </div>

      <div className="order-2 space-y-10 lg:order-1 lg:col-span-2">
        <CustomerSection
          formData={formData}
          setFormData={setFormData}
          selectedCustomerId={selectedCustomerId}
          setSelectedCustomerId={setSelectedCustomerId}
          customerSearchTerm={customerSearchTerm}
          setCustomerSearchTerm={setCustomerSearchTerm}
          showCustomerDropdown={showCustomerDropdown}
          setShowCustomerDropdown={setShowCustomerDropdown}
          filteredCustomers={filteredCustomers}
          firstName={firstName}
          setFirstName={setFirstName}
          lastName={lastName}
          setLastName={setLastName}
          salutation={salutation}
          setSalutation={setSalutation}
          setIsManualNameUpdate={setIsManualNameUpdate}
          companyName={companyName}
          setCompanyName={setCompanyName}
          taxId={taxId}
          setTaxId={setTaxId}
          contactPerson={contactPerson}
          setContactPerson={setContactPerson}
          showSalespersonDropdown={showSalespersonDropdown}
          setShowSalespersonDropdown={setShowSalespersonDropdown}
          salespersons={salespersons}
        />

        <PaymentScheduleSection formData={formData} setFormData={setFormData} />

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
              {orderFooterTemplates.map((template, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    const current = formData.orderFooterText ?? ''
                    const separator = current.length > 0 && !current.endsWith('\n') ? '\n\n' : ''
                    setFormData((prev) => ({
                      ...prev,
                      orderFooterText: (prev.orderFooterText ?? '') + separator + template.body,
                    }))
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-amber-50 hover:ring-1 hover:ring-amber-300"
                >
                  {template.name || `Vorlage ${index + 1}`}
                </button>
              ))}
            </div>
          ) : null}
          <textarea
            rows={6}
            placeholder="Zahlungsmodalitäten, Reklamationen, Unterschrift Kunde, Schlusstext..."
            className="min-h-[120px] w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-amber-400"
            value={formData.orderFooterText ?? ''}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, orderFooterText: event.target.value || undefined }))
            }
          />
        </section>

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
              onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
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
