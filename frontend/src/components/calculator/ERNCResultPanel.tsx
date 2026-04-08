'use client'
import type { ERNCResponse } from '@/types'

interface Props {
  response: ERNCResponse
}

const TOPOLOGIA_LABELS: Record<string, string> = {
  string_dc:   'String DC fotovoltaico',
  ac_inversor: 'AC Inversor → tablero BT',
  gd_red_bt:   'Generación Distribuida — Red BT',
  baterias_dc: 'Baterías DC estacionarias',
}

const TOPOLOGIA_NORMA: Record<string, string> = {
  string_dc:   'IEC 60364-7-712 · IEC 62548 · EN 50618',
  ac_inversor: 'NCh Elec 4/2003 · IEC 60364-7-712',
  gd_red_bt:   'NTCO SEC (2020) · NCh Elec 4/2003',
  baterias_dc: 'IEC 62619 · IEC 60364-7-712',
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '3px 10px',
      borderRadius: '4px',
      fontSize: '11px',
      fontFamily: "'IBM Plex Mono', monospace",
      fontWeight: 700,
      background: ok ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
      color: ok ? '#4ade80' : '#f87171',
      border: `1px solid ${ok ? 'rgba(74,222,128,0.35)' : 'rgba(248,113,113,0.35)'}`,
    }}>
      {ok ? '✔' : '✖'} {label}
    </span>
  )
}

function Row({ label, value, mono = false, accent = false }: {
  label: string; value: string | number; mono?: boolean; accent?: boolean
}) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      padding: '6px 0',
      borderBottom: '1px solid var(--border)',
      gap: '12px',
    }}>
      <span style={{ fontSize: '12px', color: 'var(--text2)', flexShrink: 0 }}>{label}</span>
      <span style={{
        fontFamily: mono ? "'IBM Plex Mono', monospace" : undefined,
        fontSize: mono ? '13px' : '13px',
        fontWeight: accent ? 700 : 500,
        color: accent ? 'var(--blue)' : 'var(--text1)',
        textAlign: 'right',
      }}>
        {value}
      </span>
    </div>
  )
}

export function ERNCResultPanel({ response }: Props) {
  const r = response.resultado

  const cumpleColor = r.cumple ? '#4ade80' : '#f87171'
  const cumpleText = r.cumple ? 'CUMPLE' : 'NO CUMPLE'

  return (
    <div>
      {/* ── Header resultado ── */}
      <div style={{
        background: r.cumple
          ? 'linear-gradient(135deg, rgba(74,222,128,0.10) 0%, transparent 100%)'
          : 'linear-gradient(135deg, rgba(248,113,113,0.10) 0%, transparent 100%)',
        border: `1px solid ${r.cumple ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
        borderRadius: 'var(--r)',
        padding: '16px 20px',
        marginBottom: '16px',
      }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '11px',
          color: 'var(--text3)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: '6px',
        }}>
          {TOPOLOGIA_LABELS[r.topologia] || r.topologia}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '32px',
            fontWeight: 700,
            color: cumpleColor,
            lineHeight: 1,
          }}>
            {r.seccion_mm2} mm²
          </div>
          <div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '12px',
              color: cumpleColor,
              fontWeight: 700,
            }}>
              {cumpleText}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>
              {r.tipo_cable}
            </div>
          </div>
        </div>

        <div style={{
          marginTop: '10px',
          fontSize: '12px',
          color: 'var(--text3)',
          fontFamily: "'IBM Plex Mono', monospace",
          lineHeight: 1.4,
        }}>
          {r.descripcion}
        </div>
      </div>

      {/* ── Badges ── */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <Badge ok={r.cumple_termico} label="Ampacidad" />
        <Badge ok={r.cumple_caida} label={`ΔV ${r.caida_pct.toFixed(2)}% ≤ ${r.limite_caida_pct}%`} />
      </div>

      {/* ── Tabla de resultados ── */}
      <div style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r)',
        padding: '12px 16px',
        marginBottom: '12px',
      }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text2)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '8px',
        }}>
          Resultados eléctricos
        </div>

        <Row label="Sección seleccionada" value={`${r.seccion_mm2} mm²`} mono accent />
        <Row label="Tipo de cable" value={r.tipo_cable} mono />
        <Row label="Material conductor" value={r.material.toUpperCase()} mono />
        <Row label="Corriente de diseño" value={`${r.i_diseno_a.toFixed(2)} A`} mono />
        <Row label="Corriente máxima admisible" value={`${r.i_max_admisible_a.toFixed(2)} A`} mono />
        <Row label="Caída de tensión" value={`${r.caida_v.toFixed(3)} V  (${r.caida_pct.toFixed(3)}%)`} mono />
        <Row label="Límite ΔV" value={`${r.limite_caida_pct}%`} mono />
        <Row label="Longitud circuito" value={`${r.longitud_m} m`} mono />
        {r.factor_temperatura !== undefined && r.factor_temperatura !== null && (
          <Row label="Factor temperatura aplicado" value={r.factor_temperatura.toFixed(4)} mono />
        )}
      </div>

      {/* ── Sección DC: Voc ── */}
      {(r.voc_max_v !== undefined || r.voc_min_v !== undefined) && (
        <div style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r)',
          padding: '12px 16px',
          marginBottom: '12px',
        }}>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--text2)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '8px',
          }}>
            Tensiones DC del string
          </div>
          {r.voc_max_v !== undefined && (
            <Row
              label="Voc máxima (T° mínima)"
              value={`${r.voc_max_v.toFixed(1)} V`}
              mono
              accent={r.voc_max_v > 1000}
            />
          )}
          {r.voc_min_v !== undefined && (
            <Row label="Voc mínima (T° máxima)" value={`${r.voc_min_v.toFixed(1)} V`} mono />
          )}
          {r.i_cortocircuito_diseno_a !== undefined && (
            <Row label="Isc diseño (×1.25)" value={`${r.i_cortocircuito_diseno_a.toFixed(2)} A`} mono />
          )}
          {r.voc_max_v !== undefined && r.voc_max_v > 1000 && (
            <div style={{
              marginTop: '8px',
              padding: '8px 10px',
              background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.3)',
              borderRadius: '4px',
              fontSize: '11px',
              fontFamily: "'IBM Plex Mono', monospace",
              color: '#f87171',
            }}>
              Voc_max {r.voc_max_v.toFixed(0)} V supera 1000 V — requiere diseño MLVDC (IEC 60364-7-712)
            </div>
          )}
        </div>
      )}

      {/* ── Norma de referencia ── */}
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '10px',
        color: 'var(--text3)',
        textAlign: 'right',
        marginBottom: '12px',
      }}>
        {TOPOLOGIA_NORMA[r.topologia] || ''}
      </div>

      {/* ── Advertencias ── */}
      {r.advertencias.length > 0 && (
        <div style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r)',
          padding: '12px 16px',
        }}>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--text2)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '8px',
          }}>
            Advertencias y notas
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {r.advertencias.map((adv, i) => (
              <div key={i} style={{
                fontSize: '11px',
                fontFamily: "'IBM Plex Mono', monospace",
                color: 'var(--text2)',
                lineHeight: 1.5,
                padding: '4px 0',
                borderBottom: i < r.advertencias.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                · {adv}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
