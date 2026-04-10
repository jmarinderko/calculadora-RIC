'use client'
import { useState } from 'react'
import { calcVoltageDropTree } from '@/lib/api'
import type { TramoInput, VoltageDropTreeInput, VoltageDropTreeResult } from '@/types'

const SISTEMAS = ['monofasico', 'bifasico', 'trifasico']
const MATERIALES = ['cu', 'al']
const TIPOS_CIRCUITO = ['alumbrado', 'fuerza', 'tomacorrientes', 'motor', 'alimentador']
const SECCIONES = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300]

const defaultTramo = (): TramoInput => ({
  nombre: '',
  sistema: 'monofasico',
  tension_v: 220,
  potencia_kw: 1,
  factor_potencia: 0.85,
  longitud_m: 20,
  seccion_mm2: 2.5,
  material: 'cu',
  tipo_circuito: 'fuerza',
})

export default function VoltageDropTreePage() {
  const [tramos, setTramos] = useState<TramoInput[]>([{ ...defaultTramo(), nombre: 'Alimentador principal' }])
  const [tensionOrigen, setTensionOrigen] = useState(220)
  const [result, setResult] = useState<VoltageDropTreeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateTramo = (idx: number, field: keyof TramoInput, value: string | number) => {
    setTramos(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t))
  }

  const addTramo = () => {
    setTramos(prev => [...prev, { ...defaultTramo(), nombre: `Tramo ${prev.length + 1}` }])
  }

  const removeTramo = (idx: number) => {
    if (tramos.length <= 1) return
    setTramos(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const input: VoltageDropTreeInput = { tramos, tension_origen_v: tensionOrigen }
      const res = await calcVoltageDropTree(input)
      setResult(res)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } }
      setError(axiosErr?.response?.data?.detail || 'Error al calcular')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    background: '#0D1117',
    border: '1px solid #30363D',
    borderRadius: '4px',
    color: '#E6EDF3',
    padding: '5px 8px',
    fontSize: '12px',
    width: '100%',
  }

  const labelStyle = {
    display: 'block',
    color: '#8B949E',
    fontSize: '11px',
    marginBottom: '3px',
    fontFamily: "'IBM Plex Mono', monospace",
  }

  const cellStyle = {
    padding: '4px 6px',
    verticalAlign: 'top' as const,
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ color: '#E6EDF3', fontSize: '22px', fontWeight: 600, margin: 0 }}>
          Árbol de Caída de Tensión
        </h1>
        <p style={{ color: '#8B949E', fontSize: '13px', marginTop: '6px' }}>
          Caída acumulada por red de distribución — RIC Art. 5.5.4. Límite total: 5%.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Tensión origen */}
        <div style={{
          background: '#161B22', border: '1px solid #30363D', borderRadius: '8px',
          padding: '16px', marginBottom: '16px', display: 'inline-block',
        }}>
          <label style={labelStyle}>Tensión en el origen (V)</label>
          <input
            type="number" style={{ ...inputStyle, width: '140px' }}
            value={tensionOrigen}
            onChange={e => setTensionOrigen(Number(e.target.value))}
            min={12} max={25000} step={1} required
          />
        </div>

        {/* Tramos */}
        <div style={{ background: '#161B22', border: '1px solid #30363D', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ color: '#E6EDF3', fontSize: '15px', fontWeight: 600, margin: 0 }}>
              Tramos ({tramos.length})
            </h2>
            <button
              type="button"
              onClick={addTramo}
              style={{
                background: '#21262D', border: '1px solid #30363D', borderRadius: '4px',
                color: '#58A6FF', padding: '6px 14px', cursor: 'pointer', fontSize: '13px',
              }}
            >
              + Agregar tramo
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #30363D' }}>
                  {['#', 'Nombre', 'Sistema', 'Tensión (V)', 'Potencia (kW)', 'FP', 'Long. (m)', 'Sección (mm²)', 'Material', 'Tipo circuito', ''].map(h => (
                    <th key={h} style={{ color: '#8B949E', fontSize: '11px', fontWeight: 500, textAlign: 'left', padding: '4px 6px', fontFamily: "'IBM Plex Mono', monospace" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tramos.map((tramo, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #21262D' }}>
                    <td style={{ ...cellStyle, color: '#8B949E', fontSize: '12px', fontFamily: "'IBM Plex Mono', monospace", width: '24px' }}>
                      {idx + 1}
                    </td>
                    <td style={cellStyle}>
                      <input
                        style={inputStyle} type="text" value={tramo.nombre}
                        onChange={e => updateTramo(idx, 'nombre', e.target.value)}
                        placeholder={`Tramo ${idx + 1}`} required
                      />
                    </td>
                    <td style={cellStyle}>
                      <select style={inputStyle} value={tramo.sistema}
                        onChange={e => updateTramo(idx, 'sistema', e.target.value)}>
                        {SISTEMAS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={cellStyle}>
                      <input
                        style={inputStyle} type="number" value={tramo.tension_v}
                        onChange={e => updateTramo(idx, 'tension_v', Number(e.target.value))}
                        min={12} max={25000} step={1} required
                      />
                    </td>
                    <td style={cellStyle}>
                      <input
                        style={inputStyle} type="number" value={tramo.potencia_kw}
                        onChange={e => updateTramo(idx, 'potencia_kw', Number(e.target.value))}
                        min={0.01} step={0.1} required
                      />
                    </td>
                    <td style={cellStyle}>
                      <input
                        style={inputStyle} type="number" value={tramo.factor_potencia}
                        onChange={e => updateTramo(idx, 'factor_potencia', Number(e.target.value))}
                        min={0.1} max={1} step={0.01} required
                      />
                    </td>
                    <td style={cellStyle}>
                      <input
                        style={inputStyle} type="number" value={tramo.longitud_m}
                        onChange={e => updateTramo(idx, 'longitud_m', Number(e.target.value))}
                        min={0.1} step={0.5} required
                      />
                    </td>
                    <td style={cellStyle}>
                      <select style={inputStyle} value={tramo.seccion_mm2}
                        onChange={e => updateTramo(idx, 'seccion_mm2', Number(e.target.value))}>
                        {SECCIONES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={cellStyle}>
                      <select style={inputStyle} value={tramo.material}
                        onChange={e => updateTramo(idx, 'material', e.target.value)}>
                        {MATERIALES.map(m => <option key={m} value={m}>{m === 'cu' ? 'Cobre' : 'Aluminio'}</option>)}
                      </select>
                    </td>
                    <td style={cellStyle}>
                      <select style={inputStyle} value={tramo.tipo_circuito}
                        onChange={e => updateTramo(idx, 'tipo_circuito', e.target.value)}>
                        {TIPOS_CIRCUITO.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td style={cellStyle}>
                      <button
                        type="button"
                        onClick={() => removeTramo(idx)}
                        disabled={tramos.length <= 1}
                        style={{
                          background: 'transparent', border: '1px solid #F8514922',
                          borderRadius: '4px', color: '#F85149',
                          padding: '4px 8px', cursor: tramos.length <= 1 ? 'not-allowed' : 'pointer',
                          fontSize: '12px', opacity: tramos.length <= 1 ? 0.4 : 1,
                        }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            background: loading ? '#21262D' : '#238636',
            border: '1px solid #2EA043',
            borderRadius: '6px',
            color: '#E6EDF3',
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: '24px',
          }}
        >
          {loading ? 'Calculando...' : 'Calcular árbol de caída'}
        </button>
      </form>

      {error && (
        <div style={{
          background: '#F8514918', border: '1px solid #F85149',
          borderRadius: '8px', padding: '12px 16px', marginBottom: '16px',
          color: '#F85149', fontSize: '13px',
        }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ background: '#161B22', border: '1px solid #30363D', borderRadius: '8px', padding: '20px' }}>
          {/* Resumen total */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{
              background: result.cumple_total ? '#3FB95018' : '#F8514918',
              border: `1px solid ${result.cumple_total ? '#3FB950' : '#F85149'}`,
              borderRadius: '8px', padding: '12px 20px',
            }}>
              <div style={{ color: '#8B949E', fontSize: '11px', fontFamily: "'IBM Plex Mono', monospace" }}>
                CAÍDA TOTAL ACUMULADA
              </div>
              <div style={{
                color: result.cumple_total ? '#3FB950' : '#F85149',
                fontSize: '28px', fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace",
              }}>
                {result.caida_total_pct.toFixed(2)}%
              </div>
              <div style={{
                color: result.cumple_total ? '#3FB950' : '#F85149',
                fontSize: '12px', fontWeight: 600,
              }}>
                {result.cumple_total ? '✓ Cumple RIC (≤ 5%)' : '✗ Supera límite RIC (> 5%)'}
              </div>
            </div>
          </div>

          {/* Advertencias */}
          {result.advertencias.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              {result.advertencias.map((adv, i) => (
                <div key={i} style={{
                  background: '#F0B42918', border: '1px solid #F0B429',
                  borderRadius: '6px', padding: '8px 12px', marginBottom: '6px',
                  color: '#F0B429', fontSize: '12px',
                }}>
                  ⚠ {adv}
                </div>
              ))}
            </div>
          )}

          {/* Tabla de resultados */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #30363D' }}>
                  {[
                    '#', 'Tramo', 'I (A)', 'ΔV tramo (V)', 'ΔV tramo (%)',
                    'ΔV acum. (V)', 'ΔV acum. (%)', 'V final (V)', 'Límite (%)', 'Estado',
                  ].map(h => (
                    <th key={h} style={{
                      color: '#8B949E', fontSize: '11px', fontWeight: 600,
                      textAlign: 'left', padding: '8px 10px',
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.tramos.map((t, idx) => {
                  const rowBg = !t.cumple ? '#F8514908' : 'transparent'
                  const mono = { fontFamily: "'IBM Plex Mono', monospace" }
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #21262D', background: rowBg }}>
                      <td style={{ padding: '8px 10px', color: '#8B949E', ...mono }}>{idx + 1}</td>
                      <td style={{ padding: '8px 10px', color: '#E6EDF3', fontWeight: 500 }}>{t.nombre}</td>
                      <td style={{ padding: '8px 10px', color: '#58A6FF', ...mono }}>{t.i_a.toFixed(2)}</td>
                      <td style={{ padding: '8px 10px', color: '#E6EDF3', ...mono }}>{t.caida_v.toFixed(3)}</td>
                      <td style={{ padding: '8px 10px', color: '#E6EDF3', ...mono }}>{t.caida_pct.toFixed(3)}</td>
                      <td style={{ padding: '8px 10px', color: t.cumple ? '#E6EDF3' : '#F85149', fontWeight: 600, ...mono }}>
                        {t.caida_acumulada_v.toFixed(3)}
                      </td>
                      <td style={{ padding: '8px 10px', color: t.cumple ? '#E6EDF3' : '#F85149', fontWeight: 700, ...mono }}>
                        {t.caida_acumulada_pct.toFixed(3)}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#8B949E', ...mono }}>{t.tension_final_v.toFixed(2)}</td>
                      <td style={{ padding: '8px 10px', color: '#8B949E', ...mono }}>{t.limite_pct.toFixed(1)}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{
                          background: t.cumple ? '#3FB95018' : '#F8514918',
                          border: `1px solid ${t.cumple ? '#3FB950' : '#F85149'}`,
                          borderRadius: '4px',
                          color: t.cumple ? '#3FB950' : '#F85149',
                          padding: '2px 8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          fontFamily: "'IBM Plex Mono', monospace",
                        }}>
                          {t.cumple ? '✓ OK' : '✗ NOK'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
