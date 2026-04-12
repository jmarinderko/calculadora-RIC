/**
 * Tabla resumen de selección de calibres — formato RAVIT.
 *
 * Toggle IEC / ANSI para simbología:
 *
 * IEC 60364 / IEC 60617          ANSI / NEC / NFPA 70
 * U  = tensión                   V  = voltage
 * Ib = corriente de diseño       I_design = design current
 * Iz = corriente admisible       Ampacity
 * In = corriente nominal         I_rated
 * Fc = factor de corrección      CF = correction factor
 * cos φ = factor de potencia     PF = power factor
 * ΔU = caída de tensión          VD = voltage drop
 * S  = sección (mm²)             Size (AWG/MCM)
 * PE = conductor protección      EGC = equipment grounding
 * N  = neutro                    N = neutral
 * θa = temp. ambiente            T_amb
 */

'use client'

import { useState } from 'react'
import type { CalculatorResponse, CalculatorInput } from '@/types'

interface Props {
  result: CalculatorResponse
  input: CalculatorInput
}

type Norma = 'iec' | 'ansi'

function fmt(n: number, dec = 2): string {
  return parseFloat(n.toFixed(dec)).toString()
}

// ── Simbología por norma ────────────────────────────────────────────────────

const SYM = {
  iec: {
    label: 'IEC 60364',
    potencia: 'P',
    tension: 'U',
    corrNominal: 'In',
    fp: 'cos φ',
    seccion: 'S',
    largo: 'L',
    corrAdmisible: 'Iz',
    factorCorr: 'Fc',
    corrDiseno: 'Ib',
    caidaPct: 'ΔU%',
    caidaAbs: 'ΔU',
    verifTermico: 'Ib ≤ Iz',
    verifCaida: 'ΔU% ≤ lim',
    unidadSeccion: 'mm²',
    neutro: 'SN',
    tierra: 'SPE',
    tempAmb: 'θa',
    fases: { trifasico: '3F', bifasico: '2F', monofasico: '1F' },
  },
  ansi: {
    label: 'ANSI / NEC',
    potencia: 'P',
    tension: 'V',
    corrNominal: 'I rated',
    fp: 'PF',
    seccion: 'Size',
    largo: 'L',
    corrAdmisible: 'Ampacity',
    factorCorr: 'CF',
    corrDiseno: 'I design',
    caidaPct: 'VD%',
    caidaAbs: 'VD',
    verifTermico: 'I_d ≤ Amp',
    verifCaida: 'VD% ≤ lim',
    unidadSeccion: 'AWG/MCM',
    neutro: 'N',
    tierra: 'EGC',
    tempAmb: 'T amb',
    fases: { trifasico: '3Ph', bifasico: '2Ph', monofasico: '1Ph' },
  },
} as const

const CANALIZACION_LABEL: Record<string, string> = {
  ducto_pvc: 'Ducto PVC',
  ducto_metalico: 'Ducto met.',
  bandeja_perforada: 'Band. perf.',
  bandeja_escalera: 'Band. esc.',
  enterrado_directo: 'Enterr. dir.',
  enterrado_ducto: 'Enterr. ducto',
  aereo_libre: 'Al aire libre',
}

const TIPO_CIRCUITO_LABEL: Record<string, string> = {
  alumbrado: 'Alumbrado',
  fuerza: 'Fuerza',
  tomacorrientes: 'Tomacorrientes',
  motor: 'Motor',
  alimentador: 'Alimentador',
}

// ── Estilos ─────────────────────────────────────────────────────────────────

const cellBase: React.CSSProperties = {
  padding: '6px 10px',
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '11px',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
}

const headerCell: React.CSSProperties = {
  ...cellBase,
  fontWeight: 700,
  fontSize: '10px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--text3)',
  background: 'var(--bg3)',
  position: 'sticky',
  top: 0,
}

const groupHeader: React.CSSProperties = {
  ...headerCell,
  textAlign: 'center',
  background: 'var(--bg2)',
  borderBottom: '2px solid var(--border)',
  fontSize: '10px',
  letterSpacing: '0.06em',
}

const valCell: React.CSSProperties = {
  ...cellBase,
  textAlign: 'right',
}

const okColor = 'var(--green)'
const failColor = 'var(--red)'

// ── Componente ──────────────────────────────────────────────────────────────

export function ResultSummaryTable({ result, input }: Props) {
  const [norma, setNorma] = useState<Norma>('iec')
  const s = SYM[norma]
  const r = result.resultado

  const configConductores = `${r.cables_por_fase}×${input.sistema === 'monofasico' ? '2' : input.sistema === 'bifasico' ? '2' : '3'}c`
  const materialLabel = r.material === 'cu' ? 'Cu' : 'Al'

  const seccionDisplay = norma === 'ansi'
    ? `${r.calibre_awg} (${r.seccion_mm2} mm²)`
    : `${r.seccion_mm2} mm² (${r.calibre_awg})`

  const fasesLabel = (s.fases as Record<string, string>)[input.sistema] ?? input.sistema

  const noUpper: React.CSSProperties = { textTransform: 'none' }

  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r)',
      overflow: 'hidden',
      marginBottom: '16px',
    }}>
      {/* Titulo + toggle norma */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px 6px',
      }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text2)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>
          Tabla resumen — Seleccion de calibre
        </div>

        {/* Toggle IEC / ANSI */}
        <div style={{
          display: 'flex',
          background: 'var(--bg3)',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          overflow: 'hidden',
        }}>
          {(['iec', 'ansi'] as const).map((n) => (
            <button
              key={n}
              onClick={() => setNorma(n)}
              style={{
                padding: '3px 10px',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '10px',
                fontWeight: norma === n ? 700 : 400,
                border: 'none',
                background: norma === n ? 'var(--accent)' : 'transparent',
                color: norma === n ? '#000' : 'var(--text3)',
                cursor: 'pointer',
                letterSpacing: '0.04em',
              }}
            >
              {n === 'iec' ? 'IEC' : 'ANSI'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          minWidth: '700px',
        }}>
          <thead>
            {/* Group headers */}
            <tr>
              <th colSpan={6} style={groupHeader}>Carga</th>
              <th colSpan={4} style={{ ...groupHeader, borderLeft: '2px solid var(--border)' }}>Cable</th>
              <th colSpan={5} style={{ ...groupHeader, borderLeft: '2px solid var(--border)' }}>Calculos</th>
              <th colSpan={2} style={{ ...groupHeader, borderLeft: '2px solid var(--border)' }}>Verificacion</th>
            </tr>
            {/* Column headers — simbología según norma seleccionada */}
            <tr>
              {/* Carga */}
              <th style={headerCell}>Clasif.</th>
              <th style={headerCell}>{s.potencia}</th>
              <th style={headerCell}>Fases</th>
              <th style={headerCell}>{s.tension}</th>
              <th style={{ ...headerCell, ...noUpper }}>{s.corrNominal}</th>
              <th style={{ ...headerCell, ...noUpper }}>{s.fp}</th>
              {/* Cable */}
              <th style={{ ...headerCell, borderLeft: '2px solid var(--border)' }}>Config.</th>
              <th style={{ ...headerCell, ...noUpper }}>{s.seccion}</th>
              <th style={headerCell}>Mat.</th>
              <th style={headerCell}>{s.largo}</th>
              {/* Calculos */}
              <th style={{ ...headerCell, borderLeft: '2px solid var(--border)', ...noUpper }}>{s.corrAdmisible}</th>
              <th style={{ ...headerCell, ...noUpper }}>{s.factorCorr}</th>
              <th style={{ ...headerCell, ...noUpper }}>{s.corrDiseno}</th>
              <th style={{ ...headerCell, ...noUpper }}>{s.caidaPct}</th>
              <th style={{ ...headerCell, ...noUpper }}>{s.caidaAbs}</th>
              {/* Verificacion */}
              <th style={{ ...headerCell, borderLeft: '2px solid var(--border)', ...noUpper }}>{s.verifTermico}</th>
              <th style={{ ...headerCell, ...noUpper }}>{s.verifCaida}</th>
            </tr>
            {/* Units row */}
            <tr>
              <th style={{ ...headerCell, fontWeight: 400, fontStyle: 'italic' }}></th>
              <th style={{ ...headerCell, fontWeight: 400, fontStyle: 'italic' }}>kW</th>
              <th style={{ ...headerCell, fontWeight: 400, fontStyle: 'italic' }}></th>
              <th style={{ ...headerCell, fontWeight: 400, fontStyle: 'italic' }}>V</th>
              <th style={{ ...headerCell, fontWeight: 400, fontStyle: 'italic' }}>A</th>
              <th style={{ ...headerCell, fontWeight: 400, fontStyle: 'italic' }}>p.u.</th>
              <th style={{ ...headerCell, fontWeight: 400, fontStyle: 'italic', borderLeft: '2px solid var(--border)' }}>N×Mc</th>
              <th style={{ ...headerCell, fontWeight: 400, fontStyle: 'italic' }}>{s.unidadSeccion}</th>
              <th style={{ ...headerCell, fontWeight: 400, fontStyle: 'italic' }}></th>
              <th style={{ ...headerCell, fontWeight: 400, fontStyle: 'italic' }}>m</th>
              <th style={{ ...headerCell, fontWeight: 400, fontStyle: 'italic', borderLeft: '2px solid var(--border)' }}>A</th>
              <th style={{ ...headerCell, fontWeight: 400, fontStyle: 'italic' }}>p.u.</th>
              <th style={{ ...headerCell, fontWeight: 400, fontStyle: 'italic' }}>A</th>
              <th style={{ ...headerCell, fontWeight: 400, fontStyle: 'italic' }}>%</th>
              <th style={{ ...headerCell, fontWeight: 400, fontStyle: 'italic' }}>V</th>
              <th style={{ ...headerCell, fontWeight: 400, fontStyle: 'italic', borderLeft: '2px solid var(--border)' }}></th>
              <th style={{ ...headerCell, fontWeight: 400, fontStyle: 'italic' }}></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {/* Carga */}
              <td style={cellBase}>{TIPO_CIRCUITO_LABEL[input.tipo_circuito] ?? input.tipo_circuito}</td>
              <td style={valCell}>{fmt(input.potencia_kw, 1)}</td>
              <td style={{ ...cellBase, textAlign: 'center' }}>{fasesLabel}</td>
              <td style={valCell}>{input.tension_v}</td>
              <td style={valCell}>{fmt(r.i_calc_a, 1)}</td>
              <td style={valCell}>{input.factor_potencia}</td>
              {/* Cable */}
              <td style={{ ...cellBase, borderLeft: '2px solid var(--border)', textAlign: 'center' }}>{configConductores}</td>
              <td style={{ ...cellBase, fontWeight: 600, color: 'var(--accent)' }}>
                {seccionDisplay}
              </td>
              <td style={{ ...cellBase, textAlign: 'center' }}>{materialLabel}</td>
              <td style={valCell}>{input.longitud_m}</td>
              {/* Calculos */}
              <td style={{ ...valCell, borderLeft: '2px solid var(--border)' }}>{fmt(r.i_max_corregida_a, 1)}</td>
              <td style={valCell}>{fmt(r.factor_total, 3)}</td>
              <td style={valCell}>{fmt(r.i_diseno_a, 1)}</td>
              <td style={valCell}>{fmt(r.caida_pct, 3)}</td>
              <td style={valCell}>{fmt(r.caida_v, 2)}</td>
              {/* Verificacion */}
              <td style={{
                ...cellBase,
                textAlign: 'center',
                borderLeft: '2px solid var(--border)',
                fontWeight: 600,
                color: r.cumple_termico ? okColor : failColor,
              }}>
                {r.cumple_termico ? 'OK' : 'NO'}
              </td>
              <td style={{
                ...cellBase,
                textAlign: 'center',
                fontWeight: 600,
                color: r.cumple_caida ? okColor : failColor,
              }}>
                {r.cumple_caida ? 'OK' : 'NO'}
              </td>
            </tr>
          </tbody>
          {/* Footer — condiciones de instalación */}
          <tfoot>
            <tr>
              <td colSpan={17} style={{
                ...cellBase,
                fontSize: '10px',
                color: 'var(--text3)',
                background: 'var(--bg3)',
                borderBottom: 'none',
              }}>
                Inst.: {CANALIZACION_LABEL[input.tipo_canalizacion] ?? input.tipo_canalizacion}
                {' · '}Agrup: {input.circuitos_agrupados} cto(s)
                {' · '}{s.tempAmb}: {input.temp_ambiente_c}°C
                {' · '}Alt: {input.msnm} msnm
                {' · '}Ft={r.ft} · Fg={r.fg} · Fa={r.fa}
                {' · '}{s.neutro}: {r.sec_neutro_mm2} mm²
                {' · '}{s.tierra}: {r.sec_tierra_mm2} mm²
                {r.proteccion ? ` · Prot: ${norma === 'iec' ? 'In' : 'I_trip'}=${r.proteccion.termomagnetico.in_a}A curva ${r.proteccion.termomagnetico.curva}` : ''}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
