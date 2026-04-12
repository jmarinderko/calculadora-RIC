const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: true,
  reloadOnOnline: false,
  workboxOptions: {
    // Cache de API responses para modo offline
    runtimeCaching: [
      {
        // API calls al backend — NetworkFirst (intenta red, sino cache)
        urlPattern: /\/api\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 }, // 7 días
          networkTimeoutSeconds: 5,
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        // Assets estáticos — CacheFirst
        urlPattern: /\.(?:js|css|woff2?|png|jpg|jpeg|gif|svg|ico)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'static-assets',
          expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
      {
        // Páginas HTML — StaleWhileRevalidate
        urlPattern: /^https?:\/\/.*\/?.*$/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'pages-cache',
          expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
        },
      },
    ],
  },
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'standalone' para Railway (Docker), 'export' para Capacitor (static)
  // Usa NEXT_OUTPUT=export al compilar para apps nativas
  output: process.env.NEXT_OUTPUT === 'export' ? 'export' : 'standalone',
}

module.exports = withPWA(nextConfig)
