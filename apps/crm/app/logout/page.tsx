'use client'

import { useEffect } from 'react'
import { signOut } from '@/lib/supabase/services'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/utils/logger'

export default function LogoutPage() {
  const router = useRouter()

  useEffect(() => {
    const handleLogout = async () => {
      try {
        await signOut()
        // Clear all cookies
        document.cookie.split(';').forEach(c => {
          document.cookie = c
            .replace(/^ +/, '')
            .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/')
        })
        // Redirect to login
        window.location.href = '/login'
      } catch (error) {
        logger.error('Logout error', { component: 'LogoutPage' }, error instanceof Error ? error : new Error(String(error)))
        // Force redirect anyway
        window.location.href = '/login'
      }
    }

    handleLogout()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        <p className="text-slate-600">Abmeldung...</p>
      </div>
    </div>
  )
}
