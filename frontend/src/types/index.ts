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
