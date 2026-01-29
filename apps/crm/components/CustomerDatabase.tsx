'use client'

import React, { useState } from 'react'
import { Customer } from '@/types'
import { UserPlus, Search, Building2, Mail, Phone, MapPin } from 'lucide-react'

interface CustomerDatabaseProps {
  customers: Customer[]
  onSelectCustomer: (customer: Customer) => void
  onSaveCustomer: (customer: Customer) => void
  onDeleteCustomer: (id: string) => void
}

const CustomerDatabase: React.FC<CustomerDatabaseProps> = ({
  customers,
  onSelectCustomer,
  onSaveCustomer,
  onDeleteCustomer,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [showForm, setShowForm] = useState(false)

  const filteredCustomers = customers.filter(
    c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contact.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Kundenstamm</h2>
          <p className="mt-1 text-sm text-slate-500">Professionelle Kundenverwaltung</p>
        </div>
        <button
          onClick={() => {
            setEditingCustomer(null)
            setShowForm(true)
          }}
          className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-900 transition-all hover:bg-amber-600"
        >
          <UserPlus className="h-4 w-4" /> Neuer Kunde
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform text-slate-400" />
        <input
          type="text"
          placeholder="Kunde suchen (Name, Firma, E-Mail)..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {/* Customer List */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCustomers.map(customer => (
          <div
            key={customer.id}
            onClick={() => onSelectCustomer(customer)}
            className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-amber-500 hover:shadow-lg"
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {customer.salutation} {customer.firstName} {customer.lastName}
                </h3>
                {customer.companyName && (
                  <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                    <Building2 className="h-3 w-3" /> {customer.companyName}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2 text-slate-600">
                <MapPin className="h-4 w-4 text-slate-400" />
                {customer.address.street} {customer.address.houseNumber},{' '}
                {customer.address.postalCode} {customer.address.city}
              </p>
              <p className="flex items-center gap-2 text-slate-600">
                <Phone className="h-4 w-4 text-slate-400" />
                {customer.contact.phone}
              </p>
              <p className="flex items-center gap-2 text-slate-600">
                <Mail className="h-4 w-4 text-slate-400" />
                {customer.contact.email}
              </p>
            </div>

            <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
              <button
                onClick={e => {
                  e.stopPropagation()
                  setEditingCustomer(customer)
                  setShowForm(true)
                }}
                className="flex-1 rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition-all hover:bg-slate-200"
              >
                Bearbeiten
              </button>
              <button
                onClick={e => {
                  e.stopPropagation()
                  if (confirm('Kunde wirklich löschen?')) {
                    onDeleteCustomer(customer.id)
                  }
                }}
                className="rounded-lg bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition-all hover:bg-red-100"
              >
                Löschen
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Customer Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-8">
            <h3 className="mb-6 text-2xl font-black text-slate-900">
              {editingCustomer ? 'Kunde bearbeiten' : 'Neuer Kunde'}
            </h3>

            <CustomerForm
              customer={editingCustomer}
              onSave={customer => {
                onSaveCustomer(customer)
                setShowForm(false)
                setEditingCustomer(null)
              }}
              onCancel={() => {
                setShowForm(false)
                setEditingCustomer(null)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Customer Form Component
interface CustomerFormProps {
  customer: Customer | null
  onSave: (customer: Customer) => void
  onCancel: () => void
}

const CustomerForm: React.FC<CustomerFormProps> = ({ customer, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Customer>>({
    salutation: 'Herr',
    firstName: '',
    lastName: '',
    companyName: '',
    address: {
      street: '',
      houseNumber: '',
      postalCode: '',
      city: '',
      country: 'Österreich',
    },
    contact: {
      phone: '',
      mobile: '',
      email: '',
      alternativeEmail: '',
    },
    taxId: '',
    paymentTerms: 14,
    notes: '',
    ...customer,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newCustomer: Customer = {
      id: customer?.id || Date.now().toString(),
      firstName: formData.firstName!,
      lastName: formData.lastName!,
      companyName: formData.companyName,
      salutation: formData.salutation || 'Herr',
      address: formData.address!,
      contact: formData.contact!,
      taxId: formData.taxId,
      paymentTerms: formData.paymentTerms,
      notes: formData.notes,
      createdAt: customer?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    onSave(newCustomer)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <select
          value={formData.salutation}
          onChange={e =>
            setFormData({ ...formData, salutation: e.target.value as 'Herr' | 'Frau' | 'Firma' })
          }
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
        >
          <option value="Herr">Herr</option>
          <option value="Frau">Frau</option>
          <option value="Firma">Firma</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <input
          placeholder="Vorname *"
          value={formData.firstName}
          onChange={e => setFormData({ ...formData, firstName: e.target.value })}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
          required
        />
        <input
          placeholder="Nachname *"
          value={formData.lastName}
          onChange={e => setFormData({ ...formData, lastName: e.target.value })}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
          required
        />
      </div>

      <input
        placeholder="Firmenname (optional)"
        value={formData.companyName}
        onChange={e => setFormData({ ...formData, companyName: e.target.value })}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
      />

      <div className="grid grid-cols-3 gap-4">
        <input
          placeholder="Straße *"
          value={formData.address?.street}
          onChange={e =>
            setFormData({ ...formData, address: { ...formData.address!, street: e.target.value } })
          }
          className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
          required
        />
        <input
          placeholder="Hausnummer"
          value={formData.address?.houseNumber}
          onChange={e =>
            setFormData({
              ...formData,
              address: { ...formData.address!, houseNumber: e.target.value },
            })
          }
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <input
          placeholder="PLZ *"
          value={formData.address?.postalCode}
          onChange={e =>
            setFormData({
              ...formData,
              address: { ...formData.address!, postalCode: e.target.value },
            })
          }
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
          required
        />
        <input
          placeholder="Stadt *"
          value={formData.address?.city}
          onChange={e =>
            setFormData({ ...formData, address: { ...formData.address!, city: e.target.value } })
          }
          className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <input
          placeholder="Telefon *"
          value={formData.contact?.phone}
          onChange={e =>
            setFormData({ ...formData, contact: { ...formData.contact!, phone: e.target.value } })
          }
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
          required
        />
        <input
          placeholder="Mobil"
          value={formData.contact?.mobile}
          onChange={e =>
            setFormData({ ...formData, contact: { ...formData.contact!, mobile: e.target.value } })
          }
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <input
          type="email"
          placeholder="E-Mail *"
          value={formData.contact?.email}
          onChange={e =>
            setFormData({ ...formData, contact: { ...formData.contact!, email: e.target.value } })
          }
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
          required
        />
        <input
          type="email"
          placeholder="Alternative E-Mail"
          value={formData.contact?.alternativeEmail}
          onChange={e =>
            setFormData({
              ...formData,
              contact: { ...formData.contact!, alternativeEmail: e.target.value },
            })
          }
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <input
          placeholder="UID/Steuernummer"
          value={formData.taxId}
          onChange={e => setFormData({ ...formData, taxId: e.target.value })}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
        />
        <input
          type="number"
          placeholder="Zahlungsziel (Tage)"
          value={formData.paymentTerms}
          onChange={e => setFormData({ ...formData, paymentTerms: parseInt(e.target.value) || 14 })}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
        />
      </div>

      <textarea
        placeholder="Notizen"
        value={formData.notes}
        onChange={e => setFormData({ ...formData, notes: e.target.value })}
        className="min-h-[100px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
      />

      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl bg-slate-100 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-700 transition-all hover:bg-slate-200"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          className="flex-1 rounded-xl bg-amber-500 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-900 transition-all hover:bg-amber-600"
        >
          Speichern
        </button>
      </div>
    </form>
  )
}

export default CustomerDatabase
