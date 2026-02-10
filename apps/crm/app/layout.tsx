import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import { AppProvider } from './providers'
import Layout from '@/components/Layout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastProvider } from '@/components/providers/ToastProvider'
import { ClientInit } from '@/components/ClientInit'
import './globals.css'

// System font stack (globals.css) – robust für Offline-Builds, keine Google-Fonts-Abhängigkeit
const fontClass = 'antialiased'

export const metadata: Metadata = {
  title: 'KüchenOnline',
  description: 'KüchenOnline - Ihr Küchen-Partner',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: 'KüchenOnline',
    description: 'KüchenOnline - Ihr Küchen-Partner',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Check if this is a portal route - portal has its own providers
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || headersList.get('x-invoke-path') || ''
  const isPortalRoute = pathname.startsWith('/portal')
  const isAuthRoute =
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password'

  // Portal + auth routes get minimal layout
  if (isPortalRoute || isAuthRoute) {
    return (
      <html lang="de" className={fontClass}>
        <body className="bg-slate-50 text-slate-900">
          {children}
        </body>
      </html>
    )
  }

  // CRM routes get full layout with providers
  return (
    <html lang="de" className={fontClass}>
      <body className="bg-slate-50 text-slate-900">
        <ErrorBoundary>
          <ToastProvider>
            <AppProvider>
              <Layout>{children}</Layout>
            </AppProvider>
          </ToastProvider>
          <ClientInit />
        </ErrorBoundary>
      </body>
    </html>
  )
}
