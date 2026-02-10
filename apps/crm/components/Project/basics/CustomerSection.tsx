import { Building2, FileText, Search, UserCircle } from 'lucide-react'
import { Customer, CustomerProject, Employee } from '@/types'
import { AddressSection } from './AddressSection'
import { SalesSection } from './SalesSection'
import { SetProjectFormData } from './types'

interface CustomerSectionProps {
  formData: Partial<CustomerProject>
  setFormData: SetProjectFormData
  selectedCustomerId: string
  setSelectedCustomerId: (id: string) => void
  customerSearchTerm: string
  setCustomerSearchTerm: (term: string) => void
  showCustomerDropdown: boolean
  setShowCustomerDropdown: (show: boolean) => void
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
  showSalespersonDropdown: boolean
  setShowSalespersonDropdown: (show: boolean) => void
  salespersons: Employee[]
}

export function CustomerSection({
  formData,
  setFormData,
  selectedCustomerId,
  setSelectedCustomerId,
  customerSearchTerm,
  setCustomerSearchTerm,
  showCustomerDropdown,
  setShowCustomerDropdown,
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
  showSalespersonDropdown,
  setShowSalespersonDropdown,
  salespersons,
}: CustomerSectionProps) {
  return (
    <section className="space-y-4">
      <h4 className="ml-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
        Kunden-Details
      </h4>

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
            onChange={(event) => {
              setCustomerSearchTerm(event.target.value)
              setShowCustomerDropdown(true)
            }}
            onFocus={() => setShowCustomerDropdown(true)}
            className="w-full rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 py-3 pl-10 pr-4 text-sm font-medium shadow-sm outline-none ring-1 ring-slate-200 transition-all hover:shadow-md hover:ring-amber-300 focus:bg-white focus:ring-2 focus:ring-amber-500"
          />
          {showCustomerDropdown && filteredCustomers.length > 0 && (
            <div
              className="shadow-lg/50 absolute z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200/60 bg-white/95 backdrop-blur-sm"
              onClick={(event) => event.stopPropagation()}
            >
              {filteredCustomers.map((customer) => (
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
          {showCustomerDropdown && filteredCustomers.length === 0 && customerSearchTerm.length > 0 && (
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
                setFormData((prev) => ({ ...prev, customerId: undefined }))
              }}
              className="text-sm font-bold text-green-700 hover:text-green-900"
            >
              Entfernen
            </button>
          </div>
        )}
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">
          Anrede
        </label>
        <select
          value={salutation}
          onChange={(event) => {
            const newSalutation = event.target.value
            setSalutation(newSalutation)
            if (newSalutation === 'Firma') {
              setFormData((prev) => ({
                ...prev,
                customerName: companyName || 'Firma',
                companyName: companyName || prev.companyName,
              }))
            } else {
              const salutationPrefix = newSalutation ? `${newSalutation} ` : ''
              const nextName = `${salutationPrefix}${firstName} ${lastName}`.trim()
              setFormData((prev) => ({ ...prev, customerName: nextName }))
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

      {salutation === 'Firma' ? (
        <>
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
                onChange={(event) => {
                  const nextCompany = event.target.value
                  setCompanyName(nextCompany)
                  setFormData((prev) => ({
                    ...prev,
                    customerName: nextCompany || 'Firma',
                    companyName: nextCompany,
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
                onChange={(event) => {
                  const nextTaxId = event.target.value
                  setTaxId(nextTaxId)
                  setFormData((prev) => ({ ...prev, taxId: nextTaxId }))
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
              onChange={(event) => {
                const nextContact = event.target.value
                setContactPerson(nextContact)
                setFormData((prev) => ({ ...prev, contactPerson: nextContact }))
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
              onChange={(event) => {
                const nextFirst = event.target.value
                setFirstName(nextFirst)
                const salutationPrefix = salutation ? `${salutation} ` : ''
                const nextName = `${salutationPrefix}${nextFirst} ${lastName}`.trim()
                setFormData((prev) => ({ ...prev, customerName: nextName }))
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
              onChange={(event) => {
                const nextLast = event.target.value
                setLastName(nextLast)
                const salutationPrefix = salutation ? `${salutation} ` : ''
                const nextName = `${salutationPrefix}${firstName} ${nextLast}`.trim()
                setFormData((prev) => ({ ...prev, customerName: nextName }))
                setIsManualNameUpdate(true)
              }}
              className="w-full rounded-xl bg-gradient-to-br from-slate-50/80 to-slate-100/80 px-4 py-3 text-sm font-medium text-slate-700 outline-none ring-1 ring-slate-200/60 transition-all hover:ring-slate-300/60 focus:bg-white focus:ring-2 focus:ring-amber-400/50"
            />
          </div>
        </div>
      )}

      <AddressSection formData={formData} setFormData={setFormData} />

      <SalesSection
        formData={formData}
        setFormData={setFormData}
        showSalespersonDropdown={showSalespersonDropdown}
        setShowSalespersonDropdown={setShowSalespersonDropdown}
        salespersons={salespersons}
      />
    </section>
  )
}
