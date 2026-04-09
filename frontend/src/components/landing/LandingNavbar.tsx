'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'

export default function LandingNavbar() {
  const { data: session } = useSession()

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(13,17,23,0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '0 24px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontWeight: 600,
            fontSize: 15,
            color: 'var(--text)',
            letterSpacing: '-0.01em',
          }}>
            RIC Conductor<span style={{ color: 'var(--accent)' }}>.calc</span>
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {session ? (
            <Link href="/dashboard" style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 13,
              fontWeight: 600,
              padding: '7px 16px',
              borderRadius: 'var(--r)',
              background: 'var(--accent)',
              color: '#000',
              textDecoration: 'none',
            }}>
              Ir al dashboard →
            </Link>
          ) : (
            <>
              <Link href="/login" style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 13,
                color: 'var(--text2)',
                padding: '7px 14px',
                borderRadius: 'var(--r)',
                textDecoration: 'none',
                border: '1px solid var(--border)',
                background: 'transparent',
              }}>
                Iniciar sesión
              </Link>
              <Link href="/register" style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 13,
                fontWeight: 600,
                padding: '7px 16px',
                borderRadius: 'var(--r)',
                background: 'var(--accent)',
                color: '#000',
                textDecoration: 'none',
              }}>
                Comenzar gratis
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
