'use client'
import { useState } from 'react'
import type {
  ERNCStringDCInput,
  ERNCAcInversorInput,
  ERNCGdRedBtInput,
  ERNCBateriasDCInput,
  ERNCTopologia,
} from '@/types'

type ERNCInput = ERNCStringDCInput | ERNCAcInversorInput | ERNCGdRedBtInput | ERNCBateriasDCInput

interface Props {
  onSubmit: (topologia: ERNCTopologia, datos: ERNCInput) => void
  loading: boolean
}

// ── Constantes UI ─────────────────────────────────────────────────────────────

const TOPOLOGIAS: { value: ERNCTopologia; label: string; desc: string }[] = [
  { value: 'string_dc',   label: 'String DC',       desc: 'Strings fotovoltaicos — cable ZZ-F, Voc/Isc panel' },
  { value: 'ac_inversor', label: 'AC Inversor',      desc: 'Salida AC inversor → tablero BT' },
  { value: 'gd_red_bt',   label: 'GD Red BT',        desc: 'Inyección a red BT — NTCO SEC Chile' },
  { value: 'baterias_dc', label: 'Baterías DC',      desc: 'Enlace DC banco de baterías estacionarias' },
]

const TENSIONES_DC = [48, 96, 120, 240, 360, 480, 600, 800, 1000, 1500]
const TENSIONES_AC = [220, 380, 400]

// ── Estilos inline reutilizados ───────────────────────────────────────────────
const badgeStyle = (ok: boolean): React.CSSProperties => ({
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '11px',
  fontFamily: "'IBM Plex Mono', monospace",
  fontWeight: 700,
  background: ok ? 'var(--green-bg, #0d2b1d)' : 'var(--red-bg, #2b0d0d)',
  color: ok ? 'var(--green, #4ade80)' : 'var(--red, #f87171)',
  border: `1px solid ${ok ? 'var(--green-bdr, #166534)' : 'var(--red-bdr, #991b1b)'}`,
})

export function ERNCCalculatorForm({ onSubmit, loading }: Props) {
  const [topologia, setTopologia] = useState<ERNCTopologia>('string_dc')

  // ── String DC ──────────────────────────────────────────────────────────────
  const [potenciaWp,    setPotenciaWp]    = useState('')
  const [vocStc,        setVocStc]        = useState('')
  const [iscStc,        setIscStc]        = useState('')
  const [tempMinDC,     setTempMinDC]     = useState('-5')
  const [tempMaxDC,     setTempMaxDC]     = useState('40')
  const [longitudDC,    setLongitudDC]    = useState('')
  const [enDuctoDC,     setEnDuctoDC]     = useState(false)
  const [coefVoc,       setCoefVoc]       = useState('-0.29')
  const [noct,          setNoct]          = useState('45')
  const [limCaidaDC,    setLimCaidaDC]    = useState('1.5')
  const [materialDC,    setMaterialDC]    = useState<'cu' | 'al'>('cu')

  // ── AC Inversor ────────────────────────────────────────────────────────────
  const [potenciaKwAC,   setPotenciaKwAC]  = useState('')
  const [tensionAC,      setTensionAC]     = useState('380')
  const [sistemaAC,      setSistemaAC]     = useState<'trifasico'|'monofasico'>('trifasico')
  const [cosPhiAC,       setCosPhiAC]      = useState('1.0')
  const [longitudAC,     setLongitudAC]    = useState('')
  const [materialAC,     setMaterialAC]    = useState<'cu' | 'al'>('cu')
  const [canalizAC,      setCanalizAC]     = useState('ducto_pvc')
  const [tempAC,         setTempAC]        = useState('30')
  const [agrupAC,        setAgrupAC]       = useState('1')
  const [msnmAC,         setMsnmAC]        = useState('0')
  const [limCaidaAC,     setLimCaidaAC]    = useState('1.5')

  // ── GD Red BT ─────────────────────────────────────────────────────────────
  const [potenciaKwGD,   setPotenciaKwGD]  = useState('')
  const [tensionGD,      setTensionGD]     = useState('380')
  const [sistemaGD,      setSistemaGD]     = useState<'trifasico'|'monofasico'>('trifasico')
  const [cosPhiGD,       setCosPhiGD]      = useState('1.0')
  const [longitudGD,     setLongitudGD]    = useState('')
  const [materialGD,     setMaterialGD]    = useState<'cu' | 'al'>('cu')
  const [canalizGD,      setCanalizGD]     = useState('ducto_pvc')
  const [tempGD,         setTempGD]        = useState('30')
  const [agrupGD,        setAgrupGD]       = useState('1')
  const [msnmGD,         setMsnmGD]        = useState('0')
  const [limCaidaGD,     setLimCaidaGD]    = useState('1.5')
  const [potInstGD,      setPotInstGD]     = useState('')
  const [fasesIntercon,  setFasesIntercon] = useState('3')

  // ── Baterías DC ────────────────────────────────────────────────────────────
  const [potenciaWBat,   setPotenciaWBat]  = useState('')
  const [tensionBat,     setTensionBat]    = useState('48')
  const [longitudBat,    setLongitudBat]   = useState('')
  const [materialBat,    setMaterialBat]   = useState<'cu' | 'al'>('cu')
  const [enDuctoBat,     setEnDuctoBat]    = useState(false)
  const [tempBat,        setTempBat]       = useState('30')
  const [limCaidaBat,    setLimCaidaBat]   = useState('1.0')

  // ── Submit ─────────────────────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (topologia === 'string_dc') {
      const datos: ERNCStringDCInput = {
        potencia_wp:    parseFloat(potenciaWp),
        voc_stc_v:      parseFloat(vocStc),
        isc_stc_a:      parseFloat(iscStc),
        temp_min_c:     parseFloat(tempMinDC),
        temp_max_c:     parseFloat(tempMaxDC),
        longitud_m:     parseFloat(longitudDC),
        material:       materialDC,
        en_ducto:       enDuctoDC,
        noct_c:         parseFloat(noct),
        coef_voc_pct:   parseFloat(coefVoc),
        limite_caida_pct: parseFloat(limCaidaDC),
      }
      onSubmit('string_dc', datos)

    } else if (topologia === 'ac_inversor') {
      const datos: ERNCAcInversorInput = {
        potencia_kw:         parseFloat(potenciaKwAC),
        tension_v:           parseFloat(tensionAC),
        sistema:             sistemaAC,
        cos_phi:             parseFloat(cosPhiAC),
        longitud_m:          parseFloat(longitudAC),
        material:            materialAC,
        tipo_canalizacion:   canalizAC,
        temp_ambiente_c:     parseInt(tempAC),
        circuitos_agrupados: parseInt(agrupAC),
        msnm:                parseFloat(msnmAC),
        limite_caida_pct:    parseFloat(limCaidaAC),
      }
      onSubmit('ac_inversor', datos)

    } else if (topologia === 'gd_red_bt') {
      const datos: ERNCGdRedBtInput = {
        potencia_kw:            parseFloat(potenciaKwGD),
        tension_v:              parseFloat(tensionGD),
        sistema:                sistemaGD,
        cos_phi:                parseFloat(cosPhiGD),
        longitud_m:             parseFloat(longitudGD),
        material:               materialGD,
        tipo_canalizacion:      canalizGD,
        temp_ambiente_c:        parseInt(tempGD),
        circuitos_agrupados:    parseInt(agrupGD),
        msnm:                   parseFloat(msnmGD),
        limite_caida_pct:       parseFloat(limCaidaGD),
        potencia_instalada_kw:  potInstGD ? parseFloat(potInstGD) : undefined,
        numero_fases_interconexion: parseInt(fasesIntercon),
      }
      onSubmit('gd_red_bt', datos)

    } else if (topologia === 'baterias_dc') {
      const datos: ERNCBateriasDCInput = {
        potencia_w:       parseFloat(potenciaWBat),
        tension_banco_v:  parseFloat(tensionBat),
        longitud_m:       parseFloat(longitudBat),
        material:         materialBat,
        en_ducto:         enDuctoBat,
        temp_ambiente_c:  parseInt(tempBat),
        limite_caida_pct: parseFloat(limCaidaBat),
      }
      onSubmit('baterias_dc', datos)
    }
  }

  // ── Render helpers ─────────────────────────────────────────────────────────
  function MaterialToggle({ val, set }: { val: 'cu'|'al', set: (v: 'cu'|'al') => void }) {
    return (
      <div className="seg-control seg-control-2">
        {(['cu','al'] as const).map(m => (
          <button key={m} type="button"
            className={`seg-btn${val === m ? ' active' : ''}`}
            onClick={() => set(m)}
          >
            {m === 'cu' ? 'Cu — Cobre' : 'Al — Aluminio'}
          </button>
        ))}
      </div>
    )
  }

  function CanalSelect({ val, set }: { val: string, set: (v: string) => void }) {
    return (
      <div className="select-wrap">
        <select className="form-select" value={val} onChange={e => set(e.target.value)}>
          <option value="ducto_pvc">Ducto PVC</option>
          <option value="ducto_metalico">Ducto metálico (conduit)</option>
          <option value="bandeja_perforada">Bandeja portacables perforada</option>
          <option value="bandeja_escalera">Bandeja tipo escalera al aire</option>
          <option value="aereo_libre">Cable aéreo al aire libre</option>
        </select>
      </div>
    )
  }

  const infoStyle: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '11px',
    color: 'var(--text3)',
    marginTop: '4px',
    marginBottom: '12px',
    lineHeight: 1.5,
  }

  return (
    <form onSubmit={handleSubmit} style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* ── Selector de topología ── */}
      <div className="panel-title">Topología del sistema ERNC</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
        {TOPOLOGIAS.map(t => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTopologia(t.value)}
            style={{
              textAlign: 'left',
              padding: '10px 14px',
              borderRadius: 'var(--r)',
              border: `1px solid ${topologia === t.value ? 'var(--blue)' : 'var(--border)'}`,
              background: topologia === t.value ? 'var(--blue-bg, rgba(59,130,246,0.1))' : 'var(--bg3, transparent)',
              cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
          >
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '12px',
              fontWeight: 700,
              color: topologia === t.value ? 'var(--blue)' : 'var(--text1)',
            }}>
              {t.label}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>
              {t.desc}
            </div>
          </button>
        ))}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0 20px' }} />

      {/* ════════════════════════════════════════════════════
          TOPOLOGÍA 1: STRING DC
      ════════════════════════════════════════════════════ */}
      {topologia === 'string_dc' && (
        <>
          <div className="panel-title">Parámetros del string FV</div>

          <div className="form-group">
            <label className="form-label">Potencia del string <span className="unit">Wp</span></label>
            <input type="number" className="form-input" placeholder="Ej: 5000"
              step="10" min="10" required value={potenciaWp} onChange={e => setPotenciaWp(e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Voc a STC <span className="unit">V</span></label>
              <div className="select-wrap">
                <select className="form-select" value={vocStc} onChange={e => setVocStc(e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {TENSIONES_DC.map(v => (
                    <option key={v} value={v}>{v} V</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Isc a STC <span className="unit">A</span></label>
              <input type="number" className="form-input" placeholder="Ej: 10.5"
                step="0.1" min="0.1" required value={iscStc} onChange={e => setIscStc(e.target.value)} />
            </div>
          </div>
          <div style={infoStyle}>
            Voc y Isc del string completo (no del panel individual).
            I_diseño = 1.25 × Isc (IEC 62548 §8.3).
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">T° mínima sitio <span className="unit">°C</span></label>
              <input type="number" className="form-input" placeholder="-5"
                step="1" required value={tempMinDC} onChange={e => setTempMinDC(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">T° máxima sitio <span className="unit">°C</span></label>
              <input type="number" className="form-input" placeholder="40"
                step="1" required value={tempMaxDC} onChange={e => setTempMaxDC(e.target.value)} />
            </div>
          </div>
          <div style={infoStyle}>
            T° mínima → Voc máxima (riesgo sobretensión). T° máxima → menor Voc (riesgo sub-MPPT) y mayor R cable.
            Desierto de Atacama: usar −10°C / 45°C.
          </div>

          <div className="form-group">
            <label className="form-label">Longitud de cable (ida simple) <span className="unit">m</span></label>
            <input type="number" className="form-input" placeholder="Ej: 25"
              step="1" min="1" required value={longitudDC} onChange={e => setLongitudDC(e.target.value)} />
          </div>
          <div style={infoStyle}>El cálculo aplica factor ×2 (ida + vuelta) para ΔV.</div>

          <div className="form-group">
            <label className="form-label">Material conductor</label>
            <MaterialToggle val={materialDC} set={setMaterialDC} />
          </div>
          {materialDC === 'al' && (
            <div className="nota-warn" style={{ marginTop: '-8px', marginBottom: '12px' }}>
              Se recomienda cobre para strings DC fotovoltaicos.
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Instalación del cable</label>
            <div className="seg-control seg-control-2">
              <button type="button"
                className={`seg-btn${!enDuctoDC ? ' active' : ''}`}
                onClick={() => setEnDuctoDC(false)}>
                Al aire libre
              </button>
              <button type="button"
                className={`seg-btn${enDuctoDC ? ' active' : ''}`}
                onClick={() => setEnDuctoDC(true)}>
                En ducto/conduit
              </button>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '18px 0' }} />
          <div className="panel-title">Parámetros de módulo FV</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">NOCT <span className="unit">°C</span></label>
              <input type="number" className="form-input" placeholder="45"
                step="0.5" min="30" max="60" value={noct} onChange={e => setNoct(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Coef. Voc <span className="unit">%/°C</span></label>
              <input type="number" className="form-input" placeholder="-0.29"
                step="0.01" min="-0.6" max="-0.1" value={coefVoc} onChange={e => setCoefVoc(e.target.value)} />
            </div>
          </div>
          <div style={infoStyle}>
            NOCT típico: 45°C. Coef. Voc típico Si cristalino: −0.29 %/°C (rango −0.25 a −0.45).
          </div>

          <div className="form-group">
            <label className="form-label">Límite caída de tensión <span className="unit">%</span></label>
            <div className="select-wrap">
              <select className="form-select" value={limCaidaDC} onChange={e => setLimCaidaDC(e.target.value)}>
                <option value="1.0">1.0% — Muy estricto</option>
                <option value="1.5">1.5% — IEC 60364-7-712 (recomendado)</option>
                <option value="2.0">2.0% — Permisivo</option>
              </select>
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════
          TOPOLOGÍA 2: AC INVERSOR
      ════════════════════════════════════════════════════ */}
      {topologia === 'ac_inversor' && (
        <>
          <div className="panel-title">Parámetros del inversor (lado AC)</div>

          <div className="form-group">
            <label className="form-label">Potencia nominal inversor <span className="unit">kW</span></label>
            <input type="number" className="form-input" placeholder="Ej: 10"
              step="0.1" min="0.1" required value={potenciaKwAC} onChange={e => setPotenciaKwAC(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Sistema eléctrico AC</label>
            <div className="seg-control seg-control-2">
              {(['trifasico','monofasico'] as const).map(s => (
                <button key={s} type="button"
                  className={`seg-btn${sistemaAC === s ? ' active' : ''}`}
                  onClick={() => {
                    setSistemaAC(s)
                    setTensionAC(s === 'trifasico' ? '380' : '220')
                  }}>
                  {s === 'trifasico' ? 'Trifásico' : 'Monofásico'}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Tensión AC <span className="unit">V</span></label>
            <div className="select-wrap">
              <select className="form-select" value={tensionAC} onChange={e => setTensionAC(e.target.value)}>
                {TENSIONES_AC.map(v => (
                  <option key={v} value={v}>{v} V</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Factor de potencia del inversor (cos φ)</label>
            <input type="number" className="form-input" placeholder="1.0"
              step="0.01" min="0.8" max="1" value={cosPhiAC} onChange={e => setCosPhiAC(e.target.value)} />
          </div>
          <div style={infoStyle}>Inversores modernos: 1.0 PF. Algunos requieren 0.9 cap. para regulación VAR.</div>

          <div className="form-group">
            <label className="form-label">Longitud del tramo AC <span className="unit">m</span></label>
            <input type="number" className="form-input" placeholder="Ej: 15"
              step="1" min="1" required value={longitudAC} onChange={e => setLongitudAC(e.target.value)} />
          </div>
          <div style={infoStyle}>Longitud unidireccional (no se aplica ×2, lógica AC estándar).</div>

          <div className="form-group">
            <label className="form-label">Material conductor</label>
            <MaterialToggle val={materialAC} set={setMaterialAC} />
          </div>

          <div className="form-group">
            <label className="form-label">Tipo de canalización</label>
            <CanalSelect val={canalizAC} set={setCanalizAC} />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '18px 0' }} />
          <div className="panel-title">Condiciones de instalación AC</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">T° ambiente <span className="unit">°C</span></label>
              <div className="select-wrap">
                <select className="form-select" value={tempAC} onChange={e => setTempAC(e.target.value)}>
                  {[25,30,35,40,45,50].map(t => (
                    <option key={t} value={t}>{t}°C{t===30?' — RIC ref.':''}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Altitud <span className="unit">msnm</span></label>
              <input type="number" className="form-input" placeholder="0"
                value={msnmAC} onChange={e => setMsnmAC(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Circuitos agrupados</label>
            <div className="select-wrap">
              <select className="form-select" value={agrupAC} onChange={e => setAgrupAC(e.target.value)}>
                <option value="1">1 circuito (sin reducción)</option>
                <option value="2">2 circuitos — factor 0.80</option>
                <option value="3">3 circuitos — factor 0.70</option>
                <option value="4">4 circuitos — factor 0.65</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Límite caída de tensión <span className="unit">%</span></label>
            <div className="select-wrap">
              <select className="form-select" value={limCaidaAC} onChange={e => setLimCaidaAC(e.target.value)}>
                <option value="1.0">1.0% — Muy estricto</option>
                <option value="1.5">1.5% — NTCO SEC / buena práctica (recomendado)</option>
                <option value="2.0">2.0% — NCh Elec 4 alumbrado</option>
                <option value="3.0">3.0% — NCh Elec 4 fuerza</option>
              </select>
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════
          TOPOLOGÍA 3: GD RED BT
      ════════════════════════════════════════════════════ */}
      {topologia === 'gd_red_bt' && (
        <>
          <div className="panel-title">Generación Distribuida — NTCO SEC</div>
          <div style={infoStyle}>
            Normativa: NTCO SEC (2020) — Inyección a red BT ≤ 300 kW.
            Requiere protección anti-islanding y interruptor de interconexión.
          </div>

          <div className="form-group">
            <label className="form-label">Potencia a inyectar <span className="unit">kW</span></label>
            <input type="number" className="form-input" placeholder="Ej: 50"
              step="0.5" min="0.1" required value={potenciaKwGD} onChange={e => setPotenciaKwGD(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Potencia instalada total (opcional) <span className="unit">kW</span></label>
            <input type="number" className="form-input" placeholder="Si difiere de la potencia inyectada"
              step="0.5" min="0" value={potInstGD} onChange={e => setPotInstGD(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Sistema de interconexión</label>
            <div className="seg-control seg-control-2">
              {(['trifasico','monofasico'] as const).map(s => (
                <button key={s} type="button"
                  className={`seg-btn${sistemaGD === s ? ' active' : ''}`}
                  onClick={() => {
                    setSistemaGD(s)
                    setTensionGD(s === 'trifasico' ? '380' : '220')
                    setFasesIntercon(s === 'trifasico' ? '3' : '1')
                  }}>
                  {s === 'trifasico' ? 'Trifásico' : 'Monofásico'}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Tensión de interconexión <span className="unit">V</span></label>
            <div className="select-wrap">
              <select className="form-select" value={tensionGD} onChange={e => setTensionGD(e.target.value)}>
                {TENSIONES_AC.map(v => (<option key={v} value={v}>{v} V</option>))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Factor de potencia (cos φ)</label>
            <input type="number" className="form-input" placeholder="1.0"
              step="0.01" min="0.8" max="1" value={cosPhiGD} onChange={e => setCosPhiGD(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Longitud tramo GD → red <span className="unit">m</span></label>
            <input type="number" className="form-input" placeholder="Ej: 30"
              step="1" min="1" required value={longitudGD} onChange={e => setLongitudGD(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Material conductor</label>
            <MaterialToggle val={materialGD} set={setMaterialGD} />
          </div>

          <div className="form-group">
            <label className="form-label">Canalización</label>
            <CanalSelect val={canalizGD} set={setCanalizGD} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">T° ambiente <span className="unit">°C</span></label>
              <div className="select-wrap">
                <select className="form-select" value={tempGD} onChange={e => setTempGD(e.target.value)}>
                  {[25,30,35,40,45,50].map(t => (<option key={t} value={t}>{t}°C</option>))}
                </select>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Altitud <span className="unit">msnm</span></label>
              <input type="number" className="form-input" value={msnmGD} onChange={e => setMsnmGD(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Límite caída de tensión <span className="unit">%</span></label>
            <div className="select-wrap">
              <select className="form-select" value={limCaidaGD} onChange={e => setLimCaidaGD(e.target.value)}>
                <option value="1.5">1.5% — NTCO SEC (recomendado)</option>
                <option value="2.0">2.0%</option>
                <option value="3.0">3.0%</option>
              </select>
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════
          TOPOLOGÍA 4: BATERÍAS DC
      ════════════════════════════════════════════════════ */}
      {topologia === 'baterias_dc' && (
        <>
          <div className="panel-title">Sistema de baterías DC</div>

          <div className="form-group">
            <label className="form-label">Potencia máxima carga/descarga <span className="unit">W</span></label>
            <input type="number" className="form-input" placeholder="Ej: 5000"
              step="100" min="10" required value={potenciaWBat} onChange={e => setPotenciaWBat(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Tensión nominal del banco <span className="unit">V DC</span></label>
            <div className="select-wrap">
              <select className="form-select" value={tensionBat} onChange={e => setTensionBat(e.target.value)}>
                {[24, 48, 51.2, 96, 120, 240, 360, 480].map(v => (
                  <option key={v} value={v}>{v} V DC</option>
                ))}
              </select>
            </div>
          </div>
          <div style={infoStyle}>
            LiFePO4 48V (16S) = 51.2 V nom. VRLA 48V = 48 V nom.
            I_diseño = (P/V) × 1.25 (margen pico de corriente).
          </div>

          <div className="form-group">
            <label className="form-label">Longitud del cable (ida simple) <span className="unit">m</span></label>
            <input type="number" className="form-input" placeholder="Ej: 5"
              step="0.5" min="0.5" required value={longitudBat} onChange={e => setLongitudBat(e.target.value)} />
          </div>
          <div style={infoStyle}>El cálculo aplica factor ×2 (ida + vuelta) para ΔV.</div>

          <div className="form-group">
            <label className="form-label">Material conductor</label>
            <MaterialToggle val={materialBat} set={setMaterialBat} />
          </div>

          <div className="form-group">
            <label className="form-label">Instalación del cable</label>
            <div className="seg-control seg-control-2">
              <button type="button"
                className={`seg-btn${!enDuctoBat ? ' active' : ''}`}
                onClick={() => setEnDuctoBat(false)}>
                Al aire libre
              </button>
              <button type="button"
                className={`seg-btn${enDuctoBat ? ' active' : ''}`}
                onClick={() => setEnDuctoBat(true)}>
                En ducto
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">T° ambiente sala de baterías <span className="unit">°C</span></label>
            <div className="select-wrap">
              <select className="form-select" value={tempBat} onChange={e => setTempBat(e.target.value)}>
                {[20,25,30,35,40].map(t => (<option key={t} value={t}>{t}°C</option>))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Límite caída de tensión <span className="unit">%</span></label>
            <div className="select-wrap">
              <select className="form-select" value={limCaidaBat} onChange={e => setLimCaidaBat(e.target.value)}>
                <option value="0.5">0.5% — Ultra estricto</option>
                <option value="1.0">1.0% — Recomendado baterías</option>
                <option value="1.5">1.5% — Permisivo</option>
              </select>
            </div>
          </div>
          <div style={infoStyle}>
            Límite 1% protege BMS y maximiza eficiencia de ciclos de carga/descarga.
          </div>
        </>
      )}

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />

      <button type="submit" className="btn-calc" disabled={loading}>
        {loading ? 'Calculando…' : '☀ Calcular conductor ERNC'}
      </button>
    </form>
  )
}
