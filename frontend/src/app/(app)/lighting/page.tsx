'use client'
import { useState } from 'react'
import { calcLighting } from '@/lib/api'
import type { LightingInput, LightingResult } from '@/types'

// Tipos de recinto NCh 2/1984 con niveles mínimos (lux)
const TIPOS_RECINTO: { value: string; label: string; lux: number }[] = [
  { value: 'vivienda_habitacion',    label: 'Vivienda — Habitación',         lux: 100 },
  { value: 'vivienda_cocina',        label: 'Vivienda — Cocina',             lux: 200 },
  { value: 'vivienda_bano',          label: 'Vivienda — Baño',               lux: 150 },
  { value: 'oficina_trabajo_normal', label: 'Oficina — Trabajo normal',      lux: 300 },
  { value: 'oficina_dibujo',         label: 'Oficina — Dibujo técnico',      lux: 500 },
  { value: 'salon_clases',           label: 'Salón de clases',               lux: 300 },
  { value: 'taller_trabajo_grueso',  label: 'Taller — Trabajo grueso',       lux: 200 },
  { value: 'taller_trabajo_fino',    label: 'Taller — Trabajo fino',         lux: 500 },
  { value: 'pasillo',                label: 'Pasillo / Circulación',         lux: 100 },
  { value: 'estacionamiento',        label: 'Estacionamiento',               lux: 50  },
  { value: 'bodega',                 label: 'Bodega',                        lux: 100 },
  { value: 'hospital_sala_general',  label: 'Hospital — Sala general',       lux: 300 },
  { value: 'laboratorio',            label: 'Laboratorio',                   lux: 500 },
  { value: 'sala_reuniones',         label: 'Sala de reuniones',             lux: 300 },
  { value: 'recepcion',              label: 'Recepción',                     lux: 200 },
]

const defaultInput = (): LightingInput => ({
  largo_m: 6.0,
  ancho_m: 4.0,
  altura_m: 2.8,
  altura_trabajo_m: 0.85,
  flujo_luminaria_lm: 3200,
  tipo_recinto: 'oficina_trabajo_normal',
  iluminancia_objetivo_lux: 300,
  reflectancia_techo: 0.7,
  reflectancia_paredes: 0.5,
  factor_mantenimiento: 0.7,
  potencia_luminaria_w: 36,
})

// ── Estilos ───────────────────────────────────────────────────────────────────

const s = {
  page: {
    padding: '24px',
    maxWidth: '900px',
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
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '14px',
    marginBottom: '14px',
  } as React.CSSProperties,
  grid3: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '14px',
    marginBottom: '14px',
  } as React.CSSProperties,
  label: {
    display: 'block',
    fontSize: '12px',
    color: '#8B949E',
    marginBottom: '4px',
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '8px 10px',
    background: '#0D1117',
    border: '1px solid #30363D',
    borderRadius: '5px',
    color: '#E6EDF3',
    fontSize: '13px',
    fontFamily: "'IBM Plex Mono', monospace",
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  select: {
    width: '100%',
    padding: '8px 10px',
    background: '#0D1117',
    border: '1px solid #30363D',
    borderRadius: '5px',
    color: '#E6EDF3',
    fontSize: '13px',
    fontFamily: "'IBM Plex Sans', sans-serif",
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  btn: {
    padding: '10px 28px',
    background: '#58A6FF',
    color: '#000',
    border: 'none',
    borderRadius: '5px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'IBM Plex Sans', sans-serif",
  } as React.CSSProperties,
  resultRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '9px 0',
    borderBottom: '1px solid #21262D',
    fontSize: '13px',
  } as React.CSSProperties,
  resultLabel: {
    color: '#8B949E',
  } as React.CSSProperties,
  resultValue: {
    fontFamily: "'IBM Plex Mono', monospace",
    color: '#E6EDF3',
    fontWeight: 500,
  } as React.CSSProperties,
  bigNumber: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '36px',
    fontWeight: 700,
    color: '#58A6FF',
    textAlign: 'center' as const,
    marginBottom: '4px',
  } as React.CSSProperties,
  bigLabel: {
    fontSize: '12px',
    color: '#8B949E',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  badgeGreen: {
    display: 'inline-block',
    padding: '3px 10px',
    background: 'rgba(63,185,80,0.15)',
    color: '#3FB950',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
  } as React.CSSProperties,
  badgeRed: {
    display: 'inline-block',
    padding: '3px 10px',
    background: 'rgba(248,81,73,0.15)',
    color: '#F85149',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
  } as React.CSSProperties,
  badgeYellow: {
    display: 'inline-block',
    padding: '3px 10px',
    background: 'rgba(240,180,41,0.15)',
    color: '#F0B429',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
  } as React.CSSProperties,
  errorBox: {
    background: 'rgba(248,81,73,0.1)',
    border: '1px solid rgba(248,81,73,0.3)',
    borderRadius: '6px',
    padding: '12px 16px',
    color: '#F85149',
    fontSize: '13px',
    marginTop: '12px',
  } as React.CSSProperties,
  warnBox: {
    background: 'rgba(240,180,41,0.08)',
    border: '1px solid rgba(240,180,41,0.25)',
    borderRadius: '6px',
    padding: '12px 16px',
    fontSize: '13px',
    color: '#F0B429',
    marginBottom: '16px',
  } as React.CSSProperties,
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function LightingPage() {
  const [form, setForm] = useState<LightingInput>(defaultInput())
  const [result, setResult] = useState<LightingResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: keyof LightingInput, value: string | number | undefined) =>
    setForm(f => ({ ...f, [field]: value }))

  const handleTipoRecinto = (value: string) => {
    const tipo = TIPOS_RECINTO.find(t => t.value === value)
    setForm(f => ({
      ...f,
      tipo_recinto: value,
      iluminancia_objetivo_lux: tipo ? tipo.lux : f.iluminancia_objetivo_lux,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await calcLighting(form)
      setResult(res)
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail) || 'Error al calcular')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Cálculo de Iluminación</h1>
      <p style={s.subtitle}>Método de Cavidades Zonales — Verificación NCh 2/1984</p>

      <form onSubmit={handleSubmit}>

        {/* Dimensiones del recinto */}
        <div style={s.card}>
          <div style={s.sectionTitle}>Dimensiones del Recinto</div>
          <div style={s.grid3}>
            <div>
              <label style={s.label}>Largo (m)</label>
              <input style={s.input} type="number" step="0.1" min="0.5"
                value={form.largo_m}
                onChange={e => set('largo_m', parseFloat(e.target.value))} required />
            </div>
            <div>
              <label style={s.label}>Ancho (m)</label>
              <input style={s.input} type="number" step="0.1" min="0.5"
                value={form.ancho_m}
                onChange={e => set('ancho_m', parseFloat(e.target.value))} required />
            </div>
            <div>
              <label style={s.label}>Altura total (m)</label>
              <input style={s.input} type="number" step="0.05" min="1.5"
                value={form.altura_m}
                onChange={e => set('altura_m', parseFloat(e.target.value))} required />
            </div>
          </div>
          <div style={{ ...s.grid2, marginBottom: 0 }}>
            <div>
              <label style={s.label}>Altura plano de trabajo (m)</label>
              <input style={s.input} type="number" step="0.05" min="0"
                value={form.altura_trabajo_m}
                onChange={e => set('altura_trabajo_m', parseFloat(e.target.value))} required />
            </div>
            <div>
              <label style={s.label} title="Área = Largo × Ancho">
                Área estimada (m²)
              </label>
              <input style={{ ...s.input, background: '#0a0f15', color: '#8B949E' }}
                type="text" readOnly
                value={(form.largo_m * form.ancho_m).toFixed(1) + ' m²'} />
            </div>
          </div>
        </div>

        {/* Tipo de recinto e iluminancia */}
        <div style={s.card}>
          <div style={s.sectionTitle}>Tipo de Recinto e Iluminancia</div>
          <div style={s.grid2}>
            <div>
              <label style={s.label}>Tipo de recinto (NCh 2/1984)</label>
              <select style={s.select} value={form.tipo_recinto}
                onChange={e => handleTipoRecinto(e.target.value)}>
                {TIPOS_RECINTO.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.label} ({t.lux} lux mín.)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={s.label}>Iluminancia objetivo (lux)</label>
              <input style={s.input} type="number" step="10" min="10"
                value={form.iluminancia_objetivo_lux ?? ''}
                placeholder="Auto desde NCh 2"
                onChange={e => set('iluminancia_objetivo_lux',
                  e.target.value ? parseFloat(e.target.value) : undefined)} />
            </div>
          </div>
        </div>

        {/* Luminaria */}
        <div style={s.card}>
          <div style={s.sectionTitle}>Luminaria</div>
          <div style={s.grid2}>
            <div>
              <label style={s.label}>Flujo luminoso (lm)</label>
              <input style={s.input} type="number" step="100" min="100"
                value={form.flujo_luminaria_lm}
                onChange={e => set('flujo_luminaria_lm', parseFloat(e.target.value))} required />
            </div>
            <div>
              <label style={s.label}>Potencia luminaria (W)</label>
              <input style={s.input} type="number" step="1" min="1"
                value={form.potencia_luminaria_w}
                onChange={e => set('potencia_luminaria_w', parseFloat(e.target.value))} required />
            </div>
          </div>
          {form.flujo_luminaria_lm > 0 && form.potencia_luminaria_w > 0 && (
            <p style={{ fontSize: '12px', color: '#8B949E', margin: 0 }}>
              Eficacia: {(form.flujo_luminaria_lm / form.potencia_luminaria_w).toFixed(0)} lm/W
            </p>
          )}
        </div>

        {/* Parámetros fotométricos */}
        <div style={s.card}>
          <div style={s.sectionTitle}>Parámetros Fotométricos</div>
          <div style={s.grid3}>
            <div>
              <label style={s.label}>Reflectancia techo (0-1)</label>
              <input style={s.input} type="number" step="0.05" min="0" max="1"
                value={form.reflectancia_techo}
                onChange={e => set('reflectancia_techo', parseFloat(e.target.value))} required />
            </div>
            <div>
              <label style={s.label}>Reflectancia paredes (0-1)</label>
              <input style={s.input} type="number" step="0.05" min="0" max="1"
                value={form.reflectancia_paredes}
                onChange={e => set('reflectancia_paredes', parseFloat(e.target.value))} required />
            </div>
            <div>
              <label style={s.label}>Factor de mantenimiento</label>
              <input style={s.input} type="number" step="0.05" min="0.3" max="1"
                value={form.factor_mantenimiento}
                onChange={e => set('factor_mantenimiento', parseFloat(e.target.value))} required />
            </div>
          </div>
          <p style={{ fontSize: '12px', color: '#8B949E', margin: 0 }}>
            Reflexiones típicas: techo blanco 0.7–0.8, paredes claras 0.5–0.6, piso 0.2–0.3.
            Factor mantenimiento: limpio 0.8, normal 0.7, sucio 0.6.
          </p>
        </div>

        <button type="submit" style={s.btn} disabled={loading}>
          {loading ? 'Calculando...' : 'Calcular Iluminación'}
        </button>

        {error && <div style={s.errorBox}>{error}</div>}
      </form>

      {/* Resultados */}
      {result && (
        <div style={{ marginTop: '28px' }}>
          <h2 style={{ ...s.h1, fontSize: '18px', marginBottom: '16px' }}>Resultados</h2>

          {/* Advertencias */}
          {result.advertencias.length > 0 && (
            <div style={s.warnBox}>
              <strong style={{ display: 'block', marginBottom: '6px' }}>Advertencias</strong>
              <ul style={{ margin: 0, paddingLeft: '18px' }}>
                {result.advertencias.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}

          {/* Hero: N luminarias y distribución */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div style={{ ...s.card, textAlign: 'center', marginBottom: 0 }}>
              <div style={s.bigNumber}>{result.numero_luminarias}</div>
              <div style={s.bigLabel}>Luminarias necesarias</div>
            </div>
            <div style={{ ...s.card, textAlign: 'center', marginBottom: 0 }}>
              <div style={s.bigNumber}>{result.filas} × {result.columnas}</div>
              <div style={s.bigLabel}>Distribución (filas × columnas)</div>
            </div>
            <div style={{ ...s.card, textAlign: 'center', marginBottom: 0 }}>
              <div style={{ ...s.bigNumber, color: result.cumple_nch2 ? '#3FB950' : '#F85149' }}>
                {result.iluminancia_real_lux.toFixed(0)} lux
              </div>
              <div style={s.bigLabel}>
                Iluminancia real{' '}
                {result.cumple_nch2
                  ? <span style={s.badgeGreen}>Cumple NCh 2</span>
                  : <span style={s.badgeRed}>No cumple NCh 2</span>
                }
              </div>
            </div>
          </div>

          {/* Detalle del cálculo */}
          <div style={s.card}>
            <div style={s.sectionTitle}>Detalle del Cálculo</div>

            <div style={s.resultRow}>
              <span style={s.resultLabel}>Área del recinto</span>
              <span style={s.resultValue}>{result.area_m2.toFixed(1)} m²</span>
            </div>
            <div style={s.resultRow}>
              <span style={s.resultLabel}>Índice del local (k)</span>
              <span style={s.resultValue}>{result.indice_local_k.toFixed(3)}</span>
            </div>
            <div style={s.resultRow}>
              <span style={s.resultLabel}>Coeficiente de utilización (CU)</span>
              <span style={s.resultValue}>{result.coeficiente_utilizacion.toFixed(4)}</span>
            </div>
            <div style={s.resultRow}>
              <span style={s.resultLabel}>Factor de mantenimiento (fm)</span>
              <span style={s.resultValue}>{result.factor_mantenimiento.toFixed(2)}</span>
            </div>
            <div style={s.resultRow}>
              <span style={s.resultLabel}>Iluminancia objetivo</span>
              <span style={s.resultValue}>{result.iluminancia_objetivo_lux.toFixed(0)} lux</span>
            </div>
            <div style={s.resultRow}>
              <span style={s.resultLabel}>Nivel mínimo NCh 2/1984</span>
              <span style={s.resultValue}>{result.nivel_minimo_nch2_lux.toFixed(0)} lux</span>
            </div>
            <div style={s.resultRow}>
              <span style={s.resultLabel}>Iluminancia real obtenida</span>
              <span style={{ ...s.resultValue, color: result.cumple_nch2 ? '#3FB950' : '#F85149' }}>
                {result.iluminancia_real_lux.toFixed(1)} lux
              </span>
            </div>
            <div style={s.resultRow}>
              <span style={s.resultLabel}>Cumplimiento NCh 2/1984</span>
              <span>
                {result.cumple_nch2
                  ? <span style={s.badgeGreen}>CUMPLE</span>
                  : <span style={s.badgeRed}>NO CUMPLE</span>
                }
              </span>
            </div>
          </div>

          {/* Distribución */}
          <div style={s.card}>
            <div style={s.sectionTitle}>Distribución de Luminarias</div>

            <div style={s.resultRow}>
              <span style={s.resultLabel}>Luminarias</span>
              <span style={s.resultValue}>{result.numero_luminarias} uds.</span>
            </div>
            <div style={s.resultRow}>
              <span style={s.resultLabel}>Filas × Columnas</span>
              <span style={s.resultValue}>{result.filas} × {result.columnas}</span>
            </div>
            <div style={s.resultRow}>
              <span style={s.resultLabel}>Separación entre luminarias (largo)</span>
              <span style={s.resultValue}>{result.separacion_largo_m.toFixed(2)} m</span>
            </div>
            <div style={s.resultRow}>
              <span style={s.resultLabel}>Separación entre luminarias (ancho)</span>
              <span style={s.resultValue}>{result.separacion_ancho_m.toFixed(2)} m</span>
            </div>
          </div>

          {/* Potencia */}
          <div style={s.card}>
            <div style={s.sectionTitle}>Potencia Instalada</div>

            <div style={s.resultRow}>
              <span style={s.resultLabel}>Potencia total instalada</span>
              <span style={s.resultValue}>{result.potencia_instalada_w.toFixed(0)} W</span>
            </div>
            <div style={{ ...s.resultRow, borderBottom: 'none' }}>
              <span style={s.resultLabel}>Densidad de potencia</span>
              <span style={{
                ...s.resultValue,
                color: result.densidad_potencia_wm2 > 15 ? '#F0B429' : '#E6EDF3',
              }}>
                {result.densidad_potencia_wm2.toFixed(1)} W/m²
                {result.densidad_potencia_wm2 <= 15
                  ? <span style={{ ...s.badgeGreen, marginLeft: '8px', fontSize: '11px' }}>≤ 15 W/m²</span>
                  : <span style={{ ...s.badgeYellow, marginLeft: '8px', fontSize: '11px' }}>&gt; 15 W/m²</span>
                }
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
