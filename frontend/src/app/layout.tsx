import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'RIC Conductor — Calculadora NCh Elec 4/2003',
  description: 'Plataforma de cálculo de conductores eléctricos bajo norma RIC chilena',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ background: 'var(--bg)', color: 'var(--text)', fontFamily: "'IBM Plex Sans', sans-serif", minHeight: '100vh' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
