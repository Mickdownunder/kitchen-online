'use client'

import React, { useRef, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronDown,
  Edit2,
  Hammer,
  Package,
  Phone,
  Ruler,
  ShoppingCart,
  Truck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { CustomerProject, ProjectStatus } from '@/types'

export const ProjectRow = React.memo(function ProjectRow(props: {
  project: CustomerProject
  isDropdownOpen: boolean
  onOpen: () => void
  onEdit: (e: React.MouseEvent) => void
  onToggleDropdown: (e: React.MouseEvent) => void
  onSelectStatus: (e: React.MouseEvent, status: ProjectStatus) => void
  onOpenMeasurementModal: (e: React.MouseEvent) => void
  onToggleOrdered: (e: React.MouseEvent) => void
  onOpenDeliveryNote: (e: React.MouseEvent) => void
  onOpenInstallationModal: (e: React.MouseEvent) => void
  onOpenAbholungModal?: (e: React.MouseEvent) => void
  onToggleCompleted: (e: React.MouseEvent) => void
  formatCurrency: (v: number) => string
  formatDate: (v?: string) => string
  getStatusColor: (s: ProjectStatus) => string
  complaintCount?: number
  // Invoice status indicators (nur Rechnungsvorhandenheit, kein Projektstatus)
  hasPartialInvoice?: boolean
  hasFinalInvoice?: boolean
}) {
  const { project: p } = props
  const statusTriggerRef = useRef<HTMLButtonElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(
    null
  )

  useLayoutEffect(() => {
    if (!props.isDropdownOpen || !statusTriggerRef.current) {
      setDropdownPosition(null)
      return
    }
    const rect = statusTriggerRef.current.getBoundingClientRect()
    setDropdownPosition({
      top: rect.bottom + 8,
      left: rect.left,
    })
  }, [props.isDropdownOpen])

  return (
    <tr className="cursor-pointer transition-colors hover:bg-slate-50/50" onClick={props.onOpen}>
      {/* Kunde */}
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className="font-black text-slate-900">{p.customerName}</span>
          {p.phone && (
            <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              <Phone className="h-3 w-3" /> {p.phone}
            </span>
          )}
        </div>
      </td>

      {/* Auftragsnummer */}
      <td className="px-6 py-4">
        <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
          #{p.orderNumber}
        </span>
      </td>

      {/* Status */}
      <td className="relative px-6 py-4">
        <div className="relative flex items-center gap-2">
          <button
            ref={statusTriggerRef}
            onClick={props.onToggleDropdown}
            className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${props.getStatusColor(p.status)}`}
          >
            {p.status}
            <ChevronDown
              className={`h-3 w-3 transition-transform ${props.isDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {props.complaintCount !== undefined && props.complaintCount > 0 && (
            <a
              href={`/complaints?projectId=${p.id}`}
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-[10px] font-bold text-red-700 transition-colors hover:bg-red-200"
              title={`${props.complaintCount} Reklamation${props.complaintCount !== 1 ? 'en' : ''}`}
            >
              <AlertTriangle className="h-3 w-3" />
              {props.complaintCount}
            </a>
          )}
        </div>
        {props.isDropdownOpen &&
          dropdownPosition &&
          typeof document !== 'undefined' &&
          createPortal(
            <>
              <div
                className="fixed inset-0 z-[99998] bg-transparent"
                onClick={e => {
                  e.stopPropagation()
                  props.onToggleDropdown(e as unknown as React.MouseEvent)
                }}
                aria-hidden
              />
              <div
                className="fixed z-[99999] w-48 rounded-2xl border border-slate-200 bg-white py-2 shadow-2xl"
                style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
                onClick={e => e.stopPropagation()}
              >
                {Object.values(ProjectStatus).map(s => (
                  <button
                    key={s}
                    onClick={e => props.onSelectStatus(e, s)}
                    className={`w-full px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest transition-colors ${
                      p.status === s
                        ? 'bg-amber-50/50 text-amber-500'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </>,
            document.body
          )}
      </td>

      {/* Datum */}
      <td className="px-6 py-4">
        <span className="text-sm text-slate-600">
          {props.formatDate(p.orderDate || p.measurementDate || p.offerDate)}
        </span>
      </td>

      {/* Betrag */}
      <td className="px-6 py-4 text-right">
        <span className="font-black text-slate-900">{props.formatCurrency(p.totalAmount)} €</span>
      </td>

      {/* Workflow */}
      <td className="px-6 py-4">
        <div className="flex items-center justify-center gap-1.5">
          <div className="relative">
            <div
              className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-white ${p.isMeasured ? 'bg-emerald-500' : 'bg-red-400'}`}
            />
            <button
              onClick={props.onOpenMeasurementModal}
              className={`rounded-lg p-1.5 transition-all duration-100 hover:scale-110 active:scale-90 ${p.isMeasured ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}
              title={p.isMeasured ? 'Aufmaß ✓ - Klicken zum Bearbeiten' : 'Aufmaß-Datum setzen'}
            >
              <Ruler className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="relative">
            <div
              className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-white ${p.isOrdered ? 'bg-emerald-500' : 'bg-red-400'}`}
            />
            <button
              onClick={props.onToggleOrdered}
              className={`rounded-lg p-1.5 transition-all duration-100 hover:scale-110 active:scale-90 ${p.isOrdered ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-400'}`}
              title={p.isOrdered ? 'Bestellt ✓' : 'Bestellt'}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="relative">
            <div
              className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-white ${p.isDelivered ? 'bg-emerald-500' : 'bg-red-400'}`}
            />
            <button
              onClick={props.onOpenDeliveryNote}
              className={`rounded-lg p-1.5 transition-all duration-100 hover:scale-110 active:scale-90 ${p.isDelivered ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}
              title={
                p.isDelivered
                  ? 'Geliefert ✓ - Klicken zum Bearbeiten'
                  : 'Lieferschein erstellen/bearbeiten'
              }
            >
              <Truck className="h-3.5 w-3.5" />
            </button>
          </div>

          {p.deliveryType === 'pickup' && props.onOpenAbholungModal ? (
            <div className="relative">
              <div
                className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-white ${p.deliveryDate ? 'bg-emerald-500' : 'bg-red-400'}`}
              />
              <button
                onClick={props.onOpenAbholungModal}
                className={`rounded-lg p-1.5 transition-all duration-100 hover:scale-110 active:scale-90 ${p.deliveryDate ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}
                title={
                  p.deliveryDate ? 'Abholung ✓ - Klicken zum Bearbeiten' : 'Abholung-Datum setzen'
                }
              >
                <Package className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <div
                className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-white ${p.isInstallationAssigned ? 'bg-emerald-500' : 'bg-red-400'}`}
              />
              <button
                onClick={props.onOpenInstallationModal}
                className={`rounded-lg p-1.5 transition-all duration-100 hover:scale-110 active:scale-90 ${p.isInstallationAssigned ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}
                title={
                  p.isInstallationAssigned
                    ? 'Montage ✓ - Klicken zum Bearbeiten'
                    : 'Montage-Datum setzen'
                }
              >
                <Hammer className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="relative">
            <div
              className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-white ${p.isCompleted ? 'bg-emerald-500' : 'bg-red-400'}`}
            />
            <button
              onClick={props.onToggleCompleted}
              className={`rounded-lg p-1.5 transition-all duration-100 hover:scale-110 active:scale-90 ${p.isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}
              title={p.isCompleted ? 'Abgeschlossen ✓' : 'Abgeschlossen'}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Separator */}
          <div className="mx-1 h-4 w-px bg-slate-200" />

          {/* Invoice indicators: AN (Anzahlung) und SC (Schlussrechnung) - nur Rechnungsstatus, kein Projektstatus */}
          <div
            className="relative flex flex-col items-center"
            title={props.hasPartialInvoice ? 'Anzahlung vorhanden ✓' : 'Anzahlung fehlt'}
          >
            <span
              className={`text-[11px] font-black ${
                props.hasPartialInvoice ? 'text-emerald-600' : 'text-red-500'
              }`}
            >
              AN
            </span>
            <div
              className={`h-2 w-2 rounded-full ${
                props.hasPartialInvoice ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            />
          </div>

          <div
            className="relative flex flex-col items-center"
            title={props.hasFinalInvoice ? 'Schlussrechnung vorhanden ✓' : 'Schlussrechnung fehlt'}
          >
            <span
              className={`text-[11px] font-black ${
                props.hasFinalInvoice ? 'text-emerald-600' : 'text-red-500'
              }`}
            >
              SC
            </span>
            <div
              className={`h-2 w-2 rounded-full ${
                props.hasFinalInvoice ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            />
          </div>
        </div>
      </td>

      {/* Aktionen */}
      <td className="px-6 py-4">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={props.onEdit}
            className="rounded-lg bg-slate-100 p-2 transition-all hover:bg-amber-500 hover:text-white"
            title="Bearbeiten"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  )
})
