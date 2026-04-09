'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'

const ADMIN_NAV = [
  { href: '/admin',         label: 'Dashboard',  icon: '◈' },
  { href: '/admin/users',   label: 'Usuarios',   icon: '◉' },
  { href: '/admin/catalog', label: 'Catálogo',   icon: '◫' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === 'loading') return
    if (!session || !(session as any).isAdmin) {
      router.replace('/dashboard')
    }
  }, [session, status, router])

  if (status === 'loading' || !(session as any)?.isAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>
        Verificando permisos...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar admin */}
      <aside style={{
        width: 200,
        background: 'var(--bg2)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--accent)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}>
            ⚙ Admin
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
            RIC Conductor.calc
          </div>
        </div>

        <nav style={{ flex: 1, padding: 8 }}>
          {ADMIN_NAV.map(item => {
            const active = pathname === item.href
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 4,
                fontSize: 13,
                fontFamily: "'IBM Plex Sans', sans-serif",
                color: active ? '#000' : 'var(--text2)',
                background: active ? 'var(--accent)' : 'transparent',
                fontWeight: active ? 600 : 400,
                textDecoration: 'none',
                marginBottom: 2,
              }}>
                <span>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <Link href="/dashboard" style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            color: 'var(--text3)',
            textDecoration: 'none',
          }}>
            ← Volver a la app
          </Link>
        </div>
      </aside>

      {/* Contenido */}
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
        {children}
      </main>
    </div>
  )
}
