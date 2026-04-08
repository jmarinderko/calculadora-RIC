'use client'
import { useState, useCallback, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { CalculatorForm } from '@/components/calculator/CalculatorForm'
import { ResultPanel } from '@/components/calculator/ResultPanel'
import { UnifilarDiagram } from '@/components/calculator/UnifilarDiagram'
import { calcConductor, saveCalculation, getProjects, generateReport, downloadReportPdf } from '@/lib/api'
import type { CalculatorInput, CalculatorResponse, Project } from '@/types'

function CalculatorInner() {
  const searchParams = useSearchParams()
  const preselectedProjectId = searchParams.get('project')

  const [result,    setResult]    = useState<CalculatorResponse | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [lastInput, setLastInput] = useState<CalculatorInput | null>(null)

  const [projects,      setProjects]      = useState<Project[]>([])
  const [saveProjectId, setSaveProjectId] = useState(preselectedProjectId ?? '')
  const [saveName,      setSaveName]      = useState('')
  const [saving,        setSaving]        = useState(false)
  const [savedMsg,      setSavedMsg]      = useState('')

  useEffect(() => {
    getProjects().then(setProjects).catch(() => {})
  }, [])

  const handleCalculate = useCallback(async (input: CalculatorInput) => {
    setError('')
    setResult(null)
    setLastInput(input)
    setSavedMsg('')
    setLoading(true)
    try {
      const res = await calcConductor(input)
      setResult(res)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al calcular'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleForceSection = useCallback(async (seccionMm2: number) => {
    if (!lastInput) return
    await handleCalculate({ ...lastInput, seccion_forzada_mm2: seccionMm2 })
  }, [lastInput, handleCalculate])

  async function handleSave() {
    if (!result || !saveProjectId || !saveName.trim()) return
    setSaving(true)
    setSavedMsg('')
    try {
      await saveCalculation(saveProjectId, saveName.trim(), lastInput!)
      setSavedMsg('Cálculo guardado exitosamente.')
      setSaveName('')
    } catch {
      setSavedMsg('Error al guardar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', flex: 1, minHeight: 0, overflow: 'hidden' }}>

      {/* ── Panel izquierdo: formulario ── */}
      <div style={{
        borderRight: '1px solid var(--border)',
        padding: '24px',
        overflowY: 'auto',
        background: 'var(--bg2)',
      }}>
        <CalculatorForm onSubmit={handleCalculate} loading={loading} />
      </div>

      {/* ── Panel derecho: resultados ── */}
      <div style={{ padding: '24px 32px', overflowY: 'auto' }}>
        {!result && !loading && !error && (
          <div className="empty-state">
            <div className="empty-icon">⚡</div>
            <p>Ingresa los parámetros y presiona calcular</p>
            <p style={{ fontSize: '11px', color: 'var(--text3)' }}>NCh Elec 4/2003 · RIC Art. 5.5</p>
          </div>
        )}

        {loading && (
          <div className="empty-state">
            <div className="empty-icon" style={{ animation: 'none' }}>⏳</div>
            <p>Calculando…</p>
          </div>
        )}

        {error && (
          <div style={{
            padding: '16px',
            background: 'var(--red-bg)',
            border: '1px solid var(--red-bdr)',
            borderRadius: 'var(--r)',
            color: 'var(--red)',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '13px',
          }}>
            ✖ {error}
          </div>
        )}

        {result && (
          <div>
            <ResultPanel
              result={result}
              input={lastInput ? {
                sistema: lastInput.sistema,
                tension_v: lastInput.tension_v,
                potencia_kw: lastInput.potencia_kw,
                longitud_m: lastInput.longitud_m,
              } : undefined}
              onRecalculate={handleForceSection}
            />

            {/* Diagrama unifilar */}
            {lastInput && (
              <div style={{
                marginTop: '16px',
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r)',
                padding: '16px',
              }}>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text2)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '12px',
                }}>
                  Diagrama unifilar
                </div>
                <UnifilarDiagram result={result} input={lastInput} />
              </div>
            )}

            {/* Guardar en proyecto */}
            {projects.length > 0 && (
              <div style={{
                marginTop: '20px',
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r)',
                padding: '16px',
              }}>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text2)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '12px',
                }}>
                  Guardar en proyecto
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <div className="select-wrap">
                    <select className="form-select" value={saveProjectId}
                      onChange={e => setSaveProjectId(e.target.value)}>
                      <option value="">— Seleccionar proyecto —</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Nombre del cálculo (Ej: Circuito tablero TA-1)"
                    value={saveName}
                    onChange={e => setSaveName(e.target.value)}
                  />
                </div>
                {savedMsg && (
                  <div style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '12px',
                    marginBottom: '8px',
                    color: savedMsg.includes('Error') ? 'var(--red)' : 'var(--green)',
                  }}>
                    {savedMsg}
                  </div>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving || !saveProjectId || !saveName.trim()}
                  className="btn-calc"
                  style={{ background: 'var(--blue)', marginTop: 0 }}
                >
                  {saving ? 'Guardando…' : '💾 Guardar cálculo'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function CalculatorPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Header title="Calculadora RIC — NCh Elec 4/2003" />
      <Suspense fallback={
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace" }}>
          Cargando…
        </div>
      }>
        <CalculatorInner />
      </Suspense>
    </div>
  )
}
