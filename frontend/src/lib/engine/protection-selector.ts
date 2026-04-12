/**
 * Motor de selección de protecciones eléctricas — portado 1:1 desde
 * backend/app/engine/protection_selector.py
 *
 * Selecciona termomagnético y diferencial conforme RIC Art. 4.4 / RIC.
 * Condición fundamental: Ib ≤ In ≤ Iz
 */
import type {
  ProteccionRecomendada,
  TermomagneticoRecomendado,
  DiferencialRecomendado,
} from './types'

// ── Calibres normalizados IEC 60898 / IEC 60947-2 ────────────────────────────

const CALIBRES_IEC = [
  6, 8, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160,
  200, 250, 320, 400, 500, 630,
]

const PODER_CORTE = [1.5, 3.0, 4.5, 6.0, 10.0, 15.0, 20.0, 25.0, 36.0, 50.0]

// ── Helpers internos ──────────────────────────────────────────────────────────

function seleccionarCalibre(ib: number): number {
  for (const c of CALIBRES_IEC) {
    if (c >= ib) return c
  }
  return CALIBRES_IEC[CALIBRES_IEC.length - 1]
}

function seleccionarPoderCorte(iccKa: number | null | undefined): number {
  if (iccKa == null) return 6.0
  for (const pc of PODER_CORTE) {
    if (pc >= iccKa) return pc
  }
  return PODER_CORTE[PODER_CORTE.length - 1]
}

function curvaPorCircuito(tipo: string): string {
  if (tipo === 'alumbrado') return 'B'
  if (tipo === 'motor') return 'D'
  return 'C'
}

function sensibilidadDiferencial(tipo: string, ambienteHumedo: boolean): number {
  if (ambienteHumedo) return 30
  if (tipo === 'alimentador') return 300
  if (tipo === 'motor') return 100
  return 30
}

function tipoRcd(tipo: string): string {
  if (tipo === 'motor') return 'A'
  return 'AC'
}

function numPolos(sistema: string): number {
  return sistema === 'trifasico' ? 4 : 2
}

// ── Función principal ─────────────────────────────────────────────────────────

export function seleccionarProteccion(
  ib: number,
  iz: number,
  tipoCircuito: string,
  sistema: string,
  iccKa?: number | null,
  ambienteHumedo = false,
): ProteccionRecomendada {
  const advertenciasTm: string[] = []
  const advertenciasDiff: string[] = []

  // ── Termomagnético ────────────────────────────────────────────────────────
  const inA = seleccionarCalibre(ib)
  const curva = curvaPorCircuito(tipoCircuito)
  const icuKa = seleccionarPoderCorte(iccKa)

  const cumpleIb = inA >= ib
  const cumpleIz = inA <= iz
  const cumpleRicTm = cumpleIb && cumpleIz

  if (!cumpleIz) {
    advertenciasTm.push(
      `In (${inA}A) > Iz (${iz.toFixed(1)}A): el termomagnético supera la capacidad del conductor. ` +
      'Aumentar sección del conductor o usar protección de menor calibre.'
    )
  }
  if (!cumpleIb) {
    advertenciasTm.push(
      `In (${inA}A) < Ib (${ib.toFixed(1)}A): el termomagnético no protege el circuito.`
    )
  }
  if (Math.abs(inA - iz) / iz < 0.05) {
    advertenciasTm.push(
      'In muy cercano a Iz — considerar calibre superior para margen de seguridad.'
    )
  }

  const descTm = `${inA}A curva ${curva} — ${icuKa.toFixed(0)} kA`

  const termomagnetico: TermomagneticoRecomendado = {
    in_a: inA,
    curva,
    icu_ka: icuKa,
    tipo: 'Termomagnético IEC 60898',
    descripcion: descTm,
    cumple_ric: cumpleRicTm,
    advertencias: advertenciasTm,
  }

  // ── Diferencial ───────────────────────────────────────────────────────────
  const iDeltaN = sensibilidadDiferencial(tipoCircuito, ambienteHumedo)
  const rcd = tipoRcd(tipoCircuito)
  const polos = numPolos(sistema)
  const inDiff = seleccionarCalibre(inA)
  const polosStr = `${polos}P`
  const descDiff = `${inDiff}A ${polosStr} — ${iDeltaN}mA tipo ${rcd}`

  if (rcd === 'A') {
    advertenciasDiff.push(
      'Tipo A requerido: el circuito tiene cargas con componente DC (motor/VFD). ' +
      'El tipo AC no detecta corrientes de falta con rectificación parcial.'
    )
  }
  if (iDeltaN === 300) {
    advertenciasDiff.push(
      'Sensibilidad 300mA: protección contra incendio. ' +
      'No constituye protección contra contacto directo — agregar diferencial 30mA aguas abajo.'
    )
  }

  const diferencial: DiferencialRecomendado = {
    in_a: inDiff,
    i_delta_n_ma: iDeltaN,
    tipo_rcd: rcd,
    num_polos: polos,
    descripcion: descDiff,
    advertencias: advertenciasDiff,
  }

  const verificacion: Record<string, string> = {
    'Ib (corriente diseño)': `${ib.toFixed(2)} A`,
    'In (termomagnético)': `${inA.toFixed(0)} A`,
    'Iz (corriente máx. conductor)': `${iz.toFixed(2)} A`,
    'Ib ≤ In': cumpleIb ? '✓' : '✗',
    'In ≤ Iz': cumpleIz ? '✓' : '✗',
    'Cumple RIC Art. 4.4': cumpleRicTm ? '✓ CUMPLE' : '✗ NO CUMPLE',
  }

  return {
    termomagnetico,
    diferencial,
    verificacion_ric: verificacion,
    cumple: cumpleRicTm,
  }
}
