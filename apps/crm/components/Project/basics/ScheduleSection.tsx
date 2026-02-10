import { Calendar } from 'lucide-react'
import { CustomerProject } from '@/types'
import { SetProjectFormData } from './types'

interface ScheduleSectionProps {
  formData: Partial<CustomerProject>
  setFormData: SetProjectFormData
}

export function ScheduleSection({ formData, setFormData }: ScheduleSectionProps) {
  return (
    <section className="shadow-lg/30 sticky top-8 space-y-5 rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50/90 to-slate-100/90 p-6">
      <div className="mb-2 flex items-center gap-3">
        <Calendar className="h-5 w-5 text-amber-500/80" />
        <h4 className="text-sm font-semibold uppercase tracking-widest text-slate-600">Termine</h4>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-600">
              Aufmaß
            </label>
            {(formData.measurementDate || formData.measurementTime) && (
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    measurementDate: undefined,
                    measurementTime: undefined,
                  }))
                }
                className="text-xs font-medium text-slate-500 underline hover:text-slate-700"
              >
                Zurücksetzen
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              className="flex-1 cursor-pointer rounded-xl bg-white px-4 py-3 text-sm font-medium outline-none ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-indigo-400"
              value={formData.measurementDate || ''}
              onChange={(event) => setFormData((prev) => ({ ...prev, measurementDate: event.target.value }))}
            />
            <input
              type="time"
              className="w-24 cursor-pointer rounded-xl bg-white px-3 py-3 text-sm font-medium outline-none ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-indigo-400"
              value={formData.measurementTime || ''}
              onChange={(event) => setFormData((prev) => ({ ...prev, measurementTime: event.target.value }))}
              placeholder="Uhrzeit"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-widest text-slate-600">
            Lieferung
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              className="flex-1 cursor-pointer rounded-xl bg-white px-4 py-3 text-sm font-medium outline-none ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-emerald-400"
              value={formData.deliveryDate || ''}
              onChange={(event) => setFormData((prev) => ({ ...prev, deliveryDate: event.target.value }))}
            />
            <input
              type="time"
              className="w-24 cursor-pointer rounded-xl bg-white px-3 py-3 text-sm font-medium outline-none ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-emerald-400"
              value={formData.deliveryTime || ''}
              onChange={(event) => setFormData((prev) => ({ ...prev, deliveryTime: event.target.value }))}
              placeholder="Uhrzeit"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-widest text-slate-600">
            Montage
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              className="flex-1 cursor-pointer rounded-xl bg-white px-4 py-3 text-sm font-medium outline-none ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-amber-400"
              value={formData.installationDate || ''}
              onChange={(event) => setFormData((prev) => ({ ...prev, installationDate: event.target.value }))}
            />
            <input
              type="time"
              className="w-24 cursor-pointer rounded-xl bg-white px-3 py-3 text-sm font-medium outline-none ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-amber-400"
              value={formData.installationTime || ''}
              onChange={(event) => setFormData((prev) => ({ ...prev, installationTime: event.target.value }))}
              placeholder="Uhrzeit"
            />
          </div>
        </div>

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
                onChange={() => setFormData((prev) => ({ ...prev, deliveryType: 'delivery' as const }))}
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
                onChange={() => setFormData((prev) => ({ ...prev, deliveryType: 'pickup' as const }))}
                className="h-4 w-4 cursor-pointer accent-amber-500"
              />
              <span className="text-sm font-medium text-slate-700">Abholer</span>
            </label>
          </div>
        </div>
      </div>
    </section>
  )
}
