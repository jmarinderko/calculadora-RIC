'use client'
import { SessionProvider } from 'next-auth/react'
import type { Session } from 'next-auth'
import { ThemeProvider } from '@/components/ThemeContext'
import { OfflineBadge } from '@/components/OfflineBadge'

export function Providers({
  children,
  session,
}: {
  children: React.ReactNode
  session: Session | null
}) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider>
        {children}
        <OfflineBadge />
      </ThemeProvider>
    </SessionProvider>
  )
}
