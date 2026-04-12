/**
 * Tablas normativas RIC — portadas 1:1 desde backend/app/engine/ric_tables.py
 * Fuente: Tabla 5-1 RIC, conductores THW 75 °C, T_amb = 30 °C
 */

// ── Tipo de fila de la tabla RIC ──────────────────────────────────────────────

export interface RicRow {
  sec: number      // Sección mm²
  icu_d: number    // I_max Cu ducto (A)
  icu_a: number    // I_max Cu aire (A)
  ial_d: number    // I_max Al ducto (A), 0 = no aplica
  ial_a: number    // I_max Al aire (A), 0 = no aplica
  rcu: number      // Resistencia Cu (Ω/km a 20 °C)
  ral: number      // Resistencia Al (Ω/km a 20 °C), 0 = no aplica
  awg: string      // Calibre AWG/MCM
}

// ── Tabla RIC completa (16 secciones) ─────────────────────────────────────────

export const TABLA_RIC: readonly RicRow[] = [
  { sec: 1.5,   icu_d: 13,  icu_a: 17,  ial_d: 0,   ial_a: 0,   rcu: 12.10,   ral: 0.0,   awg: '14 AWG' },
  { sec: 2.5,   icu_d: 18,  icu_a: 23,  ial_d: 0,   ial_a: 0,   rcu: 7.41,    ral: 0.0,   awg: '12 AWG' },
  { sec: 4.0,   icu_d: 24,  icu_a: 31,  ial_d: 0,   ial_a: 0,   rcu: 4.61,    ral: 0.0,   awg: '10 AWG' },
  { sec: 6.0,   icu_d: 31,  icu_a: 40,  ial_d: 0,   ial_a: 0,   rcu: 3.08,    ral: 0.0,   awg: '8 AWG' },
  { sec: 10.0,  icu_d: 42,  icu_a: 54,  ial_d: 32,  ial_a: 42,  rcu: 1.83,    ral: 3.08,  awg: '6 AWG' },
  { sec: 16.0,  icu_d: 56,  icu_a: 73,  ial_d: 44,  ial_a: 57,  rcu: 1.15,    ral: 1.91,  awg: '4 AWG' },
  { sec: 25.0,  icu_d: 73,  icu_a: 95,  ial_d: 57,  ial_a: 75,  rcu: 0.727,   ral: 1.20,  awg: '2 AWG' },
  { sec: 35.0,  icu_d: 89,  icu_a: 117, ial_d: 70,  ial_a: 92,  rcu: 0.524,   ral: 0.868, awg: '1 AWG' },
  { sec: 50.0,  icu_d: 108, icu_a: 141, ial_d: 84,  ial_a: 110, rcu: 0.387,   ral: 0.641, awg: '1/0 AWG' },
  { sec: 70.0,  icu_d: 136, icu_a: 179, ial_d: 107, ial_a: 140, rcu: 0.268,   ral: 0.443, awg: '2/0 AWG' },
  { sec: 95.0,  icu_d: 164, icu_a: 216, ial_d: 129, ial_a: 169, rcu: 0.193,   ral: 0.320, awg: '3/0 AWG' },
  { sec: 120.0, icu_d: 188, icu_a: 249, ial_d: 149, ial_a: 197, rcu: 0.153,   ral: 0.253, awg: '4/0 AWG' },
  { sec: 150.0, icu_d: 216, icu_a: 285, ial_d: 170, ial_a: 225, rcu: 0.124,   ral: 0.206, awg: '250 MCM' },
  { sec: 185.0, icu_d: 245, icu_a: 324, ial_d: 194, ial_a: 256, rcu: 0.0991,  ral: 0.164, awg: '350 MCM' },
  { sec: 240.0, icu_d: 286, icu_a: 380, ial_d: 227, ial_a: 300, rcu: 0.0754,  ral: 0.125, awg: '500 MCM' },
  { sec: 300.0, icu_d: 328, icu_a: 435, ial_d: 261, ial_a: 346, rcu: 0.0601,  ral: 0.100, awg: '600 MCM' },
]

// ── Sección mínima por tipo de circuito (RIC Art. 5.3.1) ─────────────────────

export const SEC_MIN_CIRCUITO: Record<string, number> = {
  alumbrado:      1.5,
  fuerza:         2.5,
  tomacorrientes: 2.5,
  motor:          2.5,
  alimentador:    4.0,
}

// ── Factores de temperatura (RIC Tabla 5-3, THW 75 °C, T_ref = 30 °C) ────────

const FACTORES_TEMPERATURA: Record<number, number> = {
  25: 1.050,
  30: 1.000,
  35: 0.940,
  40: 0.870,
  45: 0.790,
  50: 0.710,
}

// ── Factores de agrupamiento (RIC Tabla 5-4) ──────────────────────────────────

export const FACTORES_AGRUPAMIENTO: Record<number, number> = {
  1: 1.000,
  2: 0.800,
  3: 0.700,
  4: 0.650,
  6: 0.570,
  9: 0.500,
}

// ── Constante K para estrés térmico IEC 60949 ────────────────────────────────

export const K_CONST: Record<string, number> = {
  cu_thw:  115,
  cu_xlpe: 143,
  al_thw:   74,
  al_xlpe:  94,
}

// ── Factor de tipo de falla cortocircuito ────────────────────────────────────

export const FACTOR_FALLA: Record<string, number> = {
  '3f':  1.00,
  '2f':  0.87,
  '2ft': 1.00,
  '1ft': 0.58,
}

// ── Diámetros exteriores de cable (mm): [unipolar, multiconductor] ───────────

export const DIAMETRO_CABLE: Record<number, [number, number]> = {
  1.5:   [5.8,  9.5],
  2.5:   [6.5,  11.0],
  4.0:   [7.0,  12.5],
  6.0:   [7.8,  13.5],
  10.0:  [9.2,  16.5],
  16.0:  [11.0, 19.5],
  25.0:  [13.5, 24.0],
  35.0:  [15.0, 27.0],
  50.0:  [17.5, 31.0],
  70.0:  [20.5, 36.5],
  95.0:  [24.0, 43.0],
  120.0: [26.5, 48.0],
  150.0: [29.5, 54.0],
  185.0: [33.0, 60.0],
  240.0: [38.0, 69.0],
  300.0: [42.0, 78.0],
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function getTempFactor(tempC: number): number {
  if (tempC in FACTORES_TEMPERATURA) return FACTORES_TEMPERATURA[tempC]
  const keys = Object.keys(FACTORES_TEMPERATURA).map(Number)
  const closest = keys.reduce((a, b) => (Math.abs(b - tempC) < Math.abs(a - tempC) ? b : a))
  return FACTORES_TEMPERATURA[closest]
}

export function getGroupingFactor(circuitos: number): number {
  if (circuitos <= 1) return 1.000
  if (circuitos <= 2) return 0.800
  if (circuitos <= 3) return 0.700
  if (circuitos <= 4) return 0.650
  if (circuitos <= 6) return 0.570
  return 0.500
}

export function getAltitudeFactor(msnm: number): number {
  if (msnm <= 1000) return 1.00
  if (msnm <= 1500) return 0.97
  if (msnm <= 2000) return 0.94
  if (msnm <= 2500) return 0.91
  if (msnm <= 3000) return 0.88
  if (msnm <= 3500) return 0.84
  if (msnm <= 4000) return 0.80
  if (msnm <= 4500) return 0.76
  return 0.71
}

export function isAirInstallation(tipo: string): boolean {
  return tipo === 'bandeja_perforada' || tipo === 'bandeja_escalera' || tipo === 'aereo_libre'
}

export function isBuriedInstallation(tipo: string): boolean {
  return tipo === 'enterrado_directo' || tipo === 'enterrado_ducto'
}
