'use client'

import React from 'react'
import type { CustomerProject } from '@/types'

interface ProjectSelectorProps {
  projects: CustomerProject[]
  selectedProject: CustomerProject | null
  isLoading: boolean
  onSelectProject: (project: CustomerProject) => void
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  projects,
  selectedProject,
  isLoading,
  onSelectProject,
}) => {
  return (
    <div className="lg:col-span-1">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-black text-slate-900">Aufträge</h2>
        <div className="max-h-[calc(100vh-250px)] space-y-2 overflow-y-auto">
          {isLoading ? (
            <div className="py-8 text-center text-slate-400">
              <p>Lade Aufträge...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <p className="mb-2">Keine Aufträge gefunden</p>
              <p className="mb-4 text-xs">
                Erstellen Sie zuerst einen Auftrag im Bereich "Aufträge"
              </p>
              <button
                onClick={() => (window.location.href = '/projects')}
                className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-amber-600"
              >
                Zu Aufträgen
              </button>
            </div>
          ) : (
            projects.map(project => {
              const totalPartial =
                project.partialPayments?.reduce((sum, p) => sum + p.amount, 0) || 0
              const isSelected = selectedProject?.id === project.id

              return (
                <button
                  key={project.id}
                  onClick={() => onSelectProject(project)}
                  className={`w-full rounded-xl p-4 text-left transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg'
                      : 'bg-slate-50 text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className="mb-1 font-bold">{project.customerName}</div>
                  <div className={`text-sm ${isSelected ? 'text-white/90' : 'text-slate-600'}`}>
                    {project.orderNumber}
                  </div>
                  <div
                    className={`mt-2 text-sm font-bold ${isSelected ? 'text-white' : 'text-amber-600'}`}
                  >
                    {project.totalAmount.toLocaleString('de-AT')} €
                  </div>
                  {totalPartial > 0 && (
                    <div
                      className={`mt-1 text-xs ${isSelected ? 'text-white/80' : 'text-slate-500'}`}
                    >
                      {totalPartial.toLocaleString('de-AT')} € bereits erhalten
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
