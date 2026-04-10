'use client'
import { useState, useCallback, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { CalculatorForm } from '@/components/calculator/CalculatorForm'
import { ResultPanel } from '@/components/calculator/ResultPanel'
import { UnifilarDiagram } from '@/components/calculator/UnifilarDiagram'
import { MTATCalculatorForm } from '@/components/calculator/MTATCalculatorForm'
import { ERNCCalculatorForm } from '@/components/calculator/ERNCCalculatorForm'
import { ERNCResultPanel } from '@/components/calculator/ERNCResultPanel'
import { calcConductor, calcMtat, calcERNC, saveCalculation, getProjects, generateReport, downloadReportPdf } from '@/lib/api'
import type {
  CalculatorInput, CalculatorResponse, MtatInput, MtatResponse, Project,
  ERNCTopologia, ERNCStringDCInput, ERNCAcInversorInput,
  ERNCGdRedBtInput, ERNCBateriasDCInput, ERNCResponse,
} from '@/types'

type CalcTab = 'bt' | 'mtat' | 'ernc'

type ERNCInputUnion =
  | ERNCStringDCInput
  | ERNCAcInversorInput
  | ERNCGdRedBtInput
  | ERNCBateriasDCInput

// ── Tab BT (original) ─────────────────────────────────────────────────────────
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
  const [savedCalcId,   setSavedCalcId]   = useState<string | null>(null)
  const [pdfLoading,    setPdfLoading]    = useState(false)
  const [pdfMsg,        setPdfMsg]        = useState('')

  useEffect(() => {
    getProjects().then(setProjects).catch(() => {})
  }, [])

  const handleCalculate = useCallback(async (input: CalculatorInput) => {
    setError('')
    setResult(null)
    setLastInput(input)
    setSavedMsg('')
    setSavedCalcId(null)
    setPdfMsg('')
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
    setSavedCalcId(null)
    setPdfMsg('')
    try {
      const saved = await saveCalculation(saveProjectId, saveName.trim(), lastInput!)
      setSavedCalcId(saved.id)
      setSavedMsg('Cálculo guardado exitosamente.')
      setSaveName('')
    } catch {
      setSavedMsg('Error al guardar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDownloadPdf() {
    if (!savedCalcId) return
    setPdfLoading(true)
    setPdfMsg('')
    try {
      const report = await generateReport(savedCalcId)
      await downloadReportPdf(report.id, `memoria_calculo_RIC_${savedCalcId.slice(0, 8)}.pdf`)
      setPdfMsg('PDF descargado.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al generar el PDF'
      setPdfMsg(`Error: ${msg}`)
    } finally {
      setPdfLoading(false)
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
            <p style={{ fontSize: '11px', color: 'var(--text3)' }}>RIC Art. 5.5</p>
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
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleSave}
                    disabled={saving || !saveProjectId || !saveName.trim()}
                    className="btn-calc"
                    style={{ background: 'var(--blue)', marginTop: 0, flex: '1 1 auto' }}
                  >
                    {saving ? 'Guardando…' : '💾 Guardar cálculo'}
                  </button>

                  {savedCalcId && (
                    <button
                      onClick={handleDownloadPdf}
                      disabled={pdfLoading}
                      className="btn-calc"
                      style={{
                        background: 'var(--accent)',
                        color: '#000',
                        marginTop: 0,
                        flex: '1 1 auto',
                        fontWeight: 600,
                      }}
                    >
                      {pdfLoading ? 'Generando PDF…' : '⬇ Descargar PDF (SEC)'}
                    </button>
                  )}
                </div>

                {pdfMsg && (
                  <div style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '12px',
                    marginTop: '8px',
                    color: pdfMsg.startsWith('Error') ? 'var(--red)' : 'var(--green)',
                  }}>
                    {pdfMsg}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Tab MT/AT ─────────────────────────────────────────────────────────────────
function MTATTabInner() {
  const [result,  setResult]  = useState<MtatResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleCalculate = useCallback(async (input: MtatInput) => {
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const res = await calcMtat(input)
      setResult(res)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al calcular'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '460px 1fr', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div style={{
        borderRight: '1px solid var(--border)',
        padding: '24px',
        overflowY: 'auto',
        background: 'var(--bg2)',
      }}>
        <MTATCalculatorForm onSubmit={handleCalculate} loading={loading} result={null} />
      </div>
      <div style={{ padding: '24px 32px', overflowY: 'auto' }}>
        {!result && !loading && !error && (
          <div className="empty-state">
            <div className="empty-icon">⚡</div>
            <p>Ingresa los parámetros MT/AT y presiona calcular</p>
            <p style={{ fontSize: '11px', color: 'var(--text3)' }}>IEC 60502-2 · IEC 60287 · IEC 60949 · 1–220 kV</p>
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
          <MTATCalculatorForm onSubmit={handleCalculate} loading={loading} result={result} />
        )}
      </div>
    </div>
  )
}

// ── Tab ERNC/FV ───────────────────────────────────────────────────────────────
function ERNCTabInner() {
  const [result,  setResult]  = useState<ERNCResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleCalculate = useCallback(async (
    topologia: ERNCTopologia,
    datos: ERNCInputUnion
  ) => {
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const res = await calcERNC(topologia, datos as never)
      setResult(res)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al calcular ERNC'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div style={{
        borderRight: '1px solid var(--border)',
        padding: '24px',
        overflowY: 'auto',
        background: 'var(--bg2)',
      }}>
        <ERNCCalculatorForm onSubmit={handleCalculate} loading={loading} />
      </div>
      <div style={{ padding: '24px 32px', overflowY: 'auto' }}>
        {!result && !loading && !error && (
          <div className="empty-state">
            <div className="empty-icon">☀</div>
            <p>Seleccioná la topología e ingresá los parámetros</p>
            <p style={{ fontSize: '11px', color: 'var(--text3)' }}>
              IEC 60364-7-712 · IEC 62548 · NTCO SEC · EN 50618
            </p>
          </div>
        )}
        {loading && (
          <div className="empty-state">
            <div className="empty-icon" style={{ animation: 'none' }}>⏳</div>
            <p>Calculando conductor ERNC…</p>
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
        {result && <ERNCResultPanel response={result} />}
      </div>
    </div>
  )
}

// ── Wrapper con tabs ───────────────────────────────────────────────────────────
function CalculatorWithTabs() {
  const [tab, setTab] = useState<CalcTab>('bt')

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 20px',
    fontSize: '13px',
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    borderBottom: active ? '2px solid var(--blue, #3b82f6)' : '2px solid transparent',
    background: 'transparent',
    color: active ? 'var(--text1)' : 'var(--text3)',
    transition: 'color 0.15s, border-color 0.15s',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        background: 'var(--bg1)',
        flexShrink: 0,
      }}>
        <button style={tabStyle(tab === 'bt')} onClick={() => setTab('bt')}>
          BT — RIC
        </button>
        <button style={tabStyle(tab === 'mtat')} onClick={() => setTab('mtat')}>
          MT/AT — IEC 60502-2
        </button>
        <button style={tabStyle(tab === 'ernc')} onClick={() => setTab('ernc')}>
          ☀ ERNC / FV
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'bt' && <CalculatorInner />}
        {tab === 'mtat' && <MTATTabInner />}
        {tab === 'ernc' && <ERNCTabInner />}
      </div>
    </div>
  )
}

export default function CalculatorPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Header title="Calculadora de Conductores" />
      <Suspense fallback={
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace" }}>
          Cargando…
        </div>
      }>
        <CalculatorWithTabs />
      </Suspense>
    </div>
  )
}
