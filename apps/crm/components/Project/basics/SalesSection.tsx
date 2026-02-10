import { Calendar, ChevronDown, User } from 'lucide-react'
import { CustomerProject, Employee } from '@/types'
import { SetProjectFormData } from './types'

interface SalesSectionProps {
  formData: Partial<CustomerProject>
  setFormData: SetProjectFormData
  showSalespersonDropdown: boolean
  setShowSalespersonDropdown: (show: boolean) => void
  salespersons: Employee[]
}

function getRoleLabel(role: Employee['role']): string {
  if (role === 'geschaeftsfuehrer') return 'Geschäftsführer'
  if (role === 'administration') return 'Administration'
  if (role === 'buchhaltung') return 'Buchhaltung'
  if (role === 'verkaeufer') return 'Verkäufer'
  if (role === 'monteur') return 'Monteur'
  return 'Unbekannt'
}

export function SalesSection({
  formData,
  setFormData,
  showSalespersonDropdown,
  setShowSalespersonDropdown,
  salespersons,
}: SalesSectionProps) {
  return (
    <>
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
                  setFormData((prev) => ({
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
                salespersons.map((employee) => (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        salespersonId: employee.id,
                        salespersonName: `${employee.firstName} ${employee.lastName}`,
                      }))
                      setShowSalespersonDropdown(false)
                    }}
                    className={`w-full border-b border-slate-100 px-4 py-3 text-left transition-all last:border-0 hover:bg-slate-50 ${
                      formData.salespersonId === employee.id ? 'bg-amber-50' : ''
                    }`}
                  >
                    <p className="font-bold text-slate-900">
                      {employee.firstName} {employee.lastName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {getRoleLabel(employee.role)}
                      {employee.commissionRate ? ` · ${employee.commissionRate}% Provision` : ''}
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
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  orderDate: event.target.value,
                }))
              }
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
            onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
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
            onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
            className="w-full rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">
            Rechnungsnummer
          </label>
          <input
            type="text"
            placeholder="R-2025-001"
            value={formData.invoiceNumber || ''}
            onChange={(event) => setFormData((prev) => ({ ...prev, invoiceNumber: event.target.value }))}
            className="w-full rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            const year = new Date().getFullYear()
            const number = String((formData.orderNumber?.match(/\d+$/) || ['0001'])[0]).padStart(4, '0')
            setFormData((prev) => ({ ...prev, invoiceNumber: `R-${year}-${number}` }))
          }}
          className="mt-6 rounded-2xl bg-amber-500 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-900 transition-all hover:bg-amber-600"
        >
          AUTO
        </button>
      </div>
    </>
  )
}
