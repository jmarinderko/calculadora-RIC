'use client'
import { useState } from 'react'
import type {
  MtatInput, NivelTension, MaterialMtat, AislamientoMtat,
  TipoInstalacionMtat, TipoFallaMtat, MtatResponse,
} from '@/types'

interface Props {
  onSubmit: (input: MtatInput) => void
  loading: boolean
  result: MtatResponse | null
}

// Presets de nivel de tensión
const NIVELES: { value: NivelTension; label: string; vn: number; secMin: number }[] = [
  { value: 'mt_1_7kv',     label: 'MT 1–7 kV',     vn: 6.6,   secMin: 16  },
  { value: 'mt_7_12kv',    label: 'MT 7–12 kV',    vn: 10.0,  secMin: 25  },
  { value: 'mt_12_24kv',   label: 'MT 12–24 kV',   vn: 23.0,  secMin: 35  },
  { value: 'mt_24_36kv',   label: 'MT 24–36 kV',   vn: 33.0,  secMin: 50  },
  { value: 'at_36_72kv',   label: 'AT 36–72 kV',   vn: 66.0,  secMin: 70  },
  { value: 'at_72_145kv',  label: 'AT 72–145 kV',  vn: 110.0, secMin: 120 },
  { value: 'at_145_220kv', label: 'AT 145–220 kV', vn: 220.0, secMin: 150 },
]

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontFamily: "'IBM Plex Mono', monospace",
      fontWeight: 700,
      background: ok ? 'var(--green-bg, #0a2a1a)' : 'var(--red-bg, #2a0a0a)',
      color: ok ? 'var(--green, #4ade80)' : 'var(--red, #f87171)',
      border: `1px solid ${ok ? 'var(--green-bdr, #166534)' : 'var(--red-bdr, #991b1b)'}`,
    }}>
      {ok ? '✓' : '✗'} {label}
    </span>
  )
}

function ResultBlock({ result }: { result: MtatResponse }) {
  const r = result.resultado
  const imp = r.impedancia
  const fac = r.factores

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", marginTop: '24px' }}>

      {/* Header cumplimiento */}
      <div style={{
        display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px',
      }}>
        <Badge ok={r.cumple} label={r.cumple ? 'CUMPLE' : 'NO CUMPLE'} />
        <Badge ok={r.cumple_termico} label="Térmico" />
        <Badge ok={r.cumple_caida} label={`ΔV ${r.caida_pct.toFixed(2)}%`} />
      </div>

      {/* Sección y configuración */}
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 'var(--r)', padding: '14px 16px', marginBottom: '12px',
      }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px',
          fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase',
          letterSpacing: '0.08em', marginBottom: '10px',
        }}>
          Conductor seleccionado
        </div>
        <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text1)', lineHeight: 1 }}>
          {r.seccion_mm2} mm²
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text2)', marginTop: '4px' }}>
          {r.material.toUpperCase()} — {r.aislamiento.toUpperCase()} — {r.nivel_tension}
        </div>
        {r.ajustado_por_minimo && (
          <div style={{ fontSize: '11px', color: 'var(--yellow, #facc15)', marginTop: '4px' }}>
            Ajustado al mínimo normativo ({r.sec_min_nivel_mm2} mm²)
          </div>
        )}
        {r.ajustado_por_caida && (
          <div style={{ fontSize: '11px', color: 'var(--yellow, #facc15)', marginTop: '2px' }}>
            Ajustado por criterio caída de tensión
          </div>
        )}
      </div>

      {/* Corrientes */}
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 'var(--r)', padding: '14px 16px', marginBottom: '12px',
      }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px',
          fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase',
          letterSpacing: '0.08em', marginBottom: '10px',
        }}>
          Corrientes
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <tbody>
            {[
              ['I diseño', `${r.i_diseno_a.toFixed(1)} A`],
              ['I calculada (×Fd)', `${r.i_calc_a.toFixed(1)} A`],
              ['I requerida (tabla)', `${r.i_req_a.toFixed(1)} A`],
              ['I máx. corregida', `${r.i_max_corregida_a.toFixed(1)} A`],
            ].map(([label, val]) => (
              <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '5px 0', color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px' }}>{label}</td>
                <td style={{ padding: '5px 0', textAlign: 'right', fontWeight: 600 }}>{val}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Caída de tensión con impedancia */}
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 'var(--r)', padding: '14px 16px', marginBottom: '12px',
      }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px',
          fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase',
          letterSpacing: '0.08em', marginBottom: '10px',
        }}>
          Caída de tensión — Impedancia compleja
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <tbody>
            {[
              ['ΔV total', `${r.caida_v.toFixed(1)} V (${r.caida_pct.toFixed(2)}%)`],
              ['ΔV resistiva', `${r.caida_r_v.toFixed(1)} V`],
              ['ΔV reactiva', `${r.caida_x_v.toFixed(1)} V`],
              ['Límite', `${r.limite_caida_pct}%`],
              ['R_ac', `${imp.r_ac_ohm_km.toFixed(4)} Ω/km`],
              ['X', `${imp.x_ohm_km.toFixed(4)} Ω/km`],
              ['Z total', `${imp.z_total_ohm.toFixed(4)} Ω (φ=${imp.angulo_grados.toFixed(1)}°)`],
            ].map(([label, val]) => (
              <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '5px 0', color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px' }}>{label}</td>
                <td style={{ padding: '5px 0', textAlign: 'right', fontWeight: 600 }}>{val}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Factores de corrección */}
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 'var(--r)', padding: '14px 16px', marginBottom: '12px',
      }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px',
          fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase',
          letterSpacing: '0.08em', marginBottom: '10px',
        }}>
          Factores de corrección (IEC 60502-2)
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <tbody>
            {[
              ['Ft — Temperatura', fac.ft.toFixed(3)],
              ['Fg — Agrupamiento', fac.fg.toFixed(3)],
              ['Fp — Profundidad', fac.fp.toFixed(3)],
              ['Fr — Resistividad suelo', fac.fr.toFixed(3)],
              ['Factor total', fac.factor_total.toFixed(3)],
            ].map(([label, val]) => (
              <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '5px 0', color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px' }}>{label}</td>
                <td style={{ padding: '5px 0', textAlign: 'right', fontWeight: 600 }}>{val}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pérdidas */}
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 'var(--r)', padding: '14px 16px', marginBottom: '12px',
      }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px',
          fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase',
          letterSpacing: '0.08em', marginBottom: '10px',
        }}>
          Pérdidas Joule
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <tbody>
            {[
              ['Pérdidas', `${r.perdidas_kw.toFixed(2)} kW`],
              ['% de la potencia', `${r.perdidas_pct.toFixed(2)}%`],
              ['Tierra mínima', `${r.sec_tierra_mm2} mm² (IEC 60364-5-54)`],
            ].map(([label, val]) => (
              <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '5px 0', color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px' }}>{label}</td>
                <td style={{ padding: '5px 0', textAlign: 'right', fontWeight: 600 }}>{val}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Estrés térmico */}
      {r.estres_termico && (
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 'var(--r)', padding: '14px 16px', marginBottom: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px',
              fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              Estrés térmico (IEC 60949)
            </div>
            <Badge ok={r.estres_termico.cumple} label={r.estres_termico.cumple ? 'CUMPLE' : 'NO CUMPLE'} />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <tbody>
              {[
                ['Icc efectiva', `${r.estres_termico.icc_efectiva_ka.toFixed(3)} kA`],
                ['K constante', `${r.estres_termico.k_const} (${r.estres_termico.aislamiento})`],
                ['S mínima térmica', `${r.estres_termico.sec_min_termica_mm2} mm²`],
                ['Icc máx. soportada', `${r.estres_termico.icc_max_soportada_ka.toFixed(3)} kA`],
                ['I²t', `${r.estres_termico.i2t_ja.toExponential(2)} J/A`],
                ['I²t máx.', `${r.estres_termico.i2t_max_ja.toExponential(2)} J/A`],
                ['T° final est.', `${r.estres_termico.t_final_estimada_c.toFixed(1)} °C / máx. ${r.estres_termico.t_max_cc_c} °C`],
              ].map(([label, val]) => (
                <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '5px 0', color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px' }}>{label}</td>
                  <td style={{ padding: '5px 0', textAlign: 'right', fontWeight: 600 }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Advertencias */}
      {r.advertencias.length > 0 && (
        <div style={{
          background: 'var(--yellow-bg, #1a1a00)', border: '1px solid var(--yellow-bdr, #713f12)',
          borderRadius: 'var(--r)', padding: '12px 14px',
        }}>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px',
            fontWeight: 700, color: 'var(--yellow, #facc15)', marginBottom: '8px',
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            Advertencias
          </div>
          <ul style={{ margin: 0, paddingLeft: '16px' }}>
            {r.advertencias.map((w, i) => (
              <li key={i} style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '4px' }}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function MTATCalculatorForm({ onSubmit, loading, result }: Props) {
  // Nivel de tensión
  const [nivel, setNivel] = useState<NivelTension>('mt_12_24kv')
  const [tensionKv, setTensionKv] = useState<string>('23')
  // Modo de entrada
  const [modoEntrada, setModoEntrada] = useState<'potencia' | 'corriente'>('potencia')
  const [potencia, setPotencia] = useState<string>('')
  const [corriente, setCorriente] = useState<string>('')
  const [fp, setFp] = useState<string>('0.90')
  const [fd, setFd] = useState<string>('1.00')
  const [longitud, setLongitud] = useState<string>('')
  // Conductor
  const [material, setMaterial] = useState<MaterialMtat>('cu')
  const [aislamiento, setAislamiento] = useState<AislamientoMtat>('xlpe')
  const [tipoInst, setTipoInst] = useState<TipoInstalacionMtat>('enterrado_directo')
  // Condiciones ambientales
  const [tempAmb, setTempAmb] = useState<string>('25')
  const [agrupamiento, setAgrupamiento] = useState<string>('1')
  const [profundidad, setProfundidad] = useState<string>('0.8')
  const [resistividad, setResistividad] = useState<string>('1.0')
  // Límite caída
  const [limCaida, setLimCaida] = useState<string>('2')
  // Cortocircuito
  const [icc, setIcc] = useState<string>('')
  const [tcc, setTcc] = useState<string>('')
  const [tipoFalla, setTipoFalla] = useState<TipoFallaMtat>('3f')

  const esEnterrado = tipoInst === 'enterrado_directo' || tipoInst === 'enterrado_ducto' || tipoInst === 'ducto_subterraneo'

  function onNivelChange(val: NivelTension) {
    setNivel(val)
    const preset = NIVELES.find(n => n.value === val)
    if (preset) setTensionKv(String(preset.vn))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const input: MtatInput = {
      nivel_tension: nivel,
      tension_kv: parseFloat(tensionKv),
      potencia_kw: modoEntrada === 'potencia' && potencia ? parseFloat(potencia) : undefined,
      corriente_a: modoEntrada === 'corriente' && corriente ? parseFloat(corriente) : undefined,
      factor_potencia: parseFloat(fp),
      factor_demanda: parseFloat(fd),
      longitud_km: parseFloat(longitud),
      material,
      aislamiento,
      tipo_instalacion: tipoInst,
      temp_ambiente_c: parseInt(tempAmb),
      circuitos_agrupados: parseInt(agrupamiento),
      profundidad_m: parseFloat(profundidad),
      resistividad_suelo: parseFloat(resistividad),
      limite_caida_pct: parseFloat(limCaida),
      icc_ka: icc ? parseFloat(icc) : undefined,
      tiempo_cc_s: tcc ? parseFloat(tcc) : undefined,
      tipo_falla: tipoFalla,
    }
    onSubmit(input)
  }

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* ── Formulario (col. izquierda) ── */}
      <form onSubmit={handleSubmit}>

        <div className="panel-title">Nivel de tensión</div>

        <div className="form-group">
          <label className="form-label">Sistema MT/AT</label>
          <div className="select-wrap">
            <select className="form-select" value={nivel}
              onChange={e => onNivelChange(e.target.value as NivelTension)}>
              {NIVELES.map(n => (
                <option key={n.value} value={n.value}>
                  {n.label} — Vn {n.vn} kV · mín. {n.secMin} mm²
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Tensión nominal <span className="unit">kV</span></label>
          <input type="number" className="form-input"
            step="0.1" min="1" max="220" required
            value={tensionKv} onChange={e => setTensionKv(e.target.value)} />
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '18px 0' }} />
        <div className="panel-title">Parámetros eléctricos</div>

        {/* Modo: potencia o corriente */}
        <div className="form-group">
          <label className="form-label">Modo de entrada</label>
          <div className="seg-control seg-control-2">
            {(['potencia', 'corriente'] as const).map(m => (
              <button key={m} type="button"
                className={`seg-btn${modoEntrada === m ? ' active' : ''}`}
                onClick={() => setModoEntrada(m)}>
                {m === 'potencia' ? 'Por potencia (kW)' : 'Por corriente (A)'}
              </button>
            ))}
          </div>
        </div>

        {modoEntrada === 'potencia' ? (
          <div className="form-group">
            <label className="form-label">Potencia activa <span className="unit">kW</span></label>
            <input type="number" className="form-input" placeholder="Ej: 5000"
              step="0.1" min="0.1" required value={potencia} onChange={e => setPotencia(e.target.value)} />
          </div>
        ) : (
          <div className="form-group">
            <label className="form-label">Corriente de diseño <span className="unit">A</span></label>
            <input type="number" className="form-input" placeholder="Ej: 200"
              step="0.1" min="0.1" required value={corriente} onChange={e => setCorriente(e.target.value)} />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Factor de potencia (cos φ)</label>
          <input type="number" className="form-input"
            step="0.01" min="0.5" max="1" value={fp} onChange={e => setFp(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Factor de demanda <span className="unit">Fd</span></label>
          <input type="number" className="form-input"
            step="0.01" min="1" max="2" value={fd} onChange={e => setFd(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Longitud del circuito <span className="unit">km</span></label>
          <input type="number" className="form-input" placeholder="Ej: 2.5"
            step="0.01" min="0.01" required value={longitud} onChange={e => setLongitud(e.target.value)} />
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '18px 0' }} />
        <div className="panel-title">Conductor y aislamiento</div>

        <div className="form-group">
          <label className="form-label">Material</label>
          <div className="seg-control seg-control-2">
            {(['cu', 'al'] as MaterialMtat[]).map(m => (
              <button key={m} type="button"
                className={`seg-btn${material === m ? ' active' : ''}`}
                onClick={() => setMaterial(m)}>
                {m === 'cu' ? 'Cu — Cobre' : 'Al — Aluminio'}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Aislamiento</label>
          <div className="seg-control seg-control-2">
            {(['xlpe', 'epr'] as AislamientoMtat[]).map(a => (
              <button key={a} type="button"
                className={`seg-btn${aislamiento === a ? ' active' : ''}`}
                onClick={() => setAislamiento(a)}>
                {a === 'xlpe' ? 'XLPE — 90°C/250°C' : 'EPR — 90°C/250°C'}
              </button>
            ))}
          </div>
        </div>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
          color: 'var(--text3)', marginTop: '-6px', marginBottom: '12px',
        }}>
          XLPE/EPR: K=143 (Cu) · K=94 (Al) — IEC 60949 · T_op=90°C · T_cc=250°C
        </div>

        <div className="form-group">
          <label className="form-label">Tipo de instalación</label>
          <div className="select-wrap">
            <select className="form-select" value={tipoInst}
              onChange={e => setTipoInst(e.target.value as TipoInstalacionMtat)}>
              <option value="aereo_trifol">Aéreo en trébol — IEC 60502-2 Tabla B.1</option>
              <option value="aereo_plano">Aéreo en plano — IEC 60502-2 Tabla B.2</option>
              <option value="enterrado_directo">Enterrado directo (sin ducto)</option>
              <option value="enterrado_ducto">Enterrado en ducto PVC/PE</option>
              <option value="ducto_subterraneo">Ducto subterráneo / galería</option>
            </select>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '18px 0' }} />
        <div className="panel-title">Condiciones ambientales</div>

        <div className="form-group">
          <label className="form-label">
            Temperatura {esEnterrado ? 'del suelo' : 'ambiente'} <span className="unit">°C</span>
          </label>
          <div className="select-wrap">
            <select className="form-select" value={tempAmb}
              onChange={e => setTempAmb(e.target.value)}>
              {esEnterrado
                ? [10, 15, 20, 25, 30, 35, 40].map(t => (
                  <option key={t} value={t}>{t}°C{t === 20 ? ' — Referencia IEC' : ''}</option>
                ))
                : [10, 15, 20, 25, 30, 35, 40, 45, 50].map(t => (
                  <option key={t} value={t}>{t}°C{t === 25 ? ' — Referencia IEC' : ''}</option>
                ))
              }
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Circuitos agrupados en la misma zanja</label>
          <div className="select-wrap">
            <select className="form-select" value={agrupamiento}
              onChange={e => setAgrupamiento(e.target.value)}>
              <option value="1">1 circuito (sin reducción)</option>
              <option value="2">2 circuitos — factor 0.88</option>
              <option value="3">3 circuitos — factor 0.80</option>
              <option value="4">4 circuitos — factor 0.75</option>
              <option value="6">5–6 circuitos — factor 0.68</option>
              <option value="8">7–8 circuitos — factor 0.63</option>
              <option value="10">9–10 circuitos — factor 0.58</option>
            </select>
          </div>
        </div>

        {esEnterrado && (
          <>
            <div className="form-group">
              <label className="form-label">Profundidad de enterrado <span className="unit">m</span></label>
              <div className="select-wrap">
                <select className="form-select" value={profundidad}
                  onChange={e => setProfundidad(e.target.value)}>
                  <option value="0.5">0.5 m</option>
                  <option value="0.8">0.8 m — Referencia IEC</option>
                  <option value="1.0">1.0 m</option>
                  <option value="1.2">1.2 m</option>
                  <option value="1.5">1.5 m</option>
                  <option value="2.0">2.0 m</option>
                  <option value="2.5">2.5 m</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Resistividad térmica del suelo <span className="unit">K·m/W</span></label>
              <div className="select-wrap">
                <select className="form-select" value={resistividad}
                  onChange={e => setResistividad(e.target.value)}>
                  <option value="0.5">0.5 — Suelo húmedo / muy conductivo</option>
                  <option value="0.7">0.7 — Arena húmeda</option>
                  <option value="1.0">1.0 — Referencia IEC / suelo normal</option>
                  <option value="1.5">1.5 — Suelo seco / arcilla</option>
                  <option value="2.0">2.0 — Suelo árido</option>
                  <option value="2.5">2.5 — Arena muy seca</option>
                  <option value="3.0">3.0 — Roca porosa</option>
                </select>
              </div>
            </div>
          </>
        )}

        <div className="form-group">
          <label className="form-label">Límite caída de tensión <span className="unit">%</span></label>
          <div className="select-wrap">
            <select className="form-select" value={limCaida}
              onChange={e => setLimCaida(e.target.value)}>
              <option value="1">1% — Alta calidad</option>
              <option value="2">2% — Estándar MT/AT</option>
              <option value="3">3% — Redes de distribución</option>
              <option value="5">5% — Acometidas largas</option>
            </select>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '18px 0' }} />
        <div className="panel-title">Cortocircuito y estrés térmico (IEC 60949)</div>

        <div className="form-group">
          <label className="form-label">Corriente de cortocircuito (Icc) <span className="unit">kA</span></label>
          <input type="number" className="form-input" placeholder="Ej: 16 (dejar vacío para omitir)"
            step="0.1" min="0.1" value={icc} onChange={e => setIcc(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Tiempo de despeje <span className="unit">s</span></label>
          <input type="number" className="form-input" placeholder="Ej: 0.5"
            step="0.01" min="0.01" max="5" value={tcc} onChange={e => setTcc(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Tipo de falla</label>
          <div className="select-wrap">
            <select className="form-select" value={tipoFalla}
              onChange={e => setTipoFalla(e.target.value as TipoFallaMtat)}>
              <option value="3f">Trifásico (3F) — máxima severidad</option>
              <option value="2f">Bifásico (2F) — factor 0.87</option>
              <option value="2ft">Bifásico a tierra (2FT) — factor 1.00</option>
              <option value="1ft">Monofásico a tierra (1FT) — factor 0.58</option>
            </select>
          </div>
        </div>

        <button type="submit" className="btn-calc" disabled={loading}
          style={{ marginTop: '8px' }}>
          {loading ? 'Calculando…' : '⚡ Calcular conductor MT/AT'}
        </button>
      </form>

      {/* ── Resultados inline (debajo del form en layout 1-col) ── */}
      {result && <ResultBlock result={result} />}
    </div>
  )
}
