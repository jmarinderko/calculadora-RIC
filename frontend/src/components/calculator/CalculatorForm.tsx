'use client'
import { useState, useEffect } from 'react'
import type { CalculatorInput } from '@/types'

interface Props {
  onSubmit: (input: CalculatorInput) => void
  loading: boolean
}

// Factores de corrección (idénticos al HTML)
const FACTORES_TEMP: Record<number, number> = { 25: 1.05, 30: 1.00, 35: 0.94, 40: 0.87, 45: 0.79, 50: 0.71 }
const FACTORES_AGRUP: Record<number, number> = { 1: 1.00, 2: 0.80, 3: 0.70, 4: 0.65, 6: 0.57, 9: 0.50 }

function calcFa(msnm: number): number {
  if (msnm <= 1000) return 1.00
  if (msnm <= 2000) return 0.98
  if (msnm <= 3000) return 0.96
  if (msnm <= 4000) return 0.93
  if (msnm <= 5000) return 0.90
  return 0.86
}

// Tipo de carga → fp, fd, caida sugerida
const TIPO_CARGA_PRESET: Record<string, { fp: number; fd: number; caida: number; label: string }> = {
  motor:       { fp: 0.85, fd: 1.25, caida: 3, label: 'Motor eléctrico' },
  iluminacion: { fp: 0.90, fd: 1.00, caida: 2, label: 'Iluminación' },
  electronico: { fp: 0.75, fd: 1.00, caida: 2, label: 'Equipo electrónico / TI' },
  resistivo:   { fp: 1.00, fd: 1.00, caida: 3, label: 'Carga resistiva (calefacción)' },
  alimentador: { fp: 0.85, fd: 1.25, caida: 3, label: 'Alimentador general / tablero' },
}

const TIPO_CIRCUITO_INFO: Record<string, { secmin: number; caida: number; fd: number; label: string }> = {
  alumbrado:      { secmin: 1.5, caida: 2, fd: 1.00, label: 'Circuito de alumbrado — mín. 1.5 mm²' },
  fuerza:         { secmin: 2.5, caida: 3, fd: 1.00, label: 'Circuito de fuerza — mín. 2.5 mm²' },
  tomacorrientes: { secmin: 2.5, caida: 3, fd: 1.00, label: 'Circuito de tomacorrientes — mín. 2.5 mm²' },
  motor:          { secmin: 2.5, caida: 3, fd: 1.25, label: 'Circuito de motor — mín. 2.5 mm² · Fd 1.25' },
  alimentador:    { secmin: 4.0, caida: 3, fd: 1.25, label: 'Alimentador general — mín. 4.0 mm²' },
}

type Sistema   = 'trifasico' | 'bifasico' | 'monofasico'
type Material  = 'cu' | 'al'
type Montaje   = 'vista' | 'banco' | 'oculto'

export function CalculatorForm({ onSubmit, loading }: Props) {
  // Sistema eléctrico
  const [sistema,   setSistema]   = useState<Sistema>('trifasico')
  // Tensión
  const [tension,   setTension]   = useState<string>('380')
  const [tensionCustom, setTensionCustom] = useState<string>('')
  // Parámetros eléctricos
  const [potencia,  setPotencia]  = useState<string>('')
  const [fp,        setFp]        = useState<string>('0.85')
  const [longitud,  setLongitud]  = useState<string>('')
  // Instalación
  const [tipoCanalizacion, setTipoCanalizacion] = useState('ducto_pvc')
  const [tempAmbiente, setTempAmbiente] = useState<number>(30)
  const [msnm,      setMsnm]      = useState<string>('0')
  const [agrupamiento, setAgrupamiento] = useState<number>(1)
  const [material,  setMaterial]  = useState<Material>('cu')
  // Opciones avanzadas
  const [limCaida,  setLimCaida]  = useState<string>('3')
  const [cablesFase, setCablesFase] = useState<string>('auto')
  // Tipo circuito / carga
  const [tipoCircuito, setTipoCircuito] = useState('fuerza')
  const [tipoCarga,    setTipoCarga]    = useState('motor')
  const [fd,           setFd]           = useState<string>('1.25')
  const [montaje,      setMontaje]      = useState<Montaje>('vista')
  // Estrés térmico
  const [icc,       setIcc]       = useState<string>('')
  const [tcc,       setTcc]       = useState<string>('')
  const [tipoFalla, setTipoFalla] = useState('3f')
  const [tInicial,  setTInicial]  = useState<string>('75')
  const [tMax,      setTMax]      = useState<string>('160')

  // Factor total display
  const ft = FACTORES_TEMP[tempAmbiente] ?? 1.00
  const fg = FACTORES_AGRUP[agrupamiento] ?? 1.00
  const fa = calcFa(parseFloat(msnm) || 0)
  const factorTotal = (ft * fg * fa).toFixed(3)

  // Nota altitud
  const msnmVal = parseFloat(msnm) || 0
  const showNotaMsnm = msnmVal > 1000
  const notaMsnm = showNotaMsnm
    ? `Altitud ${msnmVal} msnm: factor Fa = ${fa} — capacidad de corriente reducida ${((1-fa)*100).toFixed(0)}% (IEC 60364-5-52)`
    : ''

  // Nota circuito
  const circInfo = TIPO_CIRCUITO_INFO[tipoCircuito]
  const notaCircuito = circInfo
    ? `Sección mínima: ${circInfo.secmin} mm² · Caída máx: ${circInfo.caida}% · Fd recomendado: ${circInfo.fd}`
    : ''

  // Cuando cambia tipo de carga → actualiza fp, fd, limCaida
  function onTipoCargaChange(val: string) {
    setTipoCarga(val)
    const preset = TIPO_CARGA_PRESET[val]
    if (preset) {
      setFp(String(preset.fp))
      setFd(String(preset.fd))
      setLimCaida(String(preset.caida))
    }
  }

  // Cuando cambia tipo circuito → actualiza limCaida, fd
  function onTipoCircuitoChange(val: string) {
    setTipoCircuito(val)
    const info = TIPO_CIRCUITO_INFO[val]
    if (info) {
      setLimCaida(String(info.caida))
      setFd(String(info.fd))
    }
  }

  // Cuando cambia sistema → sugerir tensión
  function onSistemaChange(val: Sistema) {
    setSistema(val)
    if (val === 'monofasico' || val === 'bifasico') {
      setTension('220')
    } else {
      setTension('380')
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const tensionVal = tension === 'custom'
      ? parseFloat(tensionCustom)
      : parseFloat(tension)

    const input: CalculatorInput = {
      sistema,
      tension_v: tensionVal,
      potencia_kw: parseFloat(potencia),
      factor_potencia: parseFloat(fp),
      factor_demanda: parseFloat(fd),
      longitud_m: parseFloat(longitud),
      material,
      tipo_canalizacion: tipoCanalizacion as CalculatorInput['tipo_canalizacion'],
      temp_ambiente_c: tempAmbiente,
      circuitos_agrupados: agrupamiento,
      msnm: parseFloat(msnm) || 0,
      montaje,
      tipo_circuito: tipoCircuito as CalculatorInput['tipo_circuito'],
      limite_caida_pct: parseFloat(limCaida),
      cables_por_fase: cablesFase === 'auto' ? 0 : parseInt(cablesFase),
      icc_ka: icc ? parseFloat(icc) : undefined,
      tiempo_cc_s: tcc ? parseFloat(tcc) : undefined,
      tipo_falla: tipoFalla as CalculatorInput['tipo_falla'],
      t_inicial_c: parseFloat(tInicial) || 75,
      t_max_c: parseFloat(tMax) || 160,
    }
    onSubmit(input)
  }

  return (
    <form onSubmit={handleSubmit} style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* ── PARÁMETROS DE ENTRADA ── */}
      <div className="panel-title">Parámetros de entrada</div>

      {/* Sistema */}
      <div className="form-group">
        <label className="form-label">Sistema eléctrico</label>
        <div className="seg-control seg-control-3">
          {(['trifasico','bifasico','monofasico'] as Sistema[]).map(s => (
            <button key={s} type="button"
              className={`seg-btn${sistema === s ? ' active' : ''}`}
              onClick={() => onSistemaChange(s)}
            >
              {s === 'trifasico' ? 'Trifásico' : s === 'bifasico' ? 'Bifásico' : 'Monofásico'}
            </button>
          ))}
        </div>
      </div>

      {/* Tensión */}
      <div className="form-group">
        <label className="form-label">Tensión de servicio <span className="unit">V</span></label>
        <div className="select-wrap">
          <select className="form-select" value={tension} onChange={e => setTension(e.target.value)}>
            <option value="380">380 V — Trifásico estándar</option>
            <option value="220">220 V — Monofásico / Bifásico</option>
            <option value="400">400 V — Trifásico 50Hz</option>
            <option value="custom">Otro valor...</option>
          </select>
        </div>
      </div>
      {tension === 'custom' && (
        <div className="form-group">
          <label className="form-label">Tensión personalizada <span className="unit">V</span></label>
          <input type="number" className="form-input" placeholder="Ej: 415"
            value={tensionCustom} onChange={e => setTensionCustom(e.target.value)} min={100} />
        </div>
      )}

      {/* Potencia */}
      <div className="form-group">
        <label className="form-label">Potencia de la carga <span className="unit">kW</span></label>
        <input type="number" className="form-input" placeholder="Ej: 15"
          step="0.1" min="0.1" required value={potencia} onChange={e => setPotencia(e.target.value)} />
      </div>

      {/* Factor de potencia */}
      <div className="form-group">
        <label className="form-label">Factor de potencia (cos φ)</label>
        <input type="number" className="form-input" placeholder="0.85"
          step="0.01" min="0.5" max="1" value={fp} onChange={e => setFp(e.target.value)} />
      </div>

      {/* Longitud */}
      <div className="form-group">
        <label className="form-label">Longitud del circuito <span className="unit">m</span></label>
        <input type="number" className="form-input" placeholder="Ej: 80"
          step="1" min="1" required value={longitud} onChange={e => setLongitud(e.target.value)} />
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '18px 0' }} />

      {/* ── INSTALACIÓN Y CANALIZACIÓN ── */}
      <div className="panel-title">Instalación y canalización</div>

      {/* Tipo canalización */}
      <div className="form-group">
        <label className="form-label">Tipo de canalización</label>
        <div className="select-wrap">
          <select className="form-select" value={tipoCanalizacion} onChange={e => setTipoCanalizacion(e.target.value)}>
            <option value="ducto_pvc">Ducto PVC — pared o losa</option>
            <option value="ducto_metalico">Ducto metálico (conduit)</option>
            <option value="bandeja_perforada">Bandeja portacables perforada</option>
            <option value="bandeja_escalera">Bandeja tipo escalera al aire</option>
            <option value="enterrado_directo">Enterrado directo en tierra</option>
            <option value="enterrado_ducto">Enterrado en ducto bajo tierra</option>
            <option value="aereo_libre">Cable aéreo al aire libre</option>
          </select>
        </div>
      </div>

      {/* Temperatura ambiente */}
      <div className="form-group">
        <label className="form-label">Temperatura ambiente <span className="unit">°C</span></label>
        <div className="select-wrap">
          <select className="form-select" value={tempAmbiente}
            onChange={e => setTempAmbiente(parseInt(e.target.value))}>
            <option value={25}>25°C</option>
            <option value={30}>30°C — Referencia RIC</option>
            <option value={35}>35°C</option>
            <option value={40}>40°C</option>
            <option value={45}>45°C</option>
            <option value={50}>50°C</option>
          </select>
        </div>
      </div>

      {/* Altitud */}
      <div className="form-group">
        <label className="form-label">Altitud de instalación <span className="unit">msnm</span></label>
        <input type="number" className="form-input" placeholder="Ej: 2400"
          value={msnm} onChange={e => setMsnm(e.target.value)} />
        {showNotaMsnm && <div className="nota-warn">{notaMsnm}</div>}
      </div>

      {/* Agrupamiento */}
      <div className="form-group">
        <label className="form-label">Conductores agrupados en el mismo ducto</label>
        <div className="select-wrap">
          <select className="form-select" value={agrupamiento}
            onChange={e => setAgrupamiento(parseInt(e.target.value))}>
            <option value={1}>1 circuito (sin reducción)</option>
            <option value={2}>2 circuitos — factor 0.80</option>
            <option value={3}>3 circuitos — factor 0.70</option>
            <option value={4}>4 circuitos — factor 0.65</option>
            <option value={6}>5–6 circuitos — factor 0.57</option>
            <option value={9}>7–9 circuitos — factor 0.50</option>
          </select>
        </div>
      </div>

      {/* Material */}
      <div className="form-group">
        <label className="form-label">Material del conductor</label>
        <div className="seg-control seg-control-2">
          {(['cu','al'] as Material[]).map(m => (
            <button key={m} type="button"
              className={`seg-btn${material === m ? ' active' : ''}`}
              onClick={() => setMaterial(m)}
            >
              {m === 'cu' ? 'Cu — Cobre' : 'Al — Aluminio'}
            </button>
          ))}
        </div>
      </div>

      {/* Factor total (display) */}
      <div className="form-group">
        <label className="form-label">Factor de corrección total <span className="unit">(Ft × Fg × Fa)</span></label>
        <input type="text" className="form-input" readOnly value={factorTotal} />
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '18px 0' }} />

      {/* ── OPCIONES AVANZADAS ── */}
      <div className="panel-title">Opciones avanzadas</div>

      {/* Límite caída */}
      <div className="form-group">
        <label className="form-label">Límite de caída de tensión <span className="unit">%</span></label>
        <div className="select-wrap">
          <select className="form-select" value={limCaida} onChange={e => setLimCaida(e.target.value)}>
            <option value="2">2% — Alumbrado (RIC Art. 5.5.4)</option>
            <option value="3">3% — Fuerza motriz (RIC Art. 5.5.4)</option>
            <option value="5">5% — Instalaciones industriales</option>
          </select>
        </div>
      </div>

      {/* Cables por fase */}
      <div className="form-group">
        <label className="form-label">Cables por fase (paralelo)</label>
        <div className="select-wrap">
          <select className="form-select" value={cablesFase} onChange={e => setCablesFase(e.target.value)}>
            <option value="auto">Automático (recomendado)</option>
            <option value="1">1 cable por fase</option>
            <option value="2">2 cables por fase en paralelo</option>
            <option value="3">3 cables por fase en paralelo</option>
          </select>
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '18px 0' }} />

      {/* ── TIPO DE CIRCUITO Y CARGA ── */}
      <div className="panel-title">Tipo de circuito y carga</div>

      {/* Tipo circuito RIC */}
      <div className="form-group">
        <label className="form-label">Tipo de circuito <span className="unit">(RIC Art. 5.3.1 / 5.5.4)</span></label>
        <div className="select-wrap">
          <select className="form-select" value={tipoCircuito}
            onChange={e => onTipoCircuitoChange(e.target.value)}>
            <option value="alumbrado">Circuito de alumbrado — mín. 1.5 mm²</option>
            <option value="fuerza">Circuito de fuerza — mín. 2.5 mm²</option>
            <option value="tomacorrientes">Circuito de tomacorrientes — mín. 2.5 mm²</option>
            <option value="motor">Circuito de motor — mín. 2.5 mm² · Fd 1.25</option>
            <option value="alimentador">Alimentador general — mín. 4.0 mm²</option>
          </select>
        </div>
      </div>
      {notaCircuito && <div className="nota-info" style={{ marginTop: '-8px', marginBottom: '12px' }}>{notaCircuito}</div>}

      {/* Tipo de carga */}
      <div className="form-group">
        <label className="form-label">Tipo de carga</label>
        <div className="select-wrap">
          <select className="form-select" value={tipoCarga}
            onChange={e => onTipoCargaChange(e.target.value)}>
            <option value="motor">Motor eléctrico</option>
            <option value="iluminacion">Iluminación</option>
            <option value="electronico">Equipo electrónico / TI</option>
            <option value="resistivo">Carga resistiva (calefacción)</option>
            <option value="alimentador">Alimentador general / tablero</option>
          </select>
        </div>
      </div>
      <div className="nota-warn" style={{ marginTop: '-8px', marginBottom: '12px' }}>
        cos φ y factor de demanda ajustados al tipo de carga seleccionado.
      </div>

      {/* Factor de demanda */}
      <div className="form-group">
        <label className="form-label">Factor de demanda <span className="unit">(motores 1.25 · RIC Art.5.2)</span></label>
        <input type="number" className="form-input"
          step="0.01" min="1.00" max="2.00" value={fd} onChange={e => setFd(e.target.value)} />
      </div>

      {/* Montaje */}
      <div className="form-group">
        <label className="form-label">Montaje de la canalización</label>
        <div className="seg-control seg-control-3">
          {(['vista','banco','oculto'] as Montaje[]).map(m => (
            <button key={m} type="button"
              className={`seg-btn${montaje === m ? ' active' : ''}`}
              onClick={() => setMontaje(m)}
            >
              {m === 'vista' ? 'A la vista' : m === 'banco' ? 'Banco de ducto' : 'Oculto / empotrado'}
            </button>
          ))}
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '18px 0' }} />

      {/* ── ESTRÉS TÉRMICO ── */}
      <div className="panel-title">Estrés térmico por cortocircuito</div>

      {/* Icc */}
      <div className="form-group">
        <label className="form-label">Corriente de cortocircuito (Icc) <span className="unit">kA</span></label>
        <input type="number" className="form-input" placeholder="Ej: 10 (dejar vacío para omitir)"
          step="0.1" min="0.1" value={icc} onChange={e => setIcc(e.target.value)} />
      </div>

      {/* Tiempo */}
      <div className="form-group">
        <label className="form-label">Tiempo de despeje de falla (t) <span className="unit">segundos</span></label>
        <input type="number" className="form-input" placeholder="Ej: 0.5"
          step="0.01" min="0.01" max="5" value={tcc} onChange={e => setTcc(e.target.value)} />
      </div>

      {/* Tipo falla */}
      <div className="form-group">
        <label className="form-label">Tipo de falla de cortocircuito</label>
        <div className="select-wrap">
          <select className="form-select" value={tipoFalla} onChange={e => setTipoFalla(e.target.value)}>
            <option value="3f">Trifásico (3F) — máxima severidad</option>
            <option value="2f">Bifásico (2F) — factor 0.87</option>
            <option value="2ft">Bifásico a tierra (2FT) — factor 1.00</option>
            <option value="1ft">Monofásico a tierra (1FT) — factor 0.58</option>
          </select>
        </div>
      </div>

      {/* T inicial / T max */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">T° inicial <span className="unit">°C</span></label>
          <input type="number" className="form-input"
            step="1" min="20" max="150" value={tInicial} onChange={e => setTInicial(e.target.value)} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">T° máx. adm. <span className="unit">°C</span></label>
          <input type="number" className="form-input"
            step="1" min="100" max="350" value={tMax} onChange={e => setTMax(e.target.value)} />
        </div>
      </div>
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '11px', color: 'var(--text3)',
        marginTop: '6px', marginBottom: '16px',
      }}>
        THW/THHN: 75°C → 160°C · XLPE: 90°C → 250°C · Cu desnudo: 20°C → 300°C
      </div>

      <button type="submit" className="btn-calc" disabled={loading}>
        {loading ? 'Calculando…' : '⚡ Calcular conductor'}
      </button>
    </form>
  )
}
