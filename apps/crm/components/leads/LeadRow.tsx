'use client'

import React from 'react'
import {
  Calendar,
  Phone,
  Mail,
  Video,
  ArrowRight,
  Trash2,
  Clock,
  User,
} from 'lucide-react'
import { CustomerProject } from '@/types'
import { formatDate } from '@/lib/utils'

interface LeadRowProps {
  lead: CustomerProject
  onOpen: () => void
  onConvertToOrder: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
}

/**
 * LeadRow component - memoized to prevent unnecessary re-renders
 * when other leads in the list change
 */
export const LeadRow = React.memo(function LeadRow({
  lead,
  onOpen,
  onConvertToOrder,
  onDelete,
}: LeadRowProps) {
  // Parse appointment info from notes (Meeting-Link is stored there)
  const meetingLinkMatch = lead.notes?.match(/Meeting-Link:\s*(https?:\/\/[^\s\n]+)/)
  const meetingLink = meetingLinkMatch ? meetingLinkMatch[1] : null

  return (
    <tr
      onClick={onOpen}
      className="group cursor-pointer transition-all hover:bg-amber-50/50"
    >
      {/* Kunde */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <User className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-slate-900">{lead.customerName}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{lead.orderNumber}</span>
              {lead.accessCode && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-700">
                  {lead.accessCode}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Kontakt */}
      <td className="px-6 py-4">
        <div className="space-y-1">
          {lead.email && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              <span className="truncate max-w-[180px]">{lead.email}</span>
            </div>
          )}
          {lead.phone && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              <span>{lead.phone}</span>
            </div>
          )}
        </div>
      </td>

      {/* Termin/Meeting */}
      <td className="px-6 py-4">
        <div className="space-y-2">
          {/* Termin-Datum und Uhrzeit */}
          {lead.measurementDate ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                <Calendar className="h-3.5 w-3.5 text-amber-500" />
                <span>{formatDate(lead.measurementDate, { showWeekday: true, locale: 'de-AT' })}</span>
              </div>
              {lead.measurementTime && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>{lead.measurementTime} Uhr</span>
                </div>
              )}
            </div>
          ) : (
            <span className="text-sm text-slate-400">Kein Termin</span>
          )}
          
          {/* Meeting Link */}
          {meetingLink && (
            <a
              href={meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-700 transition-all hover:bg-blue-200"
            >
              <Video className="h-3.5 w-3.5" />
              Zum Meeting
            </a>
          )}
        </div>
      </td>

      {/* Aktionen */}
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onConvertToOrder}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-600 hover:to-emerald-700 active:scale-95"
          >
            Zum Auftrag
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="rounded-xl p-2 text-slate-400 transition-all hover:bg-red-50 hover:text-red-500"
            title="Lead löschen"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  )
})
