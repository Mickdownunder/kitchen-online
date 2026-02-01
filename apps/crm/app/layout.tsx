import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { headers } from 'next/headers'
import { AppProvider } from './providers'
import Layout from '@/components/Layout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastProvider } from '@/components/providers/ToastProvider'
import { ClientInit } from '@/components/ClientInit'
import { PerformanceTracker } from '@/components/PerformanceTracker'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Management System',
  description: 'Unternehmens Management System',
  openGraph: {
    title: 'Management System',
    description: 'Unternehmens Management System',
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

  // Portal routes get minimal layout (portal has its own layout)
  if (isPortalRoute) {
    return (
      <html lang="de" className={inter.className}>
        <head>
          {/* Inline CSS for instant loading spinner (no JS required) */}
          <style dangerouslySetInnerHTML={{ __html: `
            .portal-initial-loader {
              position: fixed;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              background: linear-gradient(to bottom right, #f8fafc, #ffffff, rgba(16, 185, 129, 0.1));
              z-index: 9999;
              transition: opacity 0.3s;
            }
            .portal-initial-loader.loaded { opacity: 0; pointer-events: none; }
            .portal-spinner {
              width: 48px;
              height: 48px;
              border: 4px solid #10b981;
              border-top-color: transparent;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
          `}} />
        </head>
        <body className="bg-slate-50 text-slate-900">
          {/* Instant loading spinner (pure CSS, no JS) */}
          <div id="portal-loader" className="portal-initial-loader">
            <div className="portal-spinner" />
          </div>
          {/* Hide loader when page is ready */}
          <script dangerouslySetInnerHTML={{ __html: `
            window.addEventListener('load', function() {
              var loader = document.getElementById('portal-loader');
              if (loader) loader.classList.add('loaded');
            });
          `}} />
          {children}
        </body>
      </html>
    )
  }

  // CRM routes get full layout with providers
  return (
    <html lang="de" className={inter.className}>
      <body className="bg-slate-50 text-slate-900">
        <ErrorBoundary>
          <ToastProvider>
            <AppProvider>
              <Layout>{children}</Layout>
            </AppProvider>
          </ToastProvider>
          <ClientInit />
          <PerformanceTracker />
        </ErrorBoundary>
      </body>
    </html>
  )
}
