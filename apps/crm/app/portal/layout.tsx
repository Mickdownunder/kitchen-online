'use client'

import { useState } from 'react'
import PortalSidebar from './components/PortalSidebar'
import PortalTopBar from './components/PortalTopBar'

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <PortalSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      <div className="flex flex-1 flex-col lg:pl-72">
        <PortalTopBar setSidebarOpen={setSidebarOpen} />
        
        <main className="flex-1 pb-8">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
