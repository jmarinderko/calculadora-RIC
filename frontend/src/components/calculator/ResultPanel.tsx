'use client'
import { useState } from 'react'
import type { CalculatorResponse } from '@/types'

interface Props {
  result: CalculatorResponse
  input?: { sistema: string; tension_v: number; potencia_kw: number; longitud_m: number }
  onRecalculate?: (seccionMm2: number) => void
}

// Tabla RIC simplificada para preview en editor (mismos valores que backend)
const TABLA_PREVIEW = [
  { sec: 1.5,  rcu: 12.10, ral: 0,     icu_d: 13,  icu_a: 17,  awg: '14 AWG'  },
  { sec: 2.5,  rcu: 7.41,  ral: 0,     icu_d: 18,  icu_a: 23,  awg: '12 AWG'  },
  { sec: 4,    rcu: 4.61,  ral: 0,     icu_d: 24,  icu_a: 31,  awg: '10 AWG'  },
  { sec: 6,    rcu: 3.08,  ral: 0,     icu_d: 31,  icu_a: 40,  awg: '8 AWG'   },
  { sec: 10,   rcu: 1.83,  ral: 3.08,  icu_d: 42,  icu_a: 54,  awg: '6 AWG'   },
  { sec: 16,   rcu: 1.15,  ral: 1.91,  icu_d: 56,  icu_a: 73,  awg: '4 AWG'   },
  { sec: 25,   rcu: 0.727, ral: 1.20,  icu_d: 73,  icu_a: 95,  awg: '2 AWG'   },
  { sec: 35,   rcu: 0.524, ral: 0.868, icu_d: 89,  icu_a: 117, awg: '1 AWG'   },
  { sec: 50,   rcu: 0.387, ral: 0.641, icu_d: 108, icu_a: 141, awg: '1/0 AWG' },
  { sec: 70,   rcu: 0.268, ral: 0.443, icu_d: 136, icu_a: 179, awg: '2/0 AWG' },
  { sec: 95,   rcu: 0.193, ral: 0.320, icu_d: 164, icu_a: 216, awg: '3/0 AWG' },
  { sec: 120,  rcu: 0.153, ral: 0.253, icu_d: 188, icu_a: 249, awg: '4/0 AWG' },
  { sec: 150,  rcu: 0.124, ral: 0.206, icu_d: 216, icu_a: 285, awg: '250 MCM' },
  { sec: 185,  rcu: 0.0991,ral: 0.164, icu_d: 245, icu_a: 324, awg: '350 MCM' },
  { sec: 240,  rcu: 0.0754,ral: 0.125, icu_d: 286, icu_a: 380, awg: '500 MCM' },
  { sec: 300,  rcu: 0.0601,ral: 0.100, icu_d: 328, icu_a: 435, awg: '600 MCM' },
]

const AWG_TO_MM2: Record<string, number> = {
  '14 AWG — 2.5 mm²': 2.5, '12 AWG — 4 mm²': 4, '10 AWG — 6 mm²': 6,
  '8 AWG — 10 mm²': 10,   '6 AWG — 16 mm²': 16, '4 AWG — 25 mm²': 25,
  '2 AWG — 35 mm²': 35,   '1/0 AWG — 50 mm²': 50, '2/0 AWG — 70 mm²': 70,
  '3/0 AWG — 95 mm²': 95, '4/0 AWG — 120 mm²': 120, '350 MCM — 185 mm²': 185,
  '500 MCM — 240 mm²': 240,'600 MCM — 300 mm²': 300,
}

function fmt(n: number, dec = 2): string {
  return parseFloat(n.toFixed(dec)).toString()
}

const SISTEMA_NOMBRE: Record<string, string> = {
  trifasico: 'Trifásico', bifasico: 'Bifásico', monofasico: 'Monofásico',
}
const MONTAJE_NOMBRE: Record<string, string> = {
  vista: 'A la vista', banco: 'Banco de ducto', oculto: 'Oculto / empotrado',
}

export function ResultPanel({ result, input, onRecalculate }: Props) {
  const [unidad,    setUnidad]    = useState<'mm2' | 'awg'>('mm2')
  const [editing,   setEditing]   = useState(false)
  const [editSec,   setEditSec]   = useState<string>(String(result.resultado.seccion_mm2))
  const [editAwg,   setEditAwg]   = useState<string>('')

  function getEditMm2(): number {
    if (unidad === 'awg') {
      const mm2str = editAwg.split('—')[1]?.trim().replace(' mm²','').trim()
      return parseFloat(mm2str || '0')
    }
    return parseFloat(editSec) || 0
  }

  function previewText(): string {
    const mm2 = getEditMm2()
    const row = TABLA_PREVIEW.find(r => r.sec === mm2)
    if (!row) return ''
    const material = result.resultado.material
    const imax = material === 'cu' ? row.icu_d : (row.ral ? row.icu_d : 0)
    const r_ohm = material === 'cu' ? row.rcu : row.ral
    return `I_max ducto: ${imax} A  ·  R: ${r_ohm} Ω/km  ·  ${row.awg}`
  }

  function handleRecalculate() {
    const mm2 = getEditMm2()
    if (mm2 && onRecalculate) {
      onRecalculate(mm2)
      setEditing(false)
    }
  }
  const r = result.resultado

  const ok        = r.cumple
  const barPct    = Math.min((r.caida_pct / r.limite_caida_pct) * 100, 110)
  const barClass  = r.caida_pct <= r.limite_caida_pct * 0.75 ? 'ok-bar'
                  : r.caida_pct <= r.limite_caida_pct       ? 'warn-bar' : 'fail-bar'
  const limitePct = 100 // límite siempre al 100% de la barra

  const matNombre   = r.material === 'cu' ? 'Cobre (Cu)' : 'Aluminio (Al)'
  const sistemaNombre = input ? (SISTEMA_NOMBRE[input.sistema] ?? input.sistema) : ''

  const titulo = input
    ? `${sistemaNombre} · ${input.tension_v}V · ${input.potencia_kw} kW · ${input.longitud_m} m`
    : 'Resultado'

  return (
    <div>
      {/* ── HEADER ── */}
      <div className="result-header">
        <span className="result-title">{titulo}</span>
        <span className={`result-badge ${ok ? 'badge-ok' : 'badge-err'}`}>
          {ok ? '✓ Cumple RIC' : '✗ No cumple'}
        </span>
      </div>

      {/* ── ADVERTENCIAS ── */}
      {r.ajustado_por_minimo && (
        <div className="warn-box">
          Sección aumentada al mínimo normativo RIC Art. 5.3.1: {r.sec_min_ric_mm2} mm². El cálculo térmico daba una sección menor.
        </div>
      )}
      {r.ajustado_por_caida && (
        <div className="warn-box">
          Sección aumentada por criterio caída de tensión ({fmt(r.caida_pct)}% {'>'} {r.limite_caida_pct}% límite RIC).
        </div>
      )}
      {r.advertencias?.filter(w => !w.includes('ajust')).map((w, i) => (
        <div key={i} className="warn-box">{w}</div>
      ))}
      {r.cables_por_fase > 1 && (
        <div className="info-box">Paralelo: todos los cables deben ser de igual longitud, material, sección y tipo (RIC Art. 5.3.2).</div>
      )}

      {/* ── TARJETAS PRINCIPALES ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px', marginBottom: '16px' }}>

        {/* Sección */}
        <div className="result-card highlight">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div className="rc-label" style={{ margin: 0 }}>Sección del conductor</div>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              {/* Toggle mm²/AWG */}
              <div style={{ display: 'flex', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                {(['mm2','awg'] as const).map(u => (
                  <button key={u} onClick={() => setUnidad(u)} style={{
                    padding: '2px 8px',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '10px',
                    fontWeight: u === 'mm2' ? 600 : 500,
                    border: 'none',
                    background: unidad === u ? 'var(--accent)' : 'transparent',
                    color: unidad === u ? '#000' : 'var(--text3)',
                    cursor: 'pointer',
                  }}>{u === 'mm2' ? 'mm²' : 'AWG'}</button>
                ))}
              </div>
              {/* Botón editar */}
              {onRecalculate && (
                <button
                  onClick={() => { setEditing(e => !e); setEditSec(String(r.seccion_mm2)) }}
                  title="Editar sección manualmente"
                  style={{
                    padding: '2px 7px',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '10px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    background: editing ? 'var(--accent)' : 'transparent',
                    color: editing ? '#000' : 'var(--text3)',
                    cursor: 'pointer',
                  }}
                >✎</button>
              )}
            </div>
          </div>

          {/* Vista normal */}
          {!editing && (
            <>
              <div className="rc-value accent">
                {unidad === 'mm2' ? r.seccion_mm2 : r.calibre_awg}
                {unidad === 'mm2' && <span className="rc-unit">mm²</span>}
              </div>
              <div className="rc-sub">
                {unidad === 'mm2' ? r.calibre_awg : `${r.seccion_mm2} mm²`} · {matNombre}
              </div>
            </>
          )}

          {/* Vista edición */}
          {editing && (
            <div>
              {unidad === 'mm2' && (
                <select
                  value={editSec}
                  onChange={e => setEditSec(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg3)',
                    border: '1px solid var(--accent)',
                    borderRadius: '4px',
                    color: 'var(--accent)',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '18px',
                    fontWeight: 600,
                    padding: '4px 8px',
                    outline: 'none',
                    appearance: 'none',
                    marginBottom: '4px',
                  }}
                >
                  {TABLA_PREVIEW.map(r => (
                    <option key={r.sec} value={r.sec}>{r.sec} mm²</option>
                  ))}
                </select>
              )}
              {unidad === 'awg' && (
                <select
                  value={editAwg}
                  onChange={e => setEditAwg(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg3)',
                    border: '1px solid var(--accent)',
                    borderRadius: '4px',
                    color: 'var(--accent)',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '18px',
                    fontWeight: 600,
                    padding: '4px 8px',
                    outline: 'none',
                    appearance: 'none',
                    marginBottom: '4px',
                  }}
                >
                  {Object.keys(AWG_TO_MM2).map(label => (
                    <option key={label} value={label}>{label}</option>
                  ))}
                </select>
              )}
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                <button
                  onClick={handleRecalculate}
                  style={{
                    flex: 1,
                    padding: '6px',
                    background: 'var(--accent)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '4px',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >Recalcular ↵</button>
                <button
                  onClick={() => setEditing(false)}
                  style={{
                    padding: '6px 10px',
                    background: 'transparent',
                    color: 'var(--text3)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >✕</button>
              </div>
              {previewText() && (
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '11px',
                  color: 'var(--text3)',
                  marginTop: '6px',
                }}>
                  {previewText()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cables por fase */}
        <div className="result-card highlight">
          <div className="rc-label">Cables por fase</div>
          <div className="rc-value accent">
            {r.cables_por_fase}
            <span className="rc-unit">cable{r.cables_por_fase > 1 ? 's' : ''}</span>
          </div>
          <div className="rc-sub">{r.cables_por_fase > 1 ? 'Paralelo' : 'Simple'}</div>
        </div>

        {/* Corriente */}
        <div className={`result-card ${r.cumple_termico ? 'ok-card' : 'err-card'}`}>
          <div className="rc-label">Corriente de diseño</div>
          <div className={`rc-value ${r.cumple_termico ? 'green' : 'red'}`}>
            {fmt(r.i_diseno_a)}
            <span className="rc-unit">A</span>
          </div>
          <div className="rc-sub">I_max corregida: {fmt(r.i_max_corregida_a)} A</div>
        </div>

        {/* Caída */}
        <div className={`result-card ${r.cumple_caida ? 'ok-card' : 'err-card'}`}>
          <div className="rc-label">Caída de tensión</div>
          <div className={`rc-value ${r.cumple_caida ? 'green' : 'red'}`}>
            {fmt(r.caida_pct)}%
            <span className="rc-unit">/ {r.limite_caida_pct}%</span>
          </div>
          <div className="rc-sub">{fmt(r.caida_v)} V absolutos</div>
        </div>
      </div>

      {/* ── BARRA CAÍDA ── */}
      <div className="detail-section">
        <div className="detail-section-title">Margen caída de tensión</div>
        <div className="caida-bar-wrap">
          <div className="caida-bar-label">
            <span>0%</span>
            <span>Calculada: {fmt(r.caida_pct)}%&nbsp;&nbsp;|&nbsp;&nbsp;Límite RIC: {r.limite_caida_pct}%</span>
            <span>{fmt(r.limite_caida_pct * 1.1, 1)}%</span>
          </div>
          <div className="caida-bar-bg">
            <div className={`caida-bar-fill ${barClass}`} style={{ width: `${barPct}%` }} />
            <div className="caida-limit-line" style={{ left: `${limitePct}%` }} />
          </div>
        </div>
      </div>

      {/* ── CONFIGURACIÓN ── */}
      <div className="config-box">
        <strong>Configuración del alimentador</strong>
        {r.descripcion_config}<br />
        Tierra: 1 cable × {r.sec_tierra_mm2} mm² ({r.material === 'cu' ? 'Cu' : 'Al'})<br />
        Neutro: {r.cables_por_fase} cable(s) × {r.sec_neutro_mm2} mm²
        {input?.sistema === 'trifasico' && r.seccion_mm2 > 16 ? ' (reducido RIC)' : ''}
      </div>

      {/* ── RADIO CURVATURA ── */}
      {r.radio_curvatura && (
        <div className="curv-box">
          <strong>Radio mínimo de curvatura del cable</strong>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
            <span className="curv-value">{fmt(r.radio_curvatura.radio_mm)}</span>
            <span className="curv-unit">mm</span>
            <span style={{ fontSize: '12px', color: 'var(--text3)', marginLeft: '8px' }}>
              {fmt(r.radio_curvatura.radio_mm / 10, 1)} cm &nbsp;/&nbsp; {fmt(r.radio_curvatura.radio_mm / 1000, 3)} m
            </span>
          </div>
          <div className="curv-grid">
            <div className="curv-item">
              <div className="curv-item-label">Diámetro ext.</div>
              <div className="curv-item-val">{fmt(r.radio_curvatura.diametro_mm)} mm</div>
              <div className="curv-item-sub">{r.radio_curvatura.tipo_constructivo}</div>
            </div>
            <div className="curv-item">
              <div className="curv-item-label">Factor aplicado</div>
              <div className="curv-item-val">{r.radio_curvatura.factor}×</div>
              <div className="curv-item-sub">{MONTAJE_NOMBRE[r.radio_curvatura.montaje] ?? r.radio_curvatura.montaje}</div>
            </div>
            <div className="curv-item">
              <div className="curv-item-label">Radio interno</div>
              <div className="curv-item-val">{fmt(r.radio_curvatura.radio_interno_mm)} mm</div>
              <div className="curv-item-sub">Sin espesor cable</div>
            </div>
          </div>
          <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text3)' }}>
            {r.radio_curvatura.descripcion_factor} · NEC 300.34 / IEC 60364-5-52
          </div>
        </div>
      )}

      {/* ── ESTRÉS TÉRMICO ── */}
      {r.estres_termico && (() => {
        const e = r.estres_termico!
        const pct    = Math.min(e.ratio_saturacion * 100, 120)
        const barCls = e.ratio_saturacion <= 0.75 ? 'ok-bar' : e.ratio_saturacion <= 1.0 ? 'warn-bar' : 'fail-bar'
        const tCls   = e.t_final_estimada_c <= e.t_max_c ? 'ok' : 'fail'
        return (
          <div className="estres-section">
            <div className="estres-header">
              Estrés térmico por cortocircuito
              <span className="badge-falla">{e.tipo_falla}</span>
              <span className="badge-falla" style={{
                marginLeft: 'auto',
                background: e.cumple ? 'var(--green-bg)' : 'var(--red-bg)',
                color: e.cumple ? 'var(--green)' : 'var(--red)',
                borderColor: e.cumple ? 'var(--green-bdr)' : 'var(--red-bdr)',
              }}>
                {e.cumple ? '✓ Cumple IEC 60949' : '✗ No cumple IEC 60949'}
              </span>
            </div>
            <div className="estres-grid">
              <div className="estres-cell">
                <div className="estres-cell-label">Icc efectiva</div>
                <div className="estres-cell-val warn">
                  {fmt(e.icc_efectiva_ka, 2)}
                  <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text3)', marginLeft: '3px' }}>kA</span>
                </div>
                <div className="estres-cell-sub">Factor falla: {e.factor_falla}×</div>
              </div>
              <div className="estres-cell">
                <div className="estres-cell-label">Sección mínima térmica</div>
                <div className={`estres-cell-val ${e.cumple ? 'ok' : 'fail'}`}>
                  {fmt(e.sec_min_termica_mm2, 1)}
                  <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text3)', marginLeft: '3px' }}>mm²</span>
                </div>
                <div className="estres-cell-sub">K = {e.k_const} A·s½/mm²</div>
              </div>
              <div className="estres-cell">
                <div className="estres-cell-label">Icc máx. soportada</div>
                <div className="estres-cell-val ok">
                  {fmt(e.icc_max_soportada_ka, 2)}
                  <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text3)', marginLeft: '3px' }}>kA</span>
                </div>
                <div className="estres-cell-sub">Con {r.seccion_mm2} mm² / {r.calibre_awg}</div>
              </div>
              <div className="estres-cell">
                <div className="estres-cell-label">Energía específica I²t</div>
                <div className="estres-cell-val warn">
                  {(e.i2t_ja / 1e6).toFixed(2)}
                  <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text3)', marginLeft: '3px' }}>MA²s</span>
                </div>
                <div className="estres-cell-sub">Icc² × t</div>
              </div>
              <div className="estres-cell">
                <div className="estres-cell-label">I²t máximo admisible</div>
                <div className="estres-cell-val ok">
                  {(e.i2t_max_ja / 1e6).toFixed(2)}
                  <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text3)', marginLeft: '3px' }}>MA²s</span>
                </div>
                <div className="estres-cell-sub">(K × S)²</div>
              </div>
              <div className="estres-cell">
                <div className="estres-cell-label">T° final estimada</div>
                <div className={`estres-cell-val ${tCls}`}>
                  {fmt(e.t_final_estimada_c, 0)}
                  <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text3)', marginLeft: '3px' }}>°C</span>
                </div>
                <div className="estres-cell-sub">Máx. admisible: {e.t_max_c}°C</div>
              </div>
            </div>
            <div className="estres-barra-wrap">
              <div className="estres-barra-label">
                <span>0%</span>
                <span>Saturación térmica: {(e.ratio_saturacion * 100).toFixed(1)}%&nbsp;&nbsp;|&nbsp;&nbsp;Límite: 100%</span>
                <span>120%</span>
              </div>
              <div className="estres-barra-bg">
                <div className={`estres-barra-fill ${barCls}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="estres-nota">
              Norma: IEC 60949 / IEC 60364-5-54 · Fórmula: S_mín = (Icc × √t) / K<br />
              {e.es_xlpe ? 'Aislación XLPE detectada (T°max ≥ 200°C)' : 'Aislación PVC/THW (T°max < 200°C)'} · Material: {r.material === 'cu' ? 'Cobre' : 'Aluminio'} · K = {e.k_const}
            </div>
          </div>
        )
      })()}

      {/* ── PROTECCIONES ── */}
      {r.proteccion && (() => {
        const p = r.proteccion!
        const tm = p.termomagnetico
        const diff = p.diferencial
        return (
          <div className="estres-section">
            <div className="estres-header">
              Protección recomendada — RIC Art. 4.4
              <span className="badge-falla" style={{
                marginLeft: 'auto',
                background: p.cumple ? 'var(--green-bg)' : 'var(--red-bg)',
                color: p.cumple ? 'var(--green)' : 'var(--red)',
                borderColor: p.cumple ? 'var(--green-bdr)' : 'var(--red-bdr)',
              }}>
                {p.cumple ? '✓ Cumple Ib ≤ In ≤ Iz' : '✗ No cumple RIC 4.4'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '12px 14px' }}>
              {/* Termomagnético */}
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text3)', marginBottom: '8px' }}>
                  Termomagnético
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'monospace', color: tm.cumple_ric ? 'var(--green)' : 'var(--red)', marginBottom: '4px' }}>
                  {tm.in_a}A curva {tm.curva}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text2)', marginBottom: '8px' }}>
                  {tm.tipo} · Icu {tm.icu_ka} kA
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text3)', borderTop: '1px solid var(--border)', paddingTop: '6px' }}>
                  {Object.entries(p.verificacion_ric).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                      <span>{k}</span>
                      <span style={{ fontFamily: 'monospace', color: v.includes('✗') ? 'var(--red)' : v.includes('✓') ? 'var(--green)' : 'var(--text)' }}>{v}</span>
                    </div>
                  ))}
                </div>
                {tm.advertencias.length > 0 && (
                  <div style={{ marginTop: '6px', fontSize: '10px', color: '#e36209', background: '#fff8c5', borderRadius: '4px', padding: '6px 8px' }}>
                    {tm.advertencias.map((a, i) => <div key={i}>⚠ {a}</div>)}
                  </div>
                )}
              </div>

              {/* Diferencial */}
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text3)', marginBottom: '8px' }}>
                  Diferencial (RCD)
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent)', marginBottom: '4px' }}>
                  {diff.in_a}A · {diff.i_delta_n_ma}mA
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text2)', marginBottom: '8px' }}>
                  {diff.num_polos}P tipo {diff.tipo_rcd} — IEC 61008
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text3)', borderTop: '1px solid var(--border)', paddingTop: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Sensibilidad</span><span style={{ fontFamily: 'monospace' }}>{diff.i_delta_n_ma} mA</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Polos</span><span style={{ fontFamily: 'monospace' }}>{diff.num_polos}P</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tipo RCD</span><span style={{ fontFamily: 'monospace' }}>{diff.tipo_rcd}</span></div>
                </div>
                {diff.advertencias.length > 0 && (
                  <div style={{ marginTop: '6px', fontSize: '10px', color: '#e36209', background: '#fff8c5', borderRadius: '4px', padding: '6px 8px' }}>
                    {diff.advertencias.map((a, i) => <div key={i}>⚠ {a}</div>)}
                  </div>
                )}
              </div>
            </div>

            <div className="estres-nota">
              Condición RIC Art. 4.4: Ib ≤ In ≤ Iz — Ib = corriente de diseño · In = calibre termomagnético · Iz = corriente máx. corregida del conductor<br />
              Curva B: 3–5×In (iluminación/resistivo) · Curva C: 5–10×In (general) · Curva D: 10–20×In (motores)<br />
              Diferencial tipo AC: falta sinusoidal · Tipo A: falta con componente DC (motores VFD, inversores) — IEC 61008 / IEC 61009
            </div>
          </div>
        )
      })()}

      {/* ── MEMORIA DE CÁLCULO ── */}
      <div className="detail-section">
        <div className="detail-section-title">Memoria de cálculo</div>
        {input && <div className="detail-row"><span className="dr-key">Sistema</span><span className="dr-val">{SISTEMA_NOMBRE[input.sistema] ?? input.sistema} — {input.tension_v} V</span></div>}
        <div className="detail-row"><span className="dr-key">Potencia de diseño</span><span className="dr-val">{r.i_calc_a ? fmt(r.i_calc_a) : '—'} A calculados</span></div>
        <div className="detail-row"><span className="dr-key">Corriente requerida (I/Fc)</span><span className="dr-val">{fmt(r.i_req_a)} A</span></div>
        <div className="detail-row"><span className="dr-key">Factor temp. ambiente (Ft)</span><span className="dr-val">{r.ft}</span></div>
        <div className="detail-row"><span className="dr-key">Factor agrupamiento (Fg)</span><span className="dr-val">{r.fg}</span></div>
        <div className="detail-row"><span className="dr-key">Factor altitud (Fa)</span><span className={`dr-val ${r.fa < 1 ? 'warn' : ''}`}>{r.fa} {r.fa < 1 ? '⚠' : '✓'}</span></div>
        <div className="detail-row"><span className="dr-key">Factor corrección total</span><span className="dr-val warn">{fmt(r.factor_total, 3)}</span></div>
        <div className="detail-row"><span className="dr-key">Sección elegida</span><span className="dr-val warn">{r.seccion_mm2} mm² ({r.calibre_awg})</span></div>
        <div className="detail-row"><span className="dr-key">Material</span><span className="dr-val">{matNombre}</span></div>
        <div className="detail-row"><span className="dr-key">Cables por fase</span><span className="dr-val">{r.cables_por_fase}</span></div>
        <div className="detail-row"><span className="dr-key">I_max corregida disponible</span><span className={`dr-val ${r.cumple_termico ? 'ok' : 'fail'}`}>{fmt(r.i_max_corregida_a)} A {r.cumple_termico ? '✓' : '✗'}</span></div>
        <div className="detail-row"><span className="dr-key">Caída de tensión</span><span className={`dr-val ${r.cumple_caida ? 'ok' : 'fail'}`}>{fmt(r.caida_pct)}% ({fmt(r.caida_v)} V) {r.cumple_caida ? '✓' : '✗'}</span></div>
        <div className="detail-row"><span className="dr-key">Límite caída RIC</span><span className="dr-val">{r.limite_caida_pct}%</span></div>
        <div className="detail-row"><span className="dr-key">Sección tierra (PE)</span><span className="dr-val">{r.sec_tierra_mm2} mm²</span></div>
        <div className="detail-row"><span className="dr-key">Sección neutro</span><span className="dr-val">{r.sec_neutro_mm2} mm²</span></div>
      </div>

      {/* ── REFERENCIAS NORMATIVAS ── */}
      <div className="ric-ref">
        Referencias normativas aplicadas:<br />
        · NCh Elec 4/2003 (RIC) Art. 5.3 — Selección de conductores por capacidad de corriente<br />
        · NCh Elec 4/2003 (RIC) Art. 5.5.4 — Límites de caída de tensión<br />
        · NCh Elec 4/2003 (RIC) Art. 5.4 — Tipos de canalización e instalación<br />
        · Factores de corrección: Tabla 5-3 (temperatura), Tabla 5-4 (agrupamiento)<br />
        · Radio mínimo curvatura: NEC 300.34 / IEC 60364-5-52 — factor según tipo de montaje<br />
        · Corrección por altitud: IEC 60364-5-52 Tabla B.52.15 — aplica sobre 1000 msnm<br />
        · Sección mínima: RIC NCh Elec 4/2003 Art. 5.3.1 — según tipo de circuito<br />
        · Estrés térmico: IEC 60949 — S_mín = Icc×√t / K (Cu-THW=115, Cu-XLPE=143, Al-THW=74, Al-XLPE=94)
      </div>
    </div>
  )
}
