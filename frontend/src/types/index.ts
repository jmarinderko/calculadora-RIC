// Tipos alineados con los schemas de backend (backend/app/engine/schemas.py)

export type Sistema = 'trifasico' | 'bifasico' | 'monofasico'
export type Material = 'cu' | 'al'
export type TipoCanalizacion =
  | 'ducto_pvc' | 'ducto_metalico' | 'bandeja_perforada'
  | 'bandeja_escalera' | 'enterrado_directo' | 'enterrado_ducto' | 'aereo_libre'
export type TipoCircuito = 'alumbrado' | 'fuerza' | 'tomacorrientes' | 'motor' | 'alimentador'
export type Montaje = 'vista' | 'banco' | 'oculto'
export type TipoFalla = '3f' | '2f' | '2ft' | '1ft'

export interface CalculatorInput {
  sistema: Sistema
  tension_v: number
  potencia_kw: number
  factor_potencia: number
  factor_demanda: number
  longitud_m: number
  material: Material
  tipo_canalizacion: TipoCanalizacion
  temp_ambiente_c: number
  circuitos_agrupados: number
  msnm: number
  montaje: Montaje
  tipo_circuito: TipoCircuito
  limite_caida_pct?: number
  cables_por_fase: number
  seccion_forzada_mm2?: number
  icc_ka?: number
  tiempo_cc_s?: number
  tipo_falla: TipoFalla
  t_inicial_c: number
  t_max_c: number
}

export interface RadioCurvatura {
  radio_mm: number
  radio_interno_mm: number
  diametro_mm: number
  factor: number
  descripcion_factor: string
  tipo_constructivo: string
  montaje: string
}

export interface EstresTermico {
  icc_efectiva_ka: number
  factor_falla: number
  tipo_falla: string
  k_const: number
  es_xlpe: boolean
  sec_min_termica_mm2: number
  icc_max_soportada_ka: number
  i2t_ja: number
  i2t_max_ja: number
  ratio_saturacion: number
  t_final_estimada_c: number
  t_max_c: number
  cumple: boolean
}

export interface CalculatorResult {
  seccion_mm2: number
  calibre_awg: string
  cables_por_fase: number
  material: string
  i_diseno_a: number
  i_calc_a: number
  i_req_a: number
  i_max_corregida_a: number
  caida_pct: number
  caida_v: number
  limite_caida_pct: number
  cumple_termico: boolean
  cumple_caida: boolean
  cumple: boolean
  ft: number
  fg: number
  fa: number
  factor_total: number
  sec_neutro_mm2: number
  sec_tierra_mm2: number
  descripcion_config: string
  radio_curvatura: RadioCurvatura
  estres_termico: EstresTermico | null
  ajustado_por_minimo: boolean
  ajustado_por_caida: boolean
  sec_min_ric_mm2: number
  advertencias: string[]
}

export interface CalculatorResponse {
  ok: boolean
  resultado: CalculatorResult
  advertencias: string[]
}

export interface Project {
  id: string
  name: string
  description?: string
  location?: string
  created_at: string
  calculation_count: number
}

export interface Calculation {
  id: string
  name?: string
  sistema: string
  tension_v: number
  potencia_kw: number
  seccion_mm2: number
  cumple_ric: boolean
  created_at: string
}

// ── Tipos ERNC / FV ──────────────────────────────────────────────────────────

export type ERNCTopologia = 'string_dc' | 'ac_inversor' | 'gd_red_bt' | 'baterias_dc'

export interface ERNCStringDCInput {
  potencia_wp: number
  voc_stc_v: number
  isc_stc_a: number
  temp_min_c: number
  temp_max_c: number
  longitud_m: number
  material: Material
  en_ducto: boolean
  noct_c: number
  coef_voc_pct: number
  limite_caida_pct?: number
}

export interface ERNCAcInversorInput {
  potencia_kw: number
  tension_v: number
  sistema: 'trifasico' | 'monofasico'
  cos_phi: number
  longitud_m: number
  material: Material
  tipo_canalizacion: TipoCanalizacion
  temp_ambiente_c: number
  circuitos_agrupados: number
  msnm: number
  limite_caida_pct?: number
}

export interface ERNCGdRedBtInput {
  potencia_kw: number
  tension_v: number
  sistema: 'trifasico' | 'monofasico'
  cos_phi: number
  longitud_m: number
  material: Material
  tipo_canalizacion: TipoCanalizacion
  temp_ambiente_c: number
  circuitos_agrupados: number
  msnm: number
  limite_caida_pct?: number
  potencia_instalada_kw?: number
  numero_fases_interconexion: number
}

export interface ERNCBateriasDCInput {
  potencia_w: number
  tension_banco_v: number
  longitud_m: number
  material: Material
  en_ducto: boolean
  temp_ambiente_c: number
  limite_caida_pct?: number
}

export interface ERNCResult {
  topologia: ERNCTopologia
  seccion_mm2: number
  material: string
  tipo_cable: string
  i_diseno_a: number
  i_max_admisible_a: number
  caida_pct: number
  caida_v: number
  limite_caida_pct: number
  cumple_termico: boolean
  cumple_caida: boolean
  cumple: boolean
  longitud_m: number
  voc_max_v?: number
  voc_min_v?: number
  i_cortocircuito_diseno_a?: number
  factor_temperatura?: number
  advertencias: string[]
  descripcion: string
}

export interface ERNCResponse {
  ok: boolean
  topologia: ERNCTopologia
  resultado: ERNCResult
  advertencias: string[]
}
