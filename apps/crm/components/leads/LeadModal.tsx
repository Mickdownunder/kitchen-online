'use client'

import React, { useState } from 'react'
import {
  X,
  User,
  Phone,
  Mail,
  Calendar,
  Video,
  Clock,
  FileText,
  ArrowRight,
  Trash2,
  MapPin,
  Copy,
  Check,
} from 'lucide-react'
import { CustomerProject } from '@/types'

interface LeadModalProps {
  lead: CustomerProject
  isOpen: boolean
  onClose: () => void
  onConvertToOrder: () => void
  onDelete: () => void
  onUpdateNotes: (notes: string) => void
}

export const LeadModal: React.FC<LeadModalProps> = ({
  lead,
  isOpen,
  onClose,
  onConvertToOrder,
  onDelete,
  onUpdateNotes,
}) => {
  const [notes, setNotes] = useState(lead.notes || '')
  const [copiedCode, setCopiedCode] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  if (!isOpen) return null

  // Parse meeting link from notes
  const meetingLinkMatch = lead.notes?.match(/Meeting-Link:\s*(https?:\/\/[^\s\n]+)/)
  const meetingLink = meetingLinkMatch ? meetingLinkMatch[1] : null

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('de-AT', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  const handleCopyAccessCode = async () => {
    if (lead.accessCode) {
      await navigator.clipboard.writeText(lead.accessCode)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  const handleSaveNotes = () => {
    onUpdateNotes(notes)
  }

  const handleDelete = () => {
    if (isDeleting) {
      onDelete()
    } else {
      setIsDeleting(true)
      setTimeout(() => setIsDeleting(false), 3000)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative mx-4 w-full max-w-2xl animate-in zoom-in-95 rounded-3xl bg-white shadow-2xl duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-lg shadow-amber-500/30">
              <User className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">{lead.customerName}</h2>
              <p className="text-sm text-slate-500">Lead • {lead.orderNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-8">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Kontaktdaten */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
                <User className="h-4 w-4" />
                Kontaktdaten
              </h3>
              <div className="rounded-2xl bg-slate-50 p-4 space-y-3">
                {lead.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-slate-400" />
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      {lead.email}
                    </a>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-slate-400" />
                    <a
                      href={`tel:${lead.phone}`}
                      className="text-sm font-medium text-slate-700 hover:text-blue-600"
                    >
                      {lead.phone}
                    </a>
                  </div>
                )}
                {lead.address && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-slate-400" />
                    <span className="text-sm text-slate-700">{lead.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Termin */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
                <Calendar className="h-4 w-4" />
                Termin
              </h3>
              <div className="rounded-2xl bg-slate-50 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-amber-500" />
                  <span className="text-sm font-medium text-slate-700">
                    {formatDate(lead.measurementDate || lead.createdAt)}
                  </span>
                </div>
                {lead.measurementTime && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-slate-400" />
                    <span className="text-sm text-slate-700">{lead.measurementTime} Uhr</span>
                  </div>
                )}
                {meetingLink && (
                  <a
                    href={meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl bg-blue-100 p-3 text-blue-700 transition-all hover:bg-blue-200"
                  >
                    <Video className="h-5 w-5" />
                    <span className="text-sm font-bold">Meeting beitreten</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Portal-Zugangscode */}
          {lead.accessCode && (
            <div className="mt-6 space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
                Portal-Zugang
              </h3>
              <div className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4">
                <div className="flex-1">
                  <p className="text-xs text-amber-600">Zugangscode für Kundenportal:</p>
                  <p className="font-mono text-lg font-bold text-amber-800">{lead.accessCode}</p>
                </div>
                <button
                  onClick={handleCopyAccessCode}
                  className="rounded-xl bg-amber-100 p-3 text-amber-700 transition-all hover:bg-amber-200"
                >
                  {copiedCode ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                </button>
              </div>
            </div>
          )}

          {/* Notizen */}
          <div className="mt-6 space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
              <FileText className="h-4 w-4" />
              Notizen
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleSaveNotes}
              placeholder="Notizen zum Lead hinzufügen..."
              className="w-full rounded-2xl border border-slate-200 p-4 text-sm outline-none transition-all focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
              rows={4}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-8 py-6">
          <button
            onClick={handleDelete}
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
              isDeleting
                ? 'bg-red-500 text-white'
                : 'text-slate-400 hover:bg-red-50 hover:text-red-500'
            }`}
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? 'Nochmal klicken zum Löschen' : 'Lead löschen'}
          </button>
          <button
            onClick={onConvertToOrder}
            className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-sm font-black text-white shadow-xl shadow-emerald-500/30 transition-all hover:from-emerald-600 hover:to-emerald-700 active:scale-95"
          >
            Zum Auftrag umwandeln
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
