'use client'
import { useState, useCallback, useMemo } from 'react'
import { getUnifilar } from '@/lib/api'
import type { CalculatorResponse, CalculatorInput } from '@/types'

interface Props {
  result: CalculatorResponse
  input: CalculatorInput
}

export function UnifilarDiagram({ result, input }: Props) {
  const [svgContent, setSvgContent] = useState<string | null>(null)
  // Render el SVG vía <img src="data:image/svg+xml;..."/> en vez de
  // dangerouslySetInnerHTML. Los data URLs en <img> corren en un contexto
  // aislado: cualquier <script> embebido en el SVG NO se ejecuta, lo que
  // neutraliza vectores de XSS aunque el SVG incluya strings controlados
  // por el usuario (nombre de circuito, potencia, etc.).
  const svgDataUrl = useMemo(() => {
    if (!svgContent) return ''
    try {
      return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgContent)))}`
    } catch {
      return ''
    }
  }, [svgContent])
  const [open,       setOpen]       = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  const fetchDiagram = useCallback(async () => {
    if (svgContent) {
      setOpen(true)
      return
    }
    setLoading(true)
    setError('')
    try {
      const svg = await getUnifilar(result.resultado, input)
      setSvgContent(svg)
      setOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar el diagrama')
    } finally {
      setLoading(false)
    }
  }, [svgContent, result, input])

  function handleDownload() {
    if (!svgContent) return
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'diagrama-unifilar-ric.svg'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <>
      {/* Botón principal */}
      <button
        onClick={fetchDiagram}
        disabled={loading}
        className="btn-calc"
        style={{
          background: 'var(--blue)',
          marginTop: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          justifyContent: 'center',
        }}
        title="Ver diagrama unifilar SVG generado automáticamente"
      >
        {loading ? (
          <>
            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
            Generando diagrama…
          </>
        ) : (
          <>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <path d="M8 21h8M12 17v4"/>
            </svg>
            Ver diagrama unifilar
          </>
        )}
      </button>

      {error && (
        <div style={{
          marginTop: '8px',
          padding: '8px 12px',
          background: 'var(--red-bg)',
          border: '1px solid var(--red-bdr)',
          borderRadius: 'var(--r)',
          color: 'var(--red)',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '12px',
        }}>
          {error}
        </div>
      )}

      {/* Modal overlay */}
      {open && svgContent && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg)',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              padding: '20px',
              maxWidth: '860px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {/* Header del modal */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text2)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}>
                Diagrama unifilar — RIC
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleDownload}
                  style={{
                    padding: '6px 14px',
                    background: 'var(--bg2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r)',
                    cursor: 'pointer',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '11px',
                    color: 'var(--text)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                  title="Descargar SVG"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Descargar SVG
                </button>
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    padding: '6px 12px',
                    background: 'var(--bg2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r)',
                    cursor: 'pointer',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '13px',
                    color: 'var(--text2)',
                  }}
                  title="Cerrar"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* SVG renderizado vía <img> data URL para aislar scripts (XSS-safe) */}
            <div
              style={{
                width: '100%',
                overflowX: 'auto',
                background: '#fff',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                padding: '4px',
              }}
            >
              {svgDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={svgDataUrl}
                  alt="Diagrama unifilar RIC"
                  style={{ display: 'block', width: '100%', height: 'auto' }}
                />
              )}
            </div>

            {/* Footer info */}
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '10px',
              color: 'var(--text3)',
              textAlign: 'center',
            }}>
              Diagrama generado automáticamente · Solo referencial · Verificar con proyectista habilitado
            </div>
          </div>
        </div>
      )}
    </>
  )
}
