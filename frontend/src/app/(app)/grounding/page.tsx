'use client'
import { useState } from 'react'
import { calcGrounding } from '@/lib/api'
import type { GroundingInput, GroundingResult } from '@/types'

const RESISTIVIDADES_TIPICAS: Record<string, number> = {
  'Pantanoso (≈30 Ω·m)': 30,
  'Arcilla húmeda (≈100 Ω·m)': 100,
  'Arcilla seca (≈200 Ω·m)': 200,
  'Arena húmeda (≈300 Ω·m)': 300,
  'Arena seca (≈1000 Ω·m)': 1000,
  'Roca (≈3000 Ω·m)': 3000,
  'Personalizado': 0,
}

const TIPOS_ELECTRODO = [
  { value: 'varilla', label: 'Varilla vertical' },
  { value: 'multiple_varillas', label: 'Múltiples varillas (paralelo)' },
  { value: 'cable_horizontal', label: 'Cable horizontal enterrado' },
  { value: 'malla', label: 'Malla rectangular' },
]

const TIPOS_INSTALACION = [
  { value: 'general', label: 'General (≤25 Ω)' },
  { value: 'medica', label: 'Equipos médicos (≤5 Ω)' },
  { value: 'sobretension', label: 'Limitadores sobretensión (≤10 Ω)' },
  { value: 'tn', label: 'Sistema TN (R × Ia ≤ 50V)' },
]

const defaultInput = (): GroundingInput => ({
  tipo_electrodo: 'varilla',
  resistividad_suelo: 100,
  longitud_varilla_m: 2.4,
  diametro_varilla_m: 0.016,
  numero_varillas: 1,
  espaciado_varillas_m: 5.0,
  longitud_cable_m: 30.0,
  diametro_cable_m: 0.010,
  profundidad_m: 0.6,
  ancho_malla_m: 10.0,
  largo_malla_m: 10.0,
  tipo_instalacion: 'general',
  corriente_disparo_a: undefined,
})

const s = {
  page: {
    padding: '24px',
    maxWidth: '860px',
    margin: '0 auto',
    fontFamily: "'IBM Plex Sans', sans-serif",
    color: '#E6EDF3',
  } as React.CSSProperties,
  h1: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '22px',
    fontWeight: 600,
    color: '#E6EDF3',
    marginBottom: '4px',
  } as React.CSSProperties,
  subtitle: {
    fontSize: '13px',
    color: '#8B949E',
    marginBottom: '24px',
  } as React.CSSProperties,
  card: {
    background: '#161B22',
    border: '1px solid #30363D',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
  } as React.CSSProperties,
  sectionTitle: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '13px',
    fontWeight: 600,
    color: '#8B949E',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '16px',
  } as React.CSSProperties,
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '14px',
  } as React.CSSProperties,
  label: {
    display: 'block',
    fontSize: '12px',
    color: '#8B949E',
    marginBottom: '5px',
  } as React.CSSProperties,
  input: {
    width: '100%',
    background: '#0D1117',
    border: '1px solid #30363D',
    borderRadius: '6px',
    padding: '7px 10px',
    fontSize: '13px',
    color: '#E6EDF3',
    boxSizing: 'border-box' as const,
    outline: 'none',
  } as React.CSSProperties,
  select: {
    width: '100%',
    background: '#0D1117',
    border: '1px solid #30363D',
    borderRadius: '6px',
    padding: '7px 10px',
    fontSize: '13px',
    color: '#E6EDF3',
    boxSizing: 'border-box' as const,
    outline: 'none',
    cursor: 'pointer',
  } as React.CSSProperties,
  btn: {
    background: '#58A6FF',
    color: '#0D1117',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 24px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'IBM Plex Mono', monospace",
  } as React.CSSProperties,
  errorBox: {
    background: 'rgba(248,81,73,0.1)',
    border: '1px solid #F85149',
    borderRadius: '6px',
    padding: '12px 16px',
    fontSize: '13px',
    color: '#F85149',
    marginBottom: '16px',
  } as React.CSSProperties,
  warnBox: {
    background: 'rgba(240,180,41,0.08)',
    border: '1px solid #F0B429',
    borderRadius: '6px',
    padding: '10px 14px',
    fontSize: '12px',
    color: '#F0B429',
    marginTop: '12px',
  } as React.CSSProperties,
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={s.label}>{label}</label>
      {children}
    </div>
  )
}

export default function GroundingPage() {
  const [inp, setInp] = useState<GroundingInput>(defaultInput())
  const [rhoPreset, setRhoPreset] = useState<string>('Arcilla húmeda (≈100 Ω·m)')
  const [result, setResult] = useState<GroundingResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: keyof GroundingInput, value: string | number | undefined) =>
    setInp(prev => ({ ...prev, [field]: value }))

  const handleRhoPreset = (preset: string) => {
    setRhoPreset(preset)
    const val = RESISTIVIDADES_TIPICAS[preset]
    if (val > 0) set('resistividad_suelo', val)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const payload = { ...inp }
      if (inp.tipo_instalacion !== 'tn') {
        delete payload.corriente_disparo_a
      }
      const res = await calcGrounding(payload)
      setResult(res)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } }
      setError(axiosErr?.response?.data?.detail || 'Error al calcular')
    } finally {
      setLoading(false)
    }
  }

  const showVarilla = inp.tipo_electrodo === 'varilla' || inp.tipo_electrodo === 'multiple_varillas'
  const showCable = inp.tipo_electrodo === 'cable_horizontal'
  const showMalla = inp.tipo_electrodo === 'malla'
  const showTN = inp.tipo_instalacion === 'tn'

  return (
    <div style={s.page}>
      <h1 style={s.h1}>⏚ Puesta a Tierra</h1>
      <p style={s.subtitle}>Cálculo de resistencia de electrodos — RIC Art. 3.12</p>

      <form onSubmit={handleSubmit}>
        {/* Tipo de electrodo */}
        <div style={s.card}>
          <div style={s.sectionTitle}>Tipo de electrodo</div>
          <div style={s.grid}>
            <FieldGroup label="Electrodo">
              <select style={s.select} value={inp.tipo_electrodo}
                onChange={e => set('tipo_electrodo', e.target.value)}>
                {TIPOS_ELECTRODO.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </FieldGroup>

            <FieldGroup label="Resistividad del suelo (Ω·m)">
              <select style={{ ...s.select, marginBottom: '6px' }}
                value={rhoPreset}
                onChange={e => handleRhoPreset(e.target.value)}>
                {Object.keys(RESISTIVIDADES_TIPICAS).map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
              {(rhoPreset === 'Personalizado' || RESISTIVIDADES_TIPICAS[rhoPreset] === 0) && (
                <input style={s.input} type="number" step="1" min="1"
                  value={inp.resistividad_suelo}
                  onChange={e => set('resistividad_suelo', parseFloat(e.target.value))} />
              )}
              {rhoPreset !== 'Personalizado' && (
                <div style={{ fontSize: '12px', color: '#8B949E', marginTop: '4px' }}>
                  ρ = {inp.resistividad_suelo} Ω·m
                </div>
              )}
            </FieldGroup>
          </div>
        </div>

        {/* Parámetros varilla */}
        {showVarilla && (
          <div style={s.card}>
            <div style={s.sectionTitle}>Parámetros de la varilla</div>
            <div style={s.grid}>
              <FieldGroup label="Longitud (m)">
                <select style={s.select} value={inp.longitud_varilla_m}
                  onChange={e => set('longitud_varilla_m', parseFloat(e.target.value))}>
                  <option value={1.5}>1.5 m</option>
                  <option value={2.4}>2.4 m (estándar)</option>
                  <option value={3.0}>3.0 m</option>
                  <option value={4.5}>4.5 m</option>
                  <option value={6.0}>6.0 m</option>
                </select>
              </FieldGroup>

              <FieldGroup label="Diámetro (mm)">
                <select style={s.select} value={inp.diametro_varilla_m}
                  onChange={e => set('diametro_varilla_m', parseFloat(e.target.value))}>
                  <option value={0.0127}>12.7 mm (1/2&quot;)</option>
                  <option value={0.016}>16 mm (5/8&quot;) — estándar</option>
                  <option value={0.019}>19 mm (3/4&quot;)</option>
                </select>
              </FieldGroup>

              {inp.tipo_electrodo === 'multiple_varillas' && (
                <>
                  <FieldGroup label="Número de varillas">
                    <select style={s.select} value={inp.numero_varillas}
                      onChange={e => set('numero_varillas', parseInt(e.target.value))}>
                      {[1, 2, 3, 4].map(n => (
                        <option key={n} value={n}>{n} varilla{n > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </FieldGroup>
                  <FieldGroup label="Espaciado entre varillas (m)">
                    <input style={s.input} type="number" step="0.5" min="1"
                      value={inp.espaciado_varillas_m}
                      onChange={e => set('espaciado_varillas_m', parseFloat(e.target.value))} />
                    <div style={{ fontSize: '11px', color: '#8B949E', marginTop: '3px' }}>
                      Recomendado: ≥ {(2 * inp.longitud_varilla_m).toFixed(1)} m
                    </div>
                  </FieldGroup>
                </>
              )}
            </div>
          </div>
        )}

        {/* Parámetros cable horizontal */}
        {showCable && (
          <div style={s.card}>
            <div style={s.sectionTitle}>Parámetros del cable horizontal</div>
            <div style={s.grid}>
              <FieldGroup label="Longitud del cable (m)">
                <input style={s.input} type="number" step="1" min="1"
                  value={inp.longitud_cable_m}
                  onChange={e => set('longitud_cable_m', parseFloat(e.target.value))} />
              </FieldGroup>
              <FieldGroup label="Diámetro del cable (mm)">
                <select style={s.select} value={inp.diametro_cable_m}
                  onChange={e => set('diametro_cable_m', parseFloat(e.target.value))}>
                  <option value={0.008}>8 mm</option>
                  <option value={0.010}>10 mm (estándar)</option>
                  <option value={0.012}>12 mm</option>
                  <option value={0.016}>16 mm</option>
                </select>
              </FieldGroup>
              <FieldGroup label="Profundidad de enterramiento (m)">
                <input style={s.input} type="number" step="0.1" min="0.1"
                  value={inp.profundidad_m}
                  onChange={e => set('profundidad_m', parseFloat(e.target.value))} />
                <div style={{ fontSize: '11px', color: '#8B949E', marginTop: '3px' }}>
                  Mínimo recomendado: 0.6 m
                </div>
              </FieldGroup>
            </div>
          </div>
        )}

        {/* Parámetros malla */}
        {showMalla && (
          <div style={s.card}>
            <div style={s.sectionTitle}>Parámetros de la malla</div>
            <div style={s.grid}>
              <FieldGroup label="Ancho de la malla (m)">
                <input style={s.input} type="number" step="1" min="1"
                  value={inp.ancho_malla_m}
                  onChange={e => set('ancho_malla_m', parseFloat(e.target.value))} />
              </FieldGroup>
              <FieldGroup label="Largo de la malla (m)">
                <input style={s.input} type="number" step="1" min="1"
                  value={inp.largo_malla_m}
                  onChange={e => set('largo_malla_m', parseFloat(e.target.value))} />
              </FieldGroup>
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '8px' }}>
                <div style={{ fontSize: '13px', color: '#8B949E' }}>
                  Área: {(inp.ancho_malla_m * inp.largo_malla_m).toFixed(0)} m²
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Requisito */}
        <div style={s.card}>
          <div style={s.sectionTitle}>Requisito de instalación</div>
          <div style={s.grid}>
            <FieldGroup label="Tipo de instalación">
              <select style={s.select} value={inp.tipo_instalacion}
                onChange={e => set('tipo_instalacion', e.target.value)}>
                {TIPOS_INSTALACION.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </FieldGroup>
            {showTN && (
              <FieldGroup label="Corriente de disparo Ia (A)">
                <input style={s.input} type="number" step="1" min="1"
                  placeholder="ej: 30"
                  value={inp.corriente_disparo_a ?? ''}
                  onChange={e => set('corriente_disparo_a', e.target.value ? parseFloat(e.target.value) : undefined)} />
                <div style={{ fontSize: '11px', color: '#8B949E', marginTop: '3px' }}>
                  Condición: R × Ia ≤ 50 V
                </div>
              </FieldGroup>
            )}
          </div>
        </div>

        {error && <div style={s.errorBox}>{error}</div>}

        <button type="submit" style={s.btn} disabled={loading}>
          {loading ? 'Calculando...' : 'Calcular puesta a tierra'}
        </button>
      </form>

      {/* Resultado */}
      {result && (
        <div style={{ ...s.card, marginTop: '24px' }}>
          <div style={s.sectionTitle}>Resultado</div>

          {/* Estado cumple/no cumple */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 18px',
            borderRadius: '6px',
            background: result.cumple ? 'rgba(63,185,80,0.08)' : 'rgba(248,81,73,0.08)',
            border: `1px solid ${result.cumple ? '#3FB950' : '#F85149'}`,
            marginBottom: '20px',
          }}>
            <div style={{ fontSize: '28px' }}>{result.cumple ? '✓' : '✗'}</div>
            <div>
              <div style={{
                fontSize: '16px',
                fontWeight: 700,
                color: result.cumple ? '#3FB950' : '#F85149',
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                {result.cumple ? 'CUMPLE RIC Art. 3.12' : 'NO CUMPLE RIC Art. 3.12'}
              </div>
              <div style={{ fontSize: '13px', color: '#8B949E', marginTop: '2px' }}>
                {result.descripcion_electrodo}
              </div>
            </div>
          </div>

          {/* Valores numéricos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px', marginBottom: '18px' }}>
            <div style={{ background: '#0D1117', borderRadius: '6px', padding: '14px', border: '1px solid #30363D' }}>
              <div style={{ fontSize: '11px', color: '#8B949E', marginBottom: '4px' }}>Resistencia calculada</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '22px', fontWeight: 700, color: '#E6EDF3' }}>
                {result.resistencia_calculada_ohm.toFixed(2)}
              </div>
              <div style={{ fontSize: '12px', color: '#8B949E' }}>Ω</div>
            </div>
            <div style={{ background: '#0D1117', borderRadius: '6px', padding: '14px', border: '1px solid #30363D' }}>
              <div style={{ fontSize: '11px', color: '#8B949E', marginBottom: '4px' }}>Resistencia requerida</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '22px', fontWeight: 700, color: '#58A6FF' }}>
                {result.resistencia_requerida_ohm.toFixed(2)}
              </div>
              <div style={{ fontSize: '12px', color: '#8B949E' }}>Ω (máximo)</div>
            </div>
            <div style={{ background: '#0D1117', borderRadius: '6px', padding: '14px', border: '1px solid #30363D' }}>
              <div style={{ fontSize: '11px', color: '#8B949E', marginBottom: '4px' }}>Margen</div>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: '22px', fontWeight: 700,
                color: result.cumple ? '#3FB950' : '#F85149',
              }}>
                {(result.resistencia_requerida_ohm - result.resistencia_calculada_ohm).toFixed(2)}
              </div>
              <div style={{ fontSize: '12px', color: '#8B949E' }}>Ω ({result.cumple ? 'margen libre' : 'exceso'})</div>
            </div>
          </div>

          {/* Recomendación */}
          <div style={{
            background: '#0D1117',
            border: '1px solid #30363D',
            borderRadius: '6px',
            padding: '12px 16px',
            fontSize: '13px',
            color: '#E6EDF3',
            lineHeight: '1.6',
          }}>
            <span style={{ color: '#8B949E', fontWeight: 600 }}>Recomendacion: </span>
            {result.recomendacion}
          </div>

          {/* Advertencias */}
          {result.advertencias.length > 0 && (
            <div style={s.warnBox}>
              <div style={{ fontWeight: 600, marginBottom: '6px' }}>Advertencias:</div>
              {result.advertencias.map((w, i) => (
                <div key={i} style={{ marginBottom: '4px' }}>• {w}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
