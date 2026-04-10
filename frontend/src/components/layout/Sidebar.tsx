'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '⊞' },
  { href: '/calculator', label: 'Calculadora', icon: '⚡' },
  { href: '/projects',   label: 'Proyectos',   icon: '⊟' },
  { href: '/profile',    label: 'Perfil',      icon: '◎' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <aside style={{
      width: '200px',
      background: 'var(--bg2)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Brand */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px', height: '28px',
            background: 'var(--accent)',
            borderRadius: '4px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'IBM Plex Mono', monospace",
            fontWeight: 600, fontSize: '11px', color: '#000', letterSpacing: '-0.5px',
          }}>
            RIC
          </div>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>
              Conductor<span style={{ color: 'var(--accent)' }}>.calc</span>
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--text3)' }}>
              NCh Elec 4/2003
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px' }}>
        {NAV_ITEMS.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                borderRadius: '4px',
                fontSize: '13px',
                fontFamily: "'IBM Plex Sans', sans-serif",
                color: active ? '#000' : 'var(--text2)',
                background: active ? 'var(--accent)' : 'transparent',
                fontWeight: active ? 600 : 400,
                textDecoration: 'none',
                marginBottom: '2px',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseOver={e => { if (!active) { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.color = 'var(--text)'; } }}
              onMouseOut={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)'; } }}
            >
              <span style={{ fontSize: '14px' }}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}

        {/* Admin link — solo visible para administradores */}
        {(session as any)?.isAdmin && (
          <>
            <div style={{ height: 1, background: 'var(--border)', margin: '8px 4px' }} />
            <Link
              href="/admin"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                borderRadius: '4px',
                fontSize: '13px',
                fontFamily: "'IBM Plex Sans', sans-serif",
                color: pathname.startsWith('/admin') ? '#000' : 'var(--text3)',
                background: pathname.startsWith('/admin') ? 'var(--accent)' : 'transparent',
                fontWeight: pathname.startsWith('/admin') ? 600 : 400,
                textDecoration: 'none',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseOver={e => { if (!pathname.startsWith('/admin')) { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.color = 'var(--text)'; } }}
              onMouseOut={e => { if (!pathname.startsWith('/admin')) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text3)'; } }}
            >
              <span style={{ fontSize: '14px' }}>⚙</span>
              Admin
            </Link>
          </>
        )}
      </nav>

      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--text3)' }}>
          StellaFortis © {new Date().getFullYear()}
        </p>
      </div>
    </aside>
  )
}
