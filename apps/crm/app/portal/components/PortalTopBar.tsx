'use client'

import { Menu } from 'lucide-react'
import Image from 'next/image'

interface PortalTopBarProps {
  setSidebarOpen: (open: boolean) => void
}

const LOGO_URL = 'https://tdpyouguwmdrvhwkpdca.supabase.co/storage/v1/object/public/Bilder/8105_%20web%20logo_%20CMYK-02%20schwarz.png'

export default function PortalTopBar({ setSidebarOpen }: PortalTopBarProps) {
  return (
    <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-xl lg:hidden">
      <button
        type="button"
        className="rounded-xl bg-slate-100 p-2.5 text-slate-600 transition-colors hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        onClick={() => setSidebarOpen(true)}
      >
        <span className="sr-only">Menü öffnen</span>
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>
      <Image
        src={LOGO_URL}
        alt="KüchenOnline"
        width={140}
        height={40}
        className="h-7 w-auto"
        unoptimized
      />
    </div>
  )
}
