import type { MetadataRoute } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://ricconductor.cl'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/register'],
        disallow: [
          '/dashboard/',
          '/calculator/',
          '/projects/',
          '/profile/',
          '/admin/',
          '/api/',
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  }
}
