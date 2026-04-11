import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://ricconductor.cl'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'RIC Conductor — Calculadora de Conductores Eléctricos Chile',
    template: '%s | RIC Conductor',
  },
  description:
    'Calculadora profesional de conductores eléctricos conforme norma RIC. Dimensionamiento BT, MT/AT, ERNC, puesta a tierra, factor de potencia e iluminación. Memoria de cálculo PDF para proyectos SEC en Chile.',
  keywords: [
    'calculadora conductores eléctricos Chile',
    'dimensionamiento conductores RIC',
    'memoria de cálculo SEC',
    'norma RIC Chile',
    'calculadora eléctrica SEC',
    'ingeniería eléctrica Chile',
    'ERNC fotovoltaico SEC',
    'puesta a tierra RIC',
    'caída de tensión conductores',
    'factor de potencia correctivo',
    'iluminación NCh',
    'proyectos eléctricos SEC',
  ],
  authors: [{ name: 'StellaFortis' }],
  creator: 'StellaFortis',
  publisher: 'StellaFortis',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
  },
  openGraph: {
    type: 'website',
    locale: 'es_CL',
    url: APP_URL,
    siteName: 'RIC Conductor',
    title: 'RIC Conductor — Calculadora de Conductores Eléctricos para Proyectos SEC',
    description:
      'Plataforma profesional de cálculo eléctrico conforme norma RIC chilena. BT, MT/AT, ERNC, puesta a tierra, factor de potencia, iluminación. Exporta memoria de cálculo SEC en PDF.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'RIC Conductor — Calculadora eléctrica para proyectos SEC Chile',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RIC Conductor — Calculadora RIC para proyectos SEC',
    description:
      'Dimensionamiento de conductores BT/MT/AT, ERNC, puesta a tierra, factor de potencia e iluminación conforme norma RIC. Memoria PDF para SEC.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: APP_URL,
  },
  category: 'engineering',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'RIC Conductor',
              applicationCategory: 'EngineeringApplication',
              operatingSystem: 'Web',
              url: APP_URL,
              description:
                'Calculadora profesional de conductores eléctricos conforme norma RIC chilena. Dimensionamiento BT, MT/AT, ERNC, puesta a tierra, factor de potencia e iluminación.',
              offers: [
                { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD' },
                { '@type': 'Offer', name: 'Pro', price: '19', priceCurrency: 'USD' },
                { '@type': 'Offer', name: 'Enterprise', price: '59', priceCurrency: 'USD' },
              ],
              inLanguage: 'es-CL',
              audience: {
                '@type': 'Audience',
                audienceType: 'Ingenieros eléctricos en Chile',
              },
            }),
          }}
        />
      </head>
      <body
        style={{
          background: 'var(--bg)',
          color: 'var(--text)',
          fontFamily: "'IBM Plex Sans', sans-serif",
          minHeight: '100vh',
        }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
