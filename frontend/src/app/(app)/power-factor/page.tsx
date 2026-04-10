'use client'
import { useState } from 'react'
import { calcPowerFactor } from '@/lib/api'
import type { PowerFactorInput, PowerFactorResult } from '@/types'

const SISTEMAS = [
  { value: 'trifasico', label: 'Trifásico' },
  { value: 'monofasico', label: 'Monofásico' },
]

const defaultInput = (): PowerFactorInput => ({
  potencia_kw: 100,
  fp_actual: 0.75,
  fp_objetivo: 0.95,
  tension_v: 380,
  sistema: 'trifasico',
  frecuencia_hz: 50,
  horas_mensuales: 720,
  tarifa_kvarh: 0.05,
})

// ── Colores tema oscuro ───────────────────────────────────────────────────────
const C = {
  bg: '#0D1117',
  card: '#161B22',
  border: '#30363D',
  text: '#E6EDF3',
  muted: '#8B949E',
  blue: '#58A6FF',
  green: '#3FB950',
  red: '#F85149',
  yellow: '#F0B429',
}

function Row({ label, value, unit, accent }: { label: string; value: string | number; unit?: string; accent?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ color: C.muted, fontSize: '13px' }}>{label}</span>
      <span style={{ color: accent ?? C.text, fontWeight: 600, fontSize: '14px', fontFamily: "'IBM Plex Mono', monospace" }}>
        {value}{unit ? ` ${unit}` : ''}
      </span>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'block', fontSize: '12px', color: C.muted, marginBottom: '4px', fontFamily: "'IBM Plex Mono', monospace" }}>{children}</label>
}

function Input({ value, onChange, min, max, step, type = 'number' }: {
  value: number | string; onChange: (v: string) => void
  min?: number; max?: number; step?: number; type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', padding: '8px 10px', boxSizing: 'border-box',
        background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px',
        color: C.text, fontSize: '14px', fontFamily: "'IBM Plex Mono', monospace",
        outline: 'none',
      }}
    />
  )
}

function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', padding: '8px 10px', boxSizing: 'border-box',
        background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px',
        color: C.text, fontSize: '14px', fontFamily: "'IBM Plex Mono', monospace",
        outline: 'none',
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

// ── Diagrama de barras kVA ────────────────────────────────────────────────────
function TriangleDiagram({ result }: { result: PowerFactorResult }) {
  const kva_antes = result.potencia_activa_kw / result.fp_actual
  const kva_despues = result.potencia_activa_kw / result.fp_objetivo
  const maxKva = Math.max(kva_antes, kva_despues, 1)
  const barW_antes = (kva_antes / maxKva) * 200
  const barW_despues = (kva_despues / maxKva) * 200

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ fontSize: '12px', color: C.muted, marginBottom: '8px', fontFamily: "'IBM Plex Mono', monospace" }}>
        Comparativa kVA (antes vs. después)
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div>
          <div style={{ fontSize: '11px', color: C.muted, marginBottom: '3px' }}>
            Antes — FP {result.fp_actual.toFixed(2)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: barW_antes, height: '22px', background: C.red, borderRadius: '3px', transition: 'width 0.4s' }} />
            <span style={{ fontSize: '12px', color: C.text, fontFamily: "'IBM Plex Mono', monospace" }}>
              {kva_antes.toFixed(1)} kVA
            </span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: C.muted, marginBottom: '3px' }}>
            Después — FP {result.fp_objetivo.toFixed(2)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: barW_despues, height: '22px', background: C.green, borderRadius: '3px', transition: 'width 0.4s' }} />
            <span style={{ fontSize: '12px', color: C.text, fontFamily: "'IBM Plex Mono', monospace" }}>
              {kva_despues.toFixed(1)} kVA
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PowerFactorPage() {
  const [inp, setInp] = useState<PowerFactorInput>(defaultInput())
  const [result, setResult] = useState<PowerFactorResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: keyof PowerFactorInput) => (v: string) => {
    const num = parseFloat(v)
    setInp(prev => ({ ...prev, [field]: isNaN(num) ? v : num }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await calcPowerFactor(inp)
      setResult(res)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? (err as Error)?.message ?? 'Error al calcular'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const fieldStyle = { marginBottom: '12px' }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '24px', color: C.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: C.text, margin: 0 }}>
          Corrección de Factor de Potencia
        </h1>
        <p style={{ fontSize: '13px', color: C.muted, margin: '4px 0 0' }}>
          Banco de condensadores — kVAR a compensar, banco estándar y ahorro tarifario
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: C.blue, marginBottom: '16px', fontFamily: "'IBM Plex Mono', monospace" }}>
            Parámetros de entrada
          </div>

          <div style={fieldStyle}>
            <Label>Potencia activa (kW)</Label>
            <Input value={inp.potencia_kw} onChange={set('potencia_kw')} min={0.1} step={0.1} />
          </div>

          <div style={fieldStyle}>
            <Label>Factor de potencia actual (FP actual)</Label>
            <Input value={inp.fp_actual} onChange={set('fp_actual')} min={0.1} max={0.99} step={0.01} />
            <div style={{ marginTop: '4px' }}>
              <input type="range" min={0.1} max={0.99} step={0.01} value={inp.fp_actual}
                onChange={e => setInp(prev => ({ ...prev, fp_actual: parseFloat(e.target.value) }))}
                style={{ width: '100%', accentColor: C.red }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: C.muted }}>
                <span>0.10 (malo)</span><span>0.99 (excelente)</span>
              </div>
            </div>
          </div>

          <div style={fieldStyle}>
            <Label>Factor de potencia objetivo</Label>
            <Input value={inp.fp_objetivo} onChange={set('fp_objetivo')} min={0.5} max={0.99} step={0.01} />
          </div>

          <div style={fieldStyle}>
            <Label>Tensión de línea (V)</Label>
            <Input value={inp.tension_v} onChange={set('tension_v')} min={100} step={1} />
          </div>

          <div style={fieldStyle}>
            <Label>Sistema</Label>
            <Select value={inp.sistema} onChange={v => setInp(prev => ({ ...prev, sistema: v }))} options={SISTEMAS} />
          </div>

          <div style={{ height: 1, background: C.border, margin: '16px 0' }} />
          <div style={{ fontSize: '11px', color: C.muted, marginBottom: '12px', fontFamily: "'IBM Plex Mono', monospace" }}>
            Estimación de ahorro (opcional)
          </div>

          <div style={fieldStyle}>
            <Label>Frecuencia (Hz)</Label>
            <Input value={inp.frecuencia_hz} onChange={set('frecuencia_hz')} min={50} max={60} step={0.1} />
          </div>

          <div style={fieldStyle}>
            <Label>Horas de operación mensuales</Label>
            <Input value={inp.horas_mensuales} onChange={set('horas_mensuales')} min={1} max={744} step={1} />
          </div>

          <div style={fieldStyle}>
            <Label>Tarifa energía reactiva (USD/kVARh)</Label>
            <Input value={inp.tarifa_kvarh} onChange={set('tarifa_kvarh')} min={0} step={0.001} />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '10px', marginTop: '8px',
              background: loading ? C.border : C.blue,
              color: loading ? C.muted : '#000',
              border: 'none', borderRadius: '6px',
              fontSize: '14px', fontWeight: 700, cursor: loading ? 'default' : 'pointer',
              fontFamily: "'IBM Plex Mono', monospace",
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Calculando...' : 'Calcular'}
          </button>

          {error && (
            <div style={{ marginTop: '12px', padding: '10px', background: '#2d1317', border: `1px solid ${C.red}`, borderRadius: '6px', fontSize: '13px', color: C.red }}>
              {error}
            </div>
          )}
        </form>

        {/* Resultados */}
        <div>
          {result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Advertencias */}
              {result.advertencias.length > 0 && (
                <div style={{ background: '#271d0d', border: `1px solid ${C.yellow}`, borderRadius: '8px', padding: '12px 16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: C.yellow, marginBottom: '6px', fontFamily: "'IBM Plex Mono', monospace" }}>
                    Advertencias
                  </div>
                  {result.advertencias.map((adv, i) => (
                    <div key={i} style={{ fontSize: '13px', color: C.yellow }}>• {adv}</div>
                  ))}
                </div>
              )}

              {/* Banco de condensadores */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: C.blue, marginBottom: '14px', fontFamily: "'IBM Plex Mono', monospace" }}>
                  Banco de condensadores
                </div>
                <Row label="kVAR a compensar" value={result.q_compensar_kvar.toFixed(1)} unit="kVAR" accent={C.yellow} />
                <Row label="Banco estándar recomendado" value={result.q_banco_standard_kvar.toFixed(1)} unit="kVAR" accent={C.green} />
                <Row label="Potencia reactiva antes" value={result.potencia_reactiva_antes_kvar.toFixed(1)} unit="kVAR" accent={C.red} />
                <Row label="Potencia reactiva después" value={result.potencia_reactiva_despues_kvar.toFixed(1)} unit="kVAR" accent={C.green} />
                {inp.sistema === 'trifasico' && (
                  <Row label="Capacitancia por fase" value={result.capacitancia_por_fase_uf.toFixed(1)} unit="μF" />
                )}
              </div>

              {/* Corriente */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: C.blue, marginBottom: '14px', fontFamily: "'IBM Plex Mono', monospace" }}>
                  Corriente de línea
                </div>
                <Row label="Corriente antes" value={result.corriente_antes_a.toFixed(1)} unit="A" accent={C.red} />
                <Row label="Corriente después" value={result.corriente_despues_a.toFixed(1)} unit="A" accent={C.green} />
                <Row label="Reducción de corriente" value={result.reduccion_corriente_pct.toFixed(1)} unit="%" accent={C.green} />
                <TriangleDiagram result={result} />
              </div>

              {/* Ahorro */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: C.blue, marginBottom: '14px', fontFamily: "'IBM Plex Mono', monospace" }}>
                  Ahorro tarifario estimado
                </div>
                <Row label="Ahorro mensual" value={`$${result.ahorro_mensual_usd.toFixed(2)}`} unit="USD/mes" accent={C.green} />
                <Row label="Ahorro anual" value={`$${result.ahorro_anual_usd.toFixed(2)}`} unit="USD/año" accent={C.green} />
                <div style={{ marginTop: '10px', padding: '8px', background: C.bg, borderRadius: '4px', fontSize: '11px', color: C.muted }}>
                  Estimado basado en {inp.horas_mensuales} h/mes × {inp.tarifa_kvarh} USD/kVARh.
                  No incluye costos de instalación del banco.
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '40px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              minHeight: '300px', color: C.muted, textAlign: 'center',
            }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>⊕</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: C.text, marginBottom: '6px' }}>
                Corrección de Factor de Potencia
              </div>
              <div style={{ fontSize: '13px', maxWidth: '300px' }}>
                Ingresa los parámetros de la instalación y presiona Calcular para
                obtener el banco de condensadores necesario y el ahorro estimado.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
