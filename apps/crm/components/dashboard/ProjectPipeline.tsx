'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import { CustomerProject, ProjectStatus } from '@/types'

interface ProjectPipelineProps {
  projects: CustomerProject[]
}

const STATUS_CONFIG: {
  status: ProjectStatus
  label: string
  dotColor: string
  textColor: string
}[] = [
  { status: ProjectStatus.LEAD, label: 'Lead', dotColor: 'bg-slate-400', textColor: 'text-slate-600' },
  { status: ProjectStatus.PLANNING, label: 'Planung', dotColor: 'bg-sky-400', textColor: 'text-sky-600' },
  { status: ProjectStatus.MEASURING, label: 'Aufmaß', dotColor: 'bg-indigo-500', textColor: 'text-indigo-600' },
  { status: ProjectStatus.ORDERED, label: 'Bestellt', dotColor: 'bg-purple-500', textColor: 'text-purple-600' },
  { status: ProjectStatus.DELIVERY, label: 'Lieferung', dotColor: 'bg-amber-500', textColor: 'text-amber-600' },
  { status: ProjectStatus.INSTALLATION, label: 'Montage', dotColor: 'bg-orange-500', textColor: 'text-orange-600' },
  { status: ProjectStatus.COMPLETED, label: 'Fertig', dotColor: 'bg-emerald-500', textColor: 'text-emerald-600' },
  { status: ProjectStatus.COMPLAINT, label: 'Rekla.', dotColor: 'bg-red-500', textColor: 'text-red-600' },
]

export default function ProjectPipeline({ projects }: ProjectPipelineProps) {
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of STATUS_CONFIG) {
      counts[s.status] = 0
    }
    projects.forEach(p => {
      if (counts[p.status] !== undefined) {
        counts[p.status]++
      }
    })
    return counts
  }, [projects])

  return (
    <div className="space-y-3">
      {STATUS_CONFIG.map(config => {
        const count = statusCounts[config.status] || 0

        return (
          <Link
            key={config.status}
            href={`/projects?status=${encodeURIComponent(config.status)}`}
            className="group flex items-center gap-3 rounded-lg px-1 py-1 transition-all hover:bg-slate-50/80"
          >
            <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${config.dotColor}`} />
            <span className={`w-24 shrink-0 text-xs font-semibold ${config.textColor}`}>
              {config.label}
            </span>
            <span className={`text-sm font-black ${count > 0 ? 'text-slate-800' : 'text-slate-300'}`}>
              {count}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
