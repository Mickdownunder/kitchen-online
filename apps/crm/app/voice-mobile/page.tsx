import type { Metadata, Viewport } from 'next'
import VoiceMobileClient from './VoiceMobileClient'

export const metadata: Metadata = {
  title: 'Baleah Voice',
  description: 'Schnelle Spracheingabe für dein CRM',
  appleWebApp: {
    capable: true,
    title: 'Baleah Voice',
    statusBarStyle: 'black-translucent',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0f172a',
}

export default function VoiceMobilePage() {
  return <VoiceMobileClient />
}
