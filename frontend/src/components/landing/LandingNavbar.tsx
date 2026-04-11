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
      background: 'rgba(13,17,23,0.9)',
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
        gap: 16,
      }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
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

        {/* Anchor links — hidden on small screens */}
        <div style={{
          display: 'flex',
          gap: 4,
          flex: 1,
          justifyContent: 'center',
        }}>
          {[
            { href: '#funcionalidades', label: 'Funcionalidades' },
            { href: '#precios', label: 'Precios' },
            { href: '#faq', label: 'FAQ' },
          ].map(({ href, label }) => (
            <Link key={label} href={href} style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 13,
              color: 'var(--text3)',
              padding: '6px 12px',
              borderRadius: 'var(--r)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}>
              {label}
            </Link>
          ))}
        </div>

        {/* Auth CTAs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
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
              whiteSpace: 'nowrap',
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
                whiteSpace: 'nowrap',
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
                whiteSpace: 'nowrap',
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
