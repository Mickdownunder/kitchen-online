'use client'

import { Menu, ChefHat } from 'lucide-react'

interface PortalTopBarProps {
  setSidebarOpen: (open: boolean) => void
}

export default function PortalTopBar({ setSidebarOpen }: PortalTopBarProps) {
  return (
    <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 items-center gap-4 border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-xl lg:hidden">
      <button
        type="button"
        className="rounded-xl bg-slate-100 p-2.5 text-slate-600 transition-colors hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        onClick={() => setSidebarOpen(true)}
      >
        <span className="sr-only">Menü öffnen</span>
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>
      <div className="flex flex-1 items-center justify-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500">
          <ChefHat className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-slate-900">KüchenOnline</span>
      </div>
      <div className="w-10" /> {/* Spacer for centering */}
    </div>
  )
}
