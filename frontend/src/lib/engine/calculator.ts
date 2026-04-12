/**
 * Motor de cálculo RIC — portado 1:1 desde backend/app/engine/calculator.py
 *
 * Mismas fórmulas, misma tabla, mismos factores. Diseñado para correr offline
 * en el browser / Capacitor sin necesidad de backend.
 */
import {
  TABLA_RIC, SEC_MIN_CIRCUITO, K_CONST, FACTOR_FALLA, DIAMETRO_CABLE,
  getTempFactor, getGroupingFactor, getAltitudeFactor,
  isAirInstallation, isBuriedInstallation,
  type RicRow,
} from './ric-tables'
import type {
  CalculatorInput, CalculatorResult, CalculatorResponse,
  RadioCurvatura, EstresTermico,
} from './types'
import { seleccionarProteccion } from './protection-selector'

// ── Límite de caída por tipo de circuito (RIC Art. 5.5.4) ────────────────────

const LIMITE_CAIDA_CIRCUITO: Record<string, number> = {
  alumbrado:      2.0,
  fuerza:         3.0,
  tomacorrientes: 3.0,
  motor:          3.0,
  alimentador:    3.0,
}

// ── Helpers internos ─────────────────────────────────────────────────────────

function round(v: number, dec: number): number {
  const f = 10 ** dec
  return Math.round(v * f) / f
}

function getImax(row: RicRow, material: string, esAire: boolean): number {
  if (material === 'cu') return esAire ? row.icu_a : row.icu_d
  return esAire ? row.ial_a : row.ial_d
}

function calcCaida(
  sistema: string, iCalc: number, rOhmPerM: number, longitud: number, tension: number,
): [number, number] {
  let dv: number
  let dvPct: number
  if (sistema === 'trifasico') {
    dv = Math.sqrt(3) * iCalc * rOhmPerM * longitud
    dvPct = (dv / tension) * 100
  } else if (sistema === 'bifasico') {
    dv = 2 * iCalc * rOhmPerM * longitud
    dvPct = (dv / (2 * tension)) * 100
  } else {
    dv = 2 * iCalc * rOhmPerM * longitud
    dvPct = (dv / tension) * 100
  }
  return [dv, dvPct]
}

function calcRadioCurvatura(
  secMm2: number, montaje: string, sistema: string, _cablesPorFase: number,
): RadioCurvatura {
  const dims = DIAMETRO_CABLE[secMm2]
  let dUni: number, dMulti: number
  if (dims == null) {
    dUni = Math.sqrt(secMm2) * 3.8 + 3
    dMulti = Math.sqrt(secMm2) * 5.5 + 5
  } else {
    ;[dUni, dMulti] = dims
  }

  const esUnipolar = sistema !== 'monofasico'
  const dBase = esUnipolar ? dUni : dMulti

  let factor: number
  let desc: string
  if (montaje === 'banco') {
    factor = 12; desc = '12× diámetro (banco de ducto)'
  } else if (montaje === 'oculto') {
    factor = 8; desc = '8× diámetro (oculto/empotrado)'
  } else if (esUnipolar) {
    factor = 8; desc = '8× diámetro (unipolar a la vista)'
  } else {
    factor = 6; desc = '6× diámetro (multiconductor a la vista)'
  }

  const radio = dBase * factor
  return {
    radio_mm: round(radio, 2),
    radio_interno_mm: round(radio - dBase, 2),
    diametro_mm: round(dBase, 2),
    factor,
    descripcion_factor: desc,
    tipo_constructivo: esUnipolar ? 'Unipolar (THW)' : 'Multiconductor (THWN/NYY)',
    montaje,
  }
}

function calcEstresTermico(
  secMm2: number, material: string, iccKa: number, tiempoS: number,
  tipoFalla: string, tInicial: number, tMax: number,
): EstresTermico {
  const factorFalla = FACTOR_FALLA[tipoFalla] ?? 1.0
  const iccEfectivaA = iccKa * 1000 * factorFalla

  const esXlpe = tMax >= 200
  const kKey = (material === 'cu' ? 'cu_' : 'al_') + (esXlpe ? 'xlpe' : 'thw')
  const K = K_CONST[kKey]

  const secMin = (iccEfectivaA * Math.sqrt(tiempoS)) / K
  const iccMaxSoportada = (secMm2 * K) / Math.sqrt(tiempoS) / 1000

  const i2t = iccEfectivaA ** 2 * tiempoS
  const i2tMax = (secMm2 * K) ** 2
  const ratio = i2t / i2tMax
  const tFinal = tInicial + ratio * (tMax - tInicial)

  return {
    icc_efectiva_ka: round(iccEfectivaA / 1000, 3),
    factor_falla: factorFalla,
    tipo_falla: tipoFalla.toUpperCase(),
    k_const: K,
    es_xlpe: esXlpe,
    sec_min_termica_mm2: Math.ceil(secMin * 10) / 10,
    icc_max_soportada_ka: round(iccMaxSoportada, 3),
    i2t_ja: Math.round(i2t),
    i2t_max_ja: Math.round(i2tMax),
    ratio_saturacion: round(ratio, 4),
    t_final_estimada_c: round(tFinal, 1),
    t_max_c: tMax,
    cumple: secMm2 >= secMin,
  }
}

function buscarSeccion(
  nCables: number, iReq: number, material: string, esAire: boolean,
): RicRow | null {
  for (const row of TABLA_RIC) {
    const imax = getImax(row, material, esAire)
    if (imax === 0) continue
    if (imax * nCables >= iReq) return row
  }
  return null
}

// ── Función principal ─────────────────────────────────────────────────────────

export function calculate(inp: CalculatorInput): CalculatorResponse {
  const advertencias: string[] = []

  // ── 1. Corriente de diseño ──────────────────────────────────────────────
  const kw = inp.potencia_kw * 1000
  let iDiseno: number
  if (inp.sistema === 'trifasico') {
    iDiseno = kw / (Math.sqrt(3) * inp.tension_v * inp.factor_potencia)
  } else if (inp.sistema === 'bifasico') {
    iDiseno = kw / (2 * inp.tension_v * inp.factor_potencia)
  } else {
    iDiseno = kw / (inp.tension_v * inp.factor_potencia)
  }

  // ── 2. Factor de demanda ────────────────────────────────────────────────
  const iCalc = iDiseno * inp.factor_demanda

  // ── 3. Factores de corrección ───────────────────────────────────────────
  const ft = getTempFactor(inp.temp_ambiente_c)
  const fg = getGroupingFactor(inp.circuitos_agrupados)
  const fa = getAltitudeFactor(inp.msnm)
  const factorTotal = ft * fg * fa

  // ── 4. Corriente requerida ──────────────────────────────────────────────
  const iReq = iCalc / factorTotal

  const esAire = isAirInstallation(inp.tipo_canalizacion)
  const esEnterrado = isBuriedInstallation(inp.tipo_canalizacion)

  // ── 5. Buscar sección por capacidad térmica ─────────────────────────────
  let filaElegida: RicRow | null = null
  let cablesPorFase = 1

  if (inp.cables_por_fase === 0) {
    for (let n = 1; n <= 3; n++) {
      filaElegida = buscarSeccion(n, iReq, inp.material, esAire)
      if (filaElegida) { cablesPorFase = n; break }
    }
  } else {
    cablesPorFase = inp.cables_por_fase
    filaElegida = buscarSeccion(cablesPorFase, iReq, inp.material, esAire)
  }

  if (filaElegida == null) {
    throw new Error(
      'La corriente calculada supera el máximo de las tablas RIC disponibles. ' +
      'Se requiere media tensión o análisis especial.'
    )
  }

  // ── 5b. Override manual ─────────────────────────────────────────────────
  if (inp.seccion_forzada_mm2 != null) {
    const filaForzada = TABLA_RIC.find(r => r.sec === inp.seccion_forzada_mm2)
    if (filaForzada) {
      filaElegida = filaForzada
      advertencias.push(`Sección ingresada manualmente: ${inp.seccion_forzada_mm2} mm²`)
    }
  }

  // ── 6. Sección mínima normativa (RIC Art. 5.3.1) ───────────────────────
  const secMinRic = SEC_MIN_CIRCUITO[inp.tipo_circuito] ?? 1.5
  let ajustadoPorMinimo = false

  if (filaElegida.sec < secMinRic) {
    const filaMin = TABLA_RIC.find(r => r.sec >= secMinRic)
    if (filaMin) { filaElegida = filaMin; ajustadoPorMinimo = true }
  } else if (filaElegida.sec === secMinRic) {
    const imaxMin = getImax(filaElegida, inp.material, esAire) * factorTotal
    if (imaxMin > 0 && iReq < imaxMin * 0.7) ajustadoPorMinimo = true
  }

  let seccionElegida = filaElegida.sec
  const rCu = inp.material === 'cu'
  const resistenciaOhmKm = rCu ? filaElegida.rcu : filaElegida.ral
  const rOhmPerM = resistenciaOhmKm / (cablesPorFase * 1000)

  // ── 7. Caída de tensión ─────────────────────────────────────────────────
  const [_dv, dvPct] = calcCaida(inp.sistema, iCalc, rOhmPerM, inp.longitud_m, inp.tension_v)
  const limCaida = inp.limite_caida_pct ?? LIMITE_CAIDA_CIRCUITO[inp.tipo_circuito] ?? 3.0

  // ── 8. Ajustar sección si caída excede límite ──────────────────────────
  let secCaida = seccionElegida
  let filaCaida = filaElegida
  let cablesCaida = cablesPorFase
  let ajustadoPorCaida = false

  if (dvPct > limCaida) {
    let outerBreak = false
    for (const row of TABLA_RIC) {
      if (row.sec < seccionElegida) continue
      for (let n = cablesPorFase; n <= 3; n++) {
        const r = (rCu ? row.rcu : row.ral) / (n * 1000)
        const [, dvPctTest] = calcCaida(inp.sistema, iCalc, r, inp.longitud_m, inp.tension_v)
        const imaxTest = getImax(row, inp.material, esAire)
        if (imaxTest === 0) continue
        if (dvPctTest <= limCaida && imaxTest * n * factorTotal >= iCalc) {
          if (row.sec > seccionElegida || n > cablesPorFase) {
            secCaida = row.sec; filaCaida = row; cablesCaida = n; ajustadoPorCaida = true
          }
          outerBreak = true; break
        }
      }
      if (outerBreak) break
    }
  }

  // Seleccionar la mayor entre sección térmica y sección por caída
  let filaFinal: RicRow
  let cablesFinal: number
  if (secCaida >= seccionElegida) {
    filaFinal = filaCaida; cablesFinal = cablesCaida
  } else {
    filaFinal = filaElegida; cablesFinal = cablesPorFase
  }

  const secFinal = filaFinal.sec

  // ── Caída final ─────────────────────────────────────────────────────────
  const rFinal = (rCu ? filaFinal.rcu : filaFinal.ral) / (cablesFinal * 1000)
  const [dvFinal, dvPctFinal] = calcCaida(inp.sistema, iCalc, rFinal, inp.longitud_m, inp.tension_v)
  const imaxFinal = getImax(filaFinal, inp.material, esAire) * cablesFinal * factorTotal

  const cumpleTermico = imaxFinal >= iCalc
  const cumpleCaida = dvPctFinal <= limCaida
  const cumple = cumpleTermico && cumpleCaida

  // ── 9. Conductores neutro y tierra ──────────────────────────────────────
  let secNeutro: number
  if (inp.sistema === 'trifasico' && secFinal > 16) {
    secNeutro = secFinal / 2
  } else {
    secNeutro = secFinal
  }

  let secTierra: number
  if (secFinal <= 16) secTierra = secFinal
  else if (secFinal <= 35) secTierra = 16.0
  else secTierra = secFinal / 2

  // Descripción de configuración
  let descripcionConfig: string
  if (inp.sistema === 'trifasico') {
    const neutroDesc = cablesFinal > 1
      ? `${Math.ceil(cablesFinal / 2)} cable(s) neutro`
      : '1 cable neutro'
    descripcionConfig = `${cablesFinal} cable(s)/fase × 3 fases + ${neutroDesc} + tierra`
  } else if (inp.sistema === 'bifasico') {
    descripcionConfig = `${cablesFinal} cable(s)/fase × 2 fases + ${cablesFinal} cable(s) neutro + tierra`
  } else {
    descripcionConfig = `${cablesFinal} cable(s) fase + ${cablesFinal} cable(s) neutro + tierra`
  }

  // ── 10. Radio de curvatura ──────────────────────────────────────────────
  const radioData = calcRadioCurvatura(secFinal, inp.montaje, inp.sistema, cablesFinal)

  // ── 11. Estrés térmico ──────────────────────────────────────────────────
  let estresData: EstresTermico | null = null
  if (inp.icc_ka && inp.tiempo_cc_s) {
    estresData = calcEstresTermico(
      secFinal, inp.material, inp.icc_ka, inp.tiempo_cc_s,
      inp.tipo_falla, inp.t_inicial_c, inp.t_max_c,
    )
  }

  // ── Advertencias ────────────────────────────────────────────────────────
  if (ajustadoPorMinimo) {
    advertencias.push(
      `Sección aumentada al mínimo normativo RIC Art. 5.3.1: ${secMinRic} mm² ` +
      `para circuito tipo '${inp.tipo_circuito}'.`
    )
  }
  if (ajustadoPorCaida) {
    advertencias.push(
      `Sección aumentada por criterio caída de tensión. ` +
      `ΔV = ${round(dvPctFinal, 2)}% vs. límite ${limCaida}%.`
    )
  }
  if (inp.msnm > 1000) {
    const reduccion = Math.round((1 - fa) * 100)
    advertencias.push(
      `Altitud ${inp.msnm} msnm: Fa = ${fa} — capacidad reducida ${reduccion}% (IEC 60364-5-52).`
    )
  }
  if (esEnterrado) {
    advertencias.push('Instalación enterrada: verificar profundidad mínima RIC Art. 5.4 y arena de relleno.')
  }
  if (cablesFinal > 1) {
    advertencias.push('Paralelo: cables de igual longitud, material, sección y tipo (RIC Art. 5.3.2).')
  }

  // Selección de protecciones
  const proteccionData = seleccionarProteccion(
    round(iCalc, 3),
    round(imaxFinal, 3),
    inp.tipo_circuito,
    inp.sistema,
    inp.icc_ka,
  )

  const resultado: CalculatorResult = {
    seccion_mm2: secFinal,
    calibre_awg: filaFinal.awg,
    cables_por_fase: cablesFinal,
    material: inp.material,
    i_diseno_a: round(iDiseno, 3),
    i_calc_a: round(iCalc, 3),
    i_req_a: round(iReq, 3),
    i_max_corregida_a: round(imaxFinal, 3),
    caida_pct: round(dvPctFinal, 4),
    caida_v: round(dvFinal, 4),
    limite_caida_pct: limCaida,
    cumple_termico: cumpleTermico,
    cumple_caida: cumpleCaida,
    cumple,
    ft,
    fg,
    fa,
    factor_total: round(factorTotal, 4),
    sec_neutro_mm2: secNeutro,
    sec_tierra_mm2: secTierra,
    descripcion_config: descripcionConfig,
    radio_curvatura: radioData,
    estres_termico: estresData,
    proteccion: proteccionData,
    ajustado_por_minimo: ajustadoPorMinimo,
    ajustado_por_caida: ajustadoPorCaida,
    sec_min_ric_mm2: secMinRic,
    advertencias,
  }

  return { ok: true, resultado, advertencias }
}
