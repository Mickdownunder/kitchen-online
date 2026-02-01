'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Loader2,
  Package,
  Calendar,
  Shield,
  Phone,
  Mail,
  ExternalLink
} from 'lucide-react'
import { useToast } from '@/components/providers/ToastProvider'
import { logger } from '@/lib/utils/logger'

interface Appliance {
  id: string
  manufacturer: string
  model: string
  category: string
  serial_number: string | null
  purchase_date: string | null
  installation_date: string | null
  warranty_until: string | null
  manufacturer_support_url: string | null
  manufacturer_support_phone: string | null
  manufacturer_support_email: string | null
  notes: string | null
  created_at: string
}

const CATEGORIES = [
  'Backofen',
  'Kochfeld',
  'Geschirrspüler',
  'Kühlschrank',
  'Gefrierschrank',
  'Kühl-Gefrier-Kombi',
  'Dunstabzug',
  'Mikrowelle',
  'Kaffeevollautomat',
  'Wärmeschublade',
  'Weinkühlschrank',
  'Waschmaschine',
  'Trockner',
  'Spüle',
  'Armatur',
  'Sonstiges',
]

const MANUFACTURERS = [
  'Miele',
  'Siemens',
  'Bosch',
  'AEG',
  'Neff',
  'Gaggenau',
  'Liebherr',
  'Samsung',
  'LG',
  'Bora',
  'Berbel',
  'Franke',
  'Blanco',
  'Grohe',
  'Hansgrohe',
  'Sonstige',
]

interface ApplianceFormData {
  manufacturer: string
  model: string
  category: string
  serialNumber: string
  purchaseDate: string
  installationDate: string
  warrantyUntil: string
  manufacturerSupportUrl: string
  manufacturerSupportPhone: string
  manufacturerSupportEmail: string
  notes: string
}

interface ProjectAppliancesTabProps {
  projectId: string
}

export default function ProjectAppliancesTab({ projectId }: ProjectAppliancesTabProps) {
  const { success, error: showError } = useToast()
  const [appliances, setAppliances] = useState<Appliance[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState<ApplianceFormData>({
    manufacturer: '',
    model: '',
    category: '',
    serialNumber: '',
    purchaseDate: '',
    installationDate: '',
    warrantyUntil: '',
    manufacturerSupportUrl: '',
    manufacturerSupportPhone: '',
    manufacturerSupportEmail: '',
    notes: '',
  })

  const loadAppliances = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/appliances?projectId=${projectId}`)
      const data = await response.json()
      
      if (data.success) {
        setAppliances(data.data || [])
      } else {
        showError('Fehler beim Laden der Geräte')
      }
    } catch (err) {
      logger.error('Error loading appliances', { component: 'ProjectAppliancesTab' }, err as Error)
      showError('Fehler beim Laden der Geräte')
    } finally {
      setLoading(false)
    }
  }, [projectId, showError])

  useEffect(() => {
    if (projectId) {
      loadAppliances()
    }
  }, [projectId, loadAppliances])

  const resetForm = () => {
    setFormData({
      manufacturer: '',
      model: '',
      category: '',
      serialNumber: '',
      purchaseDate: '',
      installationDate: '',
      warrantyUntil: '',
      manufacturerSupportUrl: '',
      manufacturerSupportPhone: '',
      manufacturerSupportEmail: '',
      notes: '',
    })
  }

  const handleAdd = async () => {
    if (!formData.manufacturer || !formData.model || !formData.category) {
      showError('Bitte füllen Sie Hersteller, Modell und Kategorie aus')
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/appliances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          ...formData,
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        success('Gerät hinzugefügt')
        setShowAddForm(false)
        resetForm()
        loadAppliances()
      } else {
        showError(data.error || 'Fehler beim Hinzufügen')
      }
    } catch (err) {
      logger.error('Error adding appliance', { component: 'ProjectAppliancesTab' }, err as Error)
      showError('Fehler beim Hinzufügen')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (id: string) => {
    try {
      setSaving(true)
      const response = await fetch(`/api/appliances/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      
      if (data.success) {
        success('Gerät aktualisiert')
        setEditingId(null)
        resetForm()
        loadAppliances()
      } else {
        showError(data.error || 'Fehler beim Aktualisieren')
      }
    } catch (err) {
      logger.error('Error updating appliance', { component: 'ProjectAppliancesTab' }, err as Error)
      showError('Fehler beim Aktualisieren')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Gerät wirklich löschen?')) return

    try {
      const response = await fetch(`/api/appliances/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      
      if (data.success) {
        success('Gerät gelöscht')
        loadAppliances()
      } else {
        showError(data.error || 'Fehler beim Löschen')
      }
    } catch (err) {
      logger.error('Error deleting appliance', { component: 'ProjectAppliancesTab' }, err as Error)
      showError('Fehler beim Löschen')
    }
  }

  const startEdit = (appliance: Appliance) => {
    setEditingId(appliance.id)
    setFormData({
      manufacturer: appliance.manufacturer,
      model: appliance.model,
      category: appliance.category,
      serialNumber: appliance.serial_number || '',
      purchaseDate: appliance.purchase_date || '',
      installationDate: appliance.installation_date || '',
      warrantyUntil: appliance.warranty_until || '',
      manufacturerSupportUrl: appliance.manufacturer_support_url || '',
      manufacturerSupportPhone: appliance.manufacturer_support_phone || '',
      manufacturerSupportEmail: appliance.manufacturer_support_email || '',
      notes: appliance.notes || '',
    })
    setShowAddForm(false)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setShowAddForm(false)
    resetForm()
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Geräte</h3>
          <p className="text-sm text-slate-500">{appliances.length} Geräte eingetragen</p>
        </div>
        {!showAddForm && !editingId && (
          <button
            onClick={() => {
              setShowAddForm(true)
              resetForm()
            }}
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-amber-400"
          >
            <Plus className="h-4 w-4" />
            Gerät hinzufügen
          </button>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h4 className="mb-4 font-medium text-slate-900">Neues Gerät</h4>
          <ApplianceForm
            formData={formData}
            setFormData={setFormData}
            onSave={handleAdd}
            onCancel={cancelEdit}
            saving={saving}
          />
        </div>
      )}

      {/* Appliances List */}
      {appliances.length === 0 && !showAddForm ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <Package className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 text-slate-600">Noch keine Geräte eingetragen</p>
          <p className="mt-1 text-sm text-slate-400">
            Fügen Sie die installierten Geräte mit E-Nummern hinzu
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {appliances.map((appliance) => (
            <div
              key={appliance.id}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              {editingId === appliance.id ? (
                <ApplianceForm
                  formData={formData}
                  setFormData={setFormData}
                  onSave={() => handleUpdate(appliance.id)}
                  onCancel={cancelEdit}
                  saving={saving}
                />
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {appliance.manufacturer} {appliance.model}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {appliance.category}
                      </span>
                    </div>
                    
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
                      {appliance.serial_number && (
                        <span className="font-mono">E-Nr: {appliance.serial_number}</span>
                      )}
                      {appliance.installation_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(appliance.installation_date).toLocaleDateString('de-DE')}
                        </span>
                      )}
                      {appliance.warranty_until && (
                        <span className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          Garantie bis {new Date(appliance.warranty_until).toLocaleDateString('de-DE')}
                        </span>
                      )}
                    </div>

                    {(appliance.manufacturer_support_phone || appliance.manufacturer_support_email || appliance.manufacturer_support_url) && (
                      <div className="mt-2 flex gap-2">
                        {appliance.manufacturer_support_phone && (
                          <a href={`tel:${appliance.manufacturer_support_phone}`} className="text-blue-600 hover:underline text-xs flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {appliance.manufacturer_support_phone}
                          </a>
                        )}
                        {appliance.manufacturer_support_email && (
                          <a href={`mailto:${appliance.manufacturer_support_email}`} className="text-blue-600 hover:underline text-xs flex items-center gap-1">
                            <Mail className="h-3 w-3" /> E-Mail
                          </a>
                        )}
                        {appliance.manufacturer_support_url && (
                          <a href={appliance.manufacturer_support_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" /> Support
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(appliance)}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(appliance.id)}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Form Component
function ApplianceForm({
  formData,
  setFormData,
  onSave,
  onCancel,
  saving,
}: {
  formData: ApplianceFormData
  setFormData: (data: ApplianceFormData) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Hersteller *</label>
          <select
            value={formData.manufacturer}
            onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">Auswählen...</option>
            {MANUFACTURERS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Modell *</label>
          <input
            type="text"
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            placeholder="z.B. G 7000 SCi"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Kategorie *</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">Auswählen...</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">E-Nummer / Seriennummer</label>
          <input
            type="text"
            value={formData.serialNumber}
            onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
            placeholder="z.B. 12345678"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Kaufdatum</label>
          <input
            type="date"
            value={formData.purchaseDate}
            onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Installationsdatum</label>
          <input
            type="date"
            value={formData.installationDate}
            onChange={(e) => setFormData({ ...formData, installationDate: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Garantie bis</label>
          <input
            type="date"
            value={formData.warrantyUntil}
            onChange={(e) => setFormData({ ...formData, warrantyUntil: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Support-Telefon</label>
          <input
            type="tel"
            value={formData.manufacturerSupportPhone}
            onChange={(e) => setFormData({ ...formData, manufacturerSupportPhone: e.target.value })}
            placeholder="z.B. 0800 123 456"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Support-E-Mail</label>
          <input
            type="email"
            value={formData.manufacturerSupportEmail}
            onChange={(e) => setFormData({ ...formData, manufacturerSupportEmail: e.target.value })}
            placeholder="service@hersteller.de"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Support-Website</label>
          <input
            type="url"
            value={formData.manufacturerSupportUrl}
            onChange={(e) => setFormData({ ...formData, manufacturerSupportUrl: e.target.value })}
            placeholder="https://..."
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Notizen</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={2}
          placeholder="Zusätzliche Informationen..."
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <X className="h-4 w-4" />
          Abbrechen
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-amber-400 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Speichern
        </button>
      </div>
    </div>
  )
}
