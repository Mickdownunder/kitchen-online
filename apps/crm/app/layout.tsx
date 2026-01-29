import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
