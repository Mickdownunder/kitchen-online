/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // SECURITY: Reduced from 50mb to prevent DoS attacks via large payloads
      // If specific routes need larger limits, consider implementing route-specific limits
      // or using a file upload service (e.g., Supabase Storage) instead of direct body uploads
      bodySizeLimit: '4mb', // Standard limit - use file uploads for larger files
    },
  },
  // Verhindert Indexierung durch Suchmaschinen (inkl. PDFs, Bilder, etc.)
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'X-Robots-Tag',
          value: 'noindex, nofollow, noarchive, nosnippet',
        },
      ],
    },
  ],
}

module.exports = nextConfig
