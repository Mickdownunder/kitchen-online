import { CustomerProject } from '@/types'
import { SetProjectFormData } from './types'

interface AddressSectionProps {
  formData: Partial<CustomerProject>
  setFormData: SetProjectFormData
}

export function AddressSection({ formData, setFormData }: AddressSectionProps) {
  return (
    <div className="space-y-3">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">
        Adresse
      </label>
      <div className="grid grid-cols-3 gap-3">
        <input
          type="text"
          placeholder="Straße"
          value={formData.addressStreet ?? ''}
          onChange={(event) => setFormData((prev) => ({ ...prev, addressStreet: event.target.value }))}
          className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none ring-1 ring-slate-200/60 transition-all focus:ring-2 focus:ring-amber-400/50"
        />
        <input
          type="text"
          placeholder="Hausnummer"
          value={formData.addressHouseNumber ?? ''}
          onChange={(event) => setFormData((prev) => ({ ...prev, addressHouseNumber: event.target.value }))}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none ring-1 ring-slate-200/60 transition-all focus:ring-2 focus:ring-amber-400/50"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <input
          type="text"
          placeholder="PLZ"
          value={formData.addressPostalCode ?? ''}
          onChange={(event) => setFormData((prev) => ({ ...prev, addressPostalCode: event.target.value }))}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none ring-1 ring-slate-200/60 transition-all focus:ring-2 focus:ring-amber-400/50"
        />
        <input
          type="text"
          placeholder="Stadt"
          value={formData.addressCity ?? ''}
          onChange={(event) => setFormData((prev) => ({ ...prev, addressCity: event.target.value }))}
          className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none ring-1 ring-slate-200/60 transition-all focus:ring-2 focus:ring-amber-400/50"
        />
      </div>
    </div>
  )
}
