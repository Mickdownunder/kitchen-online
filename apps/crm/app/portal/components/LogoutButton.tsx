'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { portalSupabase } from '@/lib/supabase/portal-client'

export default function LogoutButton() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      // Sign out from portal client (clears portal cookies)
      await portalSupabase.auth.signOut()
      
      // Also call API to invalidate server-side session
      await fetch('/api/customer/auth/logout', {
        method: 'POST',
      })
      
      router.push('/portal/login')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-slate-600 transition-all hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
    >
      <LogOut className="h-5 w-5" />
      <span className="text-sm font-medium">{isLoading ? 'Abmelden...' : 'Abmelden'}</span>
    </button>
  )
}
