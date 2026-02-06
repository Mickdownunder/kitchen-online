/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production'

const csp = [
  "default-src 'self'",
  "img-src 'self' data: https:",
  "media-src 'self' blob:",
  "connect-src 'self' data: https: wss:",
  "style-src 'self' 'unsafe-inline' https:",
  // wasm-unsafe-eval: benötigt für @react-pdf/renderer (PDF-Generierung im Browser)
  // unsafe-eval nur in Development für Next.js Hot Reload
  isDev 
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:"
    : "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https:",
  "font-src 'self' data: https:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const securityHeaders = [
  {
    key: 'X-Robots-Tag',
    value: 'noindex, nofollow, noarchive, nosnippet',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Content-Security-Policy',
    value: csp,
  },
]

if (process.env.NODE_ENV === 'production') {
  securityHeaders.push({
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  })
}

const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    serverActions: {
      // SECURITY: Reduced from 50mb to prevent DoS attacks via large payloads
      // If specific routes need larger limits, consider implementing route-specific limits
      // or using a file upload service (e.g., Supabase Storage) instead of direct body uploads
      bodySizeLimit: '4mb', // Standard limit - use file uploads for larger files
    },
  },
  // Externe Bilder von Supabase Storage erlauben (KüchenOnline + Baleah)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tdpyouguwmdrvhwkpdca.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'hysuwlvxpuchmgotvhpx.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Verhindert Indexierung durch Suchmaschinen (inkl. PDFs, Bilder, etc.)
  headers: async () => [
    {
      source: '/:path*',
      headers: securityHeaders,
    },
  ],
}

module.exports = nextConfig
