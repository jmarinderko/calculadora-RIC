'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'

// Paleta hardcodeada — el navbar siempre es oscuro,
// independiente del tema light/dark del resto de la app.
const NAV_TEXT = '#E6EDF3'
const NAV_TEXT_DIM = '#B1BAC4'
const NAV_BORDER = 'rgba(255,255,255,0.15)'
const NAV_ACCENT = '#F0B429'

export default function LandingNavbar() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detectar mobile/desktop por ancho de viewport
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Bloquear scroll del body cuando el drawer está abierto
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const anchors = [
    { href: '#funcionalidades', label: 'Funcionalidades' },
    { href: '#precios', label: 'Precios' },
    { href: '#faq', label: 'FAQ' },
  ]

  return (
    <>
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(13,17,23,0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${NAV_BORDER}`,
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            height: 56,
            padding: isMobile ? '0 16px' : '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 600,
                fontSize: 15,
                color: NAV_TEXT,
                letterSpacing: '-0.01em',
              }}
            >
              RIC Conductor<span style={{ color: NAV_ACCENT }}>.calc</span>
            </span>
          </Link>

          {/* DESKTOP: anchors centrales + auth CTAs */}
          {!isMobile && (
            <>
              <div
                style={{
                  display: 'flex',
                  gap: 4,
                  flex: 1,
                  justifyContent: 'center',
                }}
              >
                {anchors.map(({ href, label }) => (
                  <Link
                    key={label}
                    href={href}
                    style={{
                      fontFamily: "'IBM Plex Sans', sans-serif",
                      fontSize: 13,
                      color: NAV_TEXT_DIM,
                      padding: '6px 12px',
                      borderRadius: 6,
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                  </Link>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {session ? (
                  <Link
                    href="/dashboard"
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 13,
                      fontWeight: 600,
                      padding: '7px 16px',
                      borderRadius: 6,
                      background: NAV_ACCENT,
                      color: '#000',
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Ir al dashboard →
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login"
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 13,
                        color: NAV_TEXT,
                        padding: '7px 14px',
                        borderRadius: 6,
                        textDecoration: 'none',
                        border: `1px solid ${NAV_BORDER}`,
                        background: 'transparent',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Iniciar sesión
                    </Link>
                    <Link
                      href="/register"
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 13,
                        fontWeight: 600,
                        padding: '7px 16px',
                        borderRadius: 6,
                        background: NAV_ACCENT,
                        color: '#000',
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Comenzar gratis
                    </Link>
                  </>
                )}
              </div>
            </>
          )}

          {/* MOBILE: botón hamburguesa */}
          {isMobile && (
            <button
              type="button"
              aria-label="Abrir menú"
              aria-expanded={open}
              onClick={() => setOpen(true)}
              style={{
                flexShrink: 0,
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: `1px solid ${NAV_BORDER}`,
                borderRadius: 6,
                color: NAV_TEXT,
                cursor: 'pointer',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            </button>
          )}
        </div>
      </nav>

      {/* Drawer mobile */}
      {isMobile && open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.5)',
          }}
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'min(85vw, 320px)',
              background: '#0d1117',
              borderLeft: `1px solid ${NAV_BORDER}`,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {/* Cerrar */}
            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setOpen(false)}
              style={{
                alignSelf: 'flex-end',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: `1px solid ${NAV_BORDER}`,
                borderRadius: 6,
                color: NAV_TEXT,
                cursor: 'pointer',
                marginBottom: 12,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>

            {/* Anchors */}
            {anchors.map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                onClick={() => setOpen(false)}
                style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 16,
                  color: NAV_TEXT,
                  padding: '12px 14px',
                  borderRadius: 6,
                  textDecoration: 'none',
                  border: `1px solid ${NAV_BORDER}`,
                }}
              >
                {label}
              </Link>
            ))}

            {/* Separador */}
            <div style={{ height: 1, background: NAV_BORDER, margin: '8px 0' }} />

            {/* Auth CTAs */}
            {session ? (
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 14,
                  fontWeight: 600,
                  padding: '12px 14px',
                  borderRadius: 6,
                  background: NAV_ACCENT,
                  color: '#000',
                  textDecoration: 'none',
                  textAlign: 'center',
                }}
              >
                Ir al dashboard →
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 14,
                    color: NAV_TEXT,
                    padding: '12px 14px',
                    borderRadius: 6,
                    textDecoration: 'none',
                    border: `1px solid ${NAV_BORDER}`,
                    background: 'transparent',
                    textAlign: 'center',
                  }}
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/register"
                  onClick={() => setOpen(false)}
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 14,
                    fontWeight: 600,
                    padding: '12px 14px',
                    borderRadius: 6,
                    background: NAV_ACCENT,
                    color: '#000',
                    textDecoration: 'none',
                    textAlign: 'center',
                  }}
                >
                  Comenzar gratis
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
