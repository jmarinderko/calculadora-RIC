'use client'
import { useSession, signOut } from 'next-auth/react'
import { useTheme } from '@/components/ThemeContext'
import { useSidebar } from '@/components/layout/SidebarContext'

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  const { data: session } = useSession()
  const { theme, toggle } = useTheme()
  const { isMobile, toggle: toggleSidebar } = useSidebar()

  return (
    <header style={{
      borderBottom: '1px solid var(--border)',
      padding: isMobile ? '0 12px' : '0 24px',
      display: 'flex',
      alignItems: 'center',
      gap: isMobile ? '8px' : '16px',
      height: '48px',
      background: 'var(--bg2)',
      flexShrink: 0,
    }}>
      {/* Hamburguesa solo en mobile */}
      {isMobile && (
        <button
          type="button"
          aria-label="Abrir menú"
          onClick={toggleSidebar}
          style={{
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 6,
            color: 'var(--text)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>
      )}

      <span style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--text2)',
        flex: isMobile ? 1 : undefined,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {title}
      </span>

      <div style={{
        marginLeft: isMobile ? undefined : 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? '8px' : '16px',
      }}>
        {/* Theme toggle — sin label en mobile para ahorrar espacio */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!isMobile && <span className="theme-label">{theme === 'dark' ? 'Oscuro' : 'Claro'}</span>}
          <button
            className="theme-toggle"
            onClick={toggle}
            title="Cambiar tema claro / oscuro"
            aria-label="Cambiar tema"
          >
            <div className="knob" />
          </button>
        </div>

        {/* Email solo en desktop */}
        {!isMobile && (
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--text3)' }}>
            {session?.user?.email}
          </span>
        )}

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '11px',
            color: 'var(--text3)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: isMobile ? '4px 8px' : 0,
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
