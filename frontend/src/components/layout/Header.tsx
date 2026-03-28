'use client'
import { useSession, signOut } from 'next-auth/react'
import { useTheme } from '@/components/ThemeContext'

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  const { data: session } = useSession()
  const { theme, toggle } = useTheme()

  return (
    <header style={{
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      height: '48px',
      background: 'var(--bg2)',
      flexShrink: 0,
    }}>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', fontWeight: 500, color: 'var(--text2)' }}>
        {title}
      </span>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Theme toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="theme-label">{theme === 'dark' ? 'Oscuro' : 'Claro'}</span>
          <button
            className="theme-toggle"
            onClick={toggle}
            title="Cambiar tema claro / oscuro"
            aria-label="Cambiar tema"
          >
            <div className="knob" />
          </button>
        </div>

        {/* Usuario */}
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--text3)' }}>
          {session?.user?.email}
        </span>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '11px',
            color: 'var(--text3)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseOver={e => (e.currentTarget.style.color = 'var(--red)')}
          onMouseOut={e => (e.currentTarget.style.color = 'var(--text3)')}
        >
          Salir
        </button>
      </div>
    </header>
  )
}
