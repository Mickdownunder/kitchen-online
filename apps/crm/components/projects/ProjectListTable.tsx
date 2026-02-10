import React from 'react'

interface ProjectListTableProps {
  children: React.ReactNode
}

export function ProjectListTable({ children }: ProjectListTableProps) {
  return (
    <div className="glass overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-br from-white to-slate-50/30 shadow-xl">
      {children}
    </div>
  )
}
