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
  proteccion: ProteccionRecomendada | null
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

// ── MT/AT Types ──────────────────────────────────────────────────────────────

export type NivelTension =
  | 'mt_1_7kv' | 'mt_7_12kv' | 'mt_12_24kv' | 'mt_24_36kv'
  | 'at_36_72kv' | 'at_72_145kv' | 'at_145_220kv'

export type MaterialMtat = 'cu' | 'al'
export type AislamientoMtat = 'xlpe' | 'epr'
export type TipoInstalacionMtat =
  | 'aereo_trifol' | 'aereo_plano'
  | 'enterrado_directo' | 'enterrado_ducto' | 'ducto_subterraneo'
export type TipoFallaMtat = '3f' | '2f' | '2ft' | '1ft'

export interface MtatInput {
  nivel_tension: NivelTension
  tension_kv: number
  potencia_kw?: number
  corriente_a?: number
  factor_potencia: number
  factor_demanda: number
  longitud_km: number
  material: MaterialMtat
  aislamiento: AislamientoMtat
  tipo_instalacion: TipoInstalacionMtat
  temp_ambiente_c: number
  circuitos_agrupados: number
  profundidad_m: number
  resistividad_suelo: number
  limite_caida_pct: number
  seccion_forzada_mm2?: number
  icc_ka?: number
  tiempo_cc_s?: number
  tipo_falla: TipoFallaMtat
}

export interface EstresTermicoMtat {
  icc_efectiva_ka: number
  factor_falla: number
  tipo_falla: string
  k_const: number
  aislamiento: string
  sec_min_termica_mm2: number
  icc_max_soportada_ka: number
  i2t_ja: number
  i2t_max_ja: number
  ratio_saturacion: number
  t_inicial_c: number
  t_max_cc_c: number
  t_final_estimada_c: number
  cumple: boolean
}

export interface ImpedanciaCircuito {
  r_ac_ohm_km: number
  x_ohm_km: number
  z_ohm_km: number
  r_total_ohm: number
  x_total_ohm: number
  z_total_ohm: number
  angulo_grados: number
}

export interface FactoresCorreccionMtat {
  ft: number
  fg: number
  fp: number
  fr: number
  factor_total: number
  temp_c: number
  n_circuitos: number
  profundidad_m: number | null
  resistividad: number | null
}

export interface MtatResult {
  seccion_mm2: number
  material: string
  aislamiento: string
  nivel_tension: string
  tension_kv: number
  i_diseno_a: number
  i_calc_a: number
  i_req_a: number
  i_max_corregida_a: number
  caida_v: number
  caida_pct: number
  limite_caida_pct: number
  caida_r_v: number
  caida_x_v: number
  cumple_termico: boolean
  cumple_caida: boolean
  cumple: boolean
  factores: FactoresCorreccionMtat
  ajustado_por_caida: boolean
  ajustado_por_minimo: boolean
  sec_min_nivel_mm2: number
  impedancia: ImpedanciaCircuito
  perdidas_kw: number
  perdidas_pct: number
  estres_termico: EstresTermicoMtat | null
  sec_tierra_mm2: number
  advertencias: string[]
}

export interface MtatResponse {
  ok: boolean
  resultado: MtatResult
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

// ── Admin ─────────────────────────────────────────────────────────────────────

export interface AdminStats {
  total_users: number
  total_projects: number
  total_calculations: number
  calculations_today: number
  calculations_week: number
}

export interface DailyCount {
  date: string
  count: number
}

export interface UsageCharts {
  calcs_last_14d: DailyCount[]
  users_last_14d: DailyCount[]
  calcs_by_sistema: Record<string, number>
}

export interface AdminUser {
  id: string
  email: string
  full_name?: string
  is_active: boolean
  is_admin: boolean
  created_at: string
  project_count: number
}

// ── Protections ──────────────────────────────────────────────────────────────

export interface TermomagneticoRecomendado {
  in_a: number
  curva: string
  icu_ka: number
  tipo: string
  descripcion: string
  cumple_ric: boolean
  advertencias: string[]
}

export interface DiferencialRecomendado {
  in_a: number
  i_delta_n_ma: number
  tipo_rcd: string
  num_polos: number
  descripcion: string
  advertencias: string[]
}

export interface ProteccionRecomendada {
  termomagnetico: TermomagneticoRecomendado
  diferencial: DiferencialRecomendado
  verificacion_ric: Record<string, string>
  cumple: boolean
}

// ── Demand Summary ────────────────────────────────────────────────────────────

export interface CircuitoResumen {
  nombre?: string
  sistema: string
  tension_v: number
  potencia_kw: number
  demanda_kw: number
  potencia_kva: number
  i_diseno_a: number
  seccion_mm2: number
  cumple_ric: boolean
}

export interface DemandaSummary {
  proyecto_id: string
  proyecto_nombre: string
  total_circuitos: number
  circuitos_cumplen: number
  tasa_cumplimiento_pct: number
  potencia_instalada_kw: number
  demanda_maxima_kw: number
  demanda_maxima_kva: number
  factor_potencia_promedio: number
  corriente_empalme_a: number
  tension_empalme_v: number
  sistema_predominante: string
  seccion_max_mm2: number
  seccion_promedio_mm2: number
  circuitos: CircuitoResumen[]
}

// ── Profile ───────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  is_admin: boolean
}

export interface ProfileUpdate {
  full_name?: string
  current_password?: string
  new_password?: string
}

// ── Share ─────────────────────────────────────────────────────────────────────

export interface ShareResponse {
  share_token: string
  share_url: string
}

export interface PublicCalculation {
  id: string
  name?: string
  sistema: string
  tension_v: number
  potencia_kw: number
  seccion_mm2: number
  cumple_ric: boolean
  input_data: Record<string, unknown>
  result_data: Record<string, unknown>
  project_name?: string
  created_at: string
}

// ── Voltage Drop Tree ─────────────────────────────────────────────────────────

export interface TramoInput {
  nombre: string
  sistema: string
  tension_v: number
  potencia_kw: number
  factor_potencia: number
  longitud_m: number
  seccion_mm2: number
  material: string
  tipo_circuito: string
}

export interface VoltageDropTreeInput {
  tramos: TramoInput[]
  tension_origen_v: number
}

export interface TramoResult {
  nombre: string
  i_a: number
  caida_v: number
  caida_pct: number
  caida_acumulada_v: number
  caida_acumulada_pct: number
  tension_final_v: number
  limite_pct: number
  cumple: boolean
}

export interface VoltageDropTreeResult {
  tramos: TramoResult[]
  caida_total_pct: number
  cumple_total: boolean
  advertencias: string[]
}

// ── Conductor Catalog ─────────────────────────────────────────────────────────

export interface Conductor {
  id: string
  proveedor?: string
  tipo?: string
  calibre_awg?: string
  seccion_mm2?: number
  material?: string
  resistencia_dc_20?: number
  i_max_ducto?: number
  i_max_aire?: number
  diametro_ext_mm?: number
  peso_kg_km?: number
  tension_nom_v?: number
  temp_max_c?: number
  norma_ref?: string
  certificacion_sec: boolean
  activo: boolean
  version_catalogo?: string
}

// ── Power Factor (Banco de Condensadores) ────────────────────────────────────

export interface PowerFactorInput {
  potencia_kw: number
  fp_actual: number
  fp_objetivo: number
  tension_v: number
  sistema: string
  frecuencia_hz: number
  horas_mensuales: number
  tarifa_kvarh: number
}

export interface PowerFactorResult {
  fp_actual: number
  fp_objetivo: number
  potencia_activa_kw: number
  potencia_reactiva_antes_kvar: number
  potencia_reactiva_despues_kvar: number
  q_compensar_kvar: number
  q_banco_standard_kvar: number
  corriente_antes_a: number
  corriente_despues_a: number
  reduccion_corriente_pct: number
  capacitancia_por_fase_uf: number
  ahorro_mensual_usd: number
  ahorro_anual_usd: number
  advertencias: string[]
}

// ── Grounding (Puesta a Tierra) ───────────────────────────────────────────────

export interface GroundingInput {
  tipo_electrodo: string
  resistividad_suelo: number
  longitud_varilla_m: number
  diametro_varilla_m: number
  numero_varillas: number
  espaciado_varillas_m: number
  longitud_cable_m: number
  diametro_cable_m: number
  profundidad_m: number
  ancho_malla_m: number
  largo_malla_m: number
  tipo_instalacion: string
  corriente_disparo_a?: number
}

export interface GroundingResult {
  tipo_electrodo: string
  resistencia_calculada_ohm: number
  resistencia_requerida_ohm: number
  cumple: boolean
  descripcion_electrodo: string
  recomendacion: string
  advertencias: string[]
}

// ── Lighting / Iluminación (NCh 2/1984) ──────────────────────────────────────

export interface LightingInput {
  largo_m: number
  ancho_m: number
  altura_m: number
  altura_trabajo_m: number
  flujo_luminaria_lm: number
  tipo_recinto: string
  iluminancia_objetivo_lux?: number
  reflectancia_techo: number
  reflectancia_paredes: number
  factor_mantenimiento: number
  potencia_luminaria_w: number
}

export interface LightingResult {
  iluminancia_objetivo_lux: number
  iluminancia_real_lux: number
  area_m2: number
  indice_local_k: number
  coeficiente_utilizacion: number
  factor_mantenimiento: number
  numero_luminarias: number
  filas: number
  columnas: number
  separacion_largo_m: number
  separacion_ancho_m: number
  potencia_instalada_w: number
  densidad_potencia_wm2: number
  cumple_nch2: boolean
  nivel_minimo_nch2_lux: number
  advertencias: string[]
}
