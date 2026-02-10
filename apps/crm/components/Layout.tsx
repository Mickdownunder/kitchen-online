'use client'

import React, { useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  Menu,
  X,
  CalendarDays,
  Package,
  UserCircle,
  LogOut,
  ReceiptText,
  Building2,
  Truck,
  BarChart3,
  FileCheck,
  MessageSquare,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { signOut, getCompanySettings } from '@/lib/supabase/services'
import { logger } from '@/lib/utils/logger'

// Fallback-Logo (Küchenonline) für dunklen Hintergrund
const LOGO_URL_FALLBACK =
  'https://tdpyouguwmdrvhwkpdca.supabase.co/storage/v1/object/public/Bilder/8105_%20web%20logo_%20CMYK-03%20weis.png'

const isBypassRoute = (pathname: string | null): boolean =>
  pathname === '/login' ||
  pathname === '/signup' ||
  pathname === '/forgot-password' ||
  pathname === '/reset-password' ||
  pathname?.startsWith('/portal') === true

const CrmLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
  const [displayName, setDisplayName] = React.useState<string>('')
  const [logoUrl, setLogoUrl] = React.useState<string>(LOGO_URL_FALLBACK)
  const pathname = usePathname()
  const router = useRouter()
  const { user, profile, companyRole, loading, hasPermission } = useAuth()
  const hasRedirectedToLogin = useRef(false)

  useEffect(() => {
    if (user) hasRedirectedToLogin.current = false
  }, [user])

  useEffect(() => {
    const isAuthPage =
      pathname === '/login' ||
      pathname === '/signup' ||
      pathname === '/forgot-password' ||
      pathname === '/reset-password'
    const isPortalRoute = pathname?.startsWith('/portal')

    if (!loading && !user && !isAuthPage && !isPortalRoute && !hasRedirectedToLogin.current) {
      hasRedirectedToLogin.current = true
      router.replace('/login')
    }
  }, [loading, pathname, router, user])

  // Load company display name + Logo (firmenspezifisch)
  React.useEffect(() => {
    const loadCompanyBranding = async () => {
      try {
        const settings = await getCompanySettings()
        if (settings) {
          if (settings.displayName) setDisplayName(settings.displayName)
          else if (settings.companyName) setDisplayName(settings.companyName)
          // Logo: logo_url > logo_base64 > Fallback (Küchenonline)
          if (settings.logoUrl) {
            setLogoUrl(settings.logoUrl)
          } else if (settings.logoBase64) {
            setLogoUrl(`data:image/png;base64,${settings.logoBase64}`)
          } else {
            setLogoUrl(LOGO_URL_FALLBACK)
          }
        }
      } catch (error) {
        logger.error('Error loading company branding', { component: 'Layout' }, error as Error)
      }
    }
    if (user) {
      loadCompanyBranding()
    } else {
      setLogoUrl(LOGO_URL_FALLBACK)
    }
  }, [user])

  // Don't show layout on auth pages or portal routes
  const isAuthPage =
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password'
  
  // Portal has its own separate layout
  const isPortalRoute = pathname?.startsWith('/portal')

  // If on auth page or portal, just show children without CRM layout
  if (isAuthPage || isPortalRoute) {
    return <>{children}</>
  }

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent" />
      </div>
    )
  }

  // If not logged in and not on auth page: redirect to login (nur einmal, um replaceState-Limit zu vermeiden)
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
  }

  const menuItems = [
    // Operative Funktionen oben
    {
      id: '/dashboard',
      label: 'Übersicht',
      icon: LayoutDashboard,
      permission: 'menu_dashboard' as const,
    },
    {
      id: '/calendar',
      label: 'Kalender',
      icon: CalendarDays,
      permission: 'menu_calendar' as const,
    },
    {
      id: '/projects',
      label: 'Aufträge',
      icon: Users,
      permission: 'menu_projects' as const,
    },
    {
      id: '/invoices',
      label: 'Rechnungen',
      icon: ReceiptText,
      permission: 'menu_invoices' as const,
    },
    {
      id: '/deliveries',
      label: 'Lieferscheine',
      icon: Truck,
      permission: 'menu_deliveries' as const,
    },
    {
      id: '/complaints',
      label: 'Reklamationen',
      icon: ShieldAlert,
      permission: 'menu_complaints' as const,
    },
    {
      id: '/tickets',
      label: 'Kundenanfragen',
      icon: MessageSquare,
      permission: 'menu_complaints' as const, // Reuse complaints permission for now
    },
    // Finanzen & Berichte
    {
      id: '/accounting',
      label: 'Buchhaltung',
      icon: FileCheck,
      permission: 'menu_accounting' as const,
    },
    {
      id: '/statistics',
      label: 'Statistiken',
      icon: BarChart3,
      permission: 'menu_statistics' as const,
    },
    // Stammdaten unten
    {
      id: '/articles',
      label: 'Artikelstamm',
      icon: Package,
      permission: 'menu_articles' as const,
    },
    {
      id: '/customers',
      label: 'Kundenstamm',
      icon: UserCircle,
      permission: 'menu_customers' as const,
    },
    {
      id: '/settings',
      label: 'Firmenstamm',
      icon: Building2,
      permission: 'menu_settings' as const,
    },
  ] as const

  const visibleMenuItems = menuItems.filter(item => {
    // If no permission required, always show
    if (!('permission' in item)) return true
    if (!profile) return false
    // Use granular permissions (falls back in hook to role defaults if RBAC not deployed yet)
    return hasPermission(item.permission)
  })

  const isActive = (path: string) =>
    pathname === path || (pathname === '/' && path === '/dashboard')

  // IMPORTANT: don't use hooks (useMemo) here, because Layout has early returns
  // (auth pages/loading), and changing hook order will break React.
  const roleLabel = (() => {
    switch (companyRole) {
      case 'geschaeftsfuehrer':
        return 'Geschäftsführer'
      case 'administration':
        return 'Administration'
      case 'buchhaltung':
        return 'Buchhaltung'
      case 'verkaeufer':
        return 'Verkäufer'
      case 'monteur':
        return 'Monteur'
      default:
        // Fallback to profile.role if RBAC/companyRole isn't available yet
        return profile?.role || ''
    }
  })()

  // Keyboard navigation handlers
  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      action()
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 print:block print:h-auto print:overflow-visible print:bg-white">
      {/* Sidebar Desktop - Hidden when printing */}
      <aside
        className="z-20 hidden w-64 flex-col overflow-hidden border-r border-blue-950/50 bg-gradient-to-b from-blue-950 via-blue-900 to-blue-950 text-white shadow-2xl md:flex print:!hidden"
        aria-label="Hauptnavigation"
      >
        <Link
          href="/dashboard"
          className="group flex items-center justify-center border-b border-blue-900/50 p-6 transition-all duration-200 hover:bg-blue-900/50"
          aria-label="Zur Startseite"
        >
          <Image
            src={logoUrl}
            alt={displayName || 'KüchenOnline'}
            width={160}
            height={50}
            className="h-auto w-auto max-h-12"
            priority
          />
        </Link>
        <nav className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto p-4" aria-label="Hauptmenü">
          {visibleMenuItems.map(item => (
            <Link
              key={item.id}
              href={item.id}
              onClick={e => {
                // Ensure navigation works
                if (loading) {
                  e.preventDefault()
                  return
                }
              }}
              aria-current={isActive(item.id) ? 'page' : undefined}
              aria-label={`${item.label}${isActive(item.id) ? ', aktuelle Seite' : ''}`}
              className={`group relative flex w-full items-center gap-3 rounded-xl p-4 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-blue-950 ${
                isActive(item.id)
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 font-bold text-blue-950 shadow-lg shadow-yellow-500/30'
                  : 'text-blue-100 hover:translate-x-1 hover:bg-blue-900/50 hover:text-white'
              } ${loading ? 'cursor-wait opacity-50' : 'cursor-pointer'}`}
            >
              <item.icon
                className={`h-5 w-5 ${isActive(item.id) ? 'text-blue-950' : 'text-blue-200 group-hover:text-white'}`}
                aria-hidden="true"
              />
              <span className="text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* User Info & Logout */}
        <div className="border-t border-blue-900/50 p-4" aria-label="Benutzerinformationen">
          {!loading && profile && (
            <div className="mb-4 rounded-xl bg-blue-900/50 p-3" role="status" aria-live="polite">
              <p className="text-sm font-bold text-white">{profile.fullName || profile.email}</p>
              <p className="mt-1 text-xs uppercase tracking-widest text-blue-200">{roleLabel}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            onKeyDown={e => handleKeyDown(e, handleLogout)}
            aria-label="Abmelden"
            className="flex w-full items-center gap-3 rounded-xl p-4 text-blue-100 transition-all hover:bg-blue-900/50 hover:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-blue-950"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
            <span className="text-sm">Abmelden</span>
          </button>
        </div>
      </aside>

      {/* Mobile Nav - Hidden when printing */}
      <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-blue-950 bg-blue-900 p-4 text-white md:hidden print:!hidden">
        <Link href="/dashboard" className="flex items-center" aria-label="Zur Startseite">
          <Image
            src={logoUrl}
            alt={displayName || 'KüchenOnline'}
            width={120}
            height={40}
            className="h-auto w-auto max-h-8"
          />
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onKeyDown={e => handleKeyDown(e, () => setIsMobileMenuOpen(!isMobileMenuOpen))}
          aria-label={isMobileMenuOpen ? 'Menü schließen' : 'Menü öffnen'}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-menu"
          className="rounded-lg bg-blue-950 p-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
        >
          {isMobileMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <nav
          id="mobile-menu"
          className="fixed inset-0 z-40 flex flex-col overflow-y-auto space-y-4 bg-blue-900 p-6 pt-20 md:hidden print:!hidden"
          aria-label="Mobilmenü"
        >
          {visibleMenuItems.map(item => (
            <Link
              key={item.id}
              href={item.id}
              onClick={() => setIsMobileMenuOpen(false)}
              aria-current={isActive(item.id) ? 'page' : undefined}
              aria-label={`${item.label}${isActive(item.id) ? ', aktuelle Seite' : ''}`}
              className={`flex w-full items-center gap-4 rounded-2xl p-5 focus:outline-none focus:ring-2 focus:ring-yellow-500 ${
                isActive(item.id)
                  ? 'bg-yellow-500 font-bold text-blue-950'
                  : 'bg-blue-950 text-blue-100'
              }`}
            >
              <item.icon className="h-6 w-6" aria-hidden="true" />
              <span className="text-lg">{item.label}</span>
            </Link>
          ))}
        </nav>
      )}

      {/* Main Content */}
      <main
        className="custom-scrollbar relative flex-1 overflow-y-auto bg-slate-50 pt-20 md:pt-0 print:overflow-visible print:bg-white print:pt-0"
        role="main"
        aria-label="Hauptinhalt"
      >
        <div className="relative mx-auto min-h-full max-w-[1400px] p-4 md:p-10 3xl:max-w-[1800px] 4xl:max-w-[2200px] 5xl:max-w-none print:m-0 print:max-w-none print:p-0">
          {children}
        </div>
      </main>
    </div>
  )
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (isBypassRoute(pathname)) {
    return <>{children}</>
  }

  return <CrmLayout>{children}</CrmLayout>
}
