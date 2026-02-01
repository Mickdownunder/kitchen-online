import { Loader2 } from 'lucide-react'

export default function PortalLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <div className="text-center">
        <div className="relative mx-auto h-20 w-20">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-20 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-40 animate-pulse" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl shadow-emerald-500/30">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        </div>
        <p className="mt-6 text-slate-500 font-medium">Ihre Daten werden geladen...</p>
      </div>
    </div>
  )
}
