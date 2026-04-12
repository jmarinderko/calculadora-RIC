/**
 * Test de paridad: motor TypeScript vs Python.
 *
 * Los vectores en vectors.json fueron generados ejecutando el motor Python
 * (backend/app/engine/calculator.py) con los mismos inputs. Si algún test
 * falla, el motor TS diverge del Python.
 */
import { calculate } from '../calculator'
import type { CalculatorInput } from '../types'
import vectors from './vectors.json'

const TOLERANCE = 1e-3  // Tolerancia para floats (0.1%)

function closeTo(actual: number, expected: number, tol = TOLERANCE): boolean {
  return Math.abs(actual - expected) <= Math.max(tol, Math.abs(expected) * tol)
}

describe('RIC Engine parity: TypeScript vs Python', () => {
  for (const v of vectors) {
    it(v.name, () => {
      const inp: CalculatorInput = {
        sistema: v.input.sistema as any,
        tension_v: v.input.tension_v,
        potencia_kw: v.input.potencia_kw,
        factor_potencia: v.input.factor_potencia,
        factor_demanda: v.input.factor_demanda,
        longitud_m: v.input.longitud_m,
        material: v.input.material as any,
        tipo_canalizacion: v.input.tipo_canalizacion as any,
        temp_ambiente_c: v.input.temp_ambiente_c,
        circuitos_agrupados: v.input.circuitos_agrupados,
        msnm: v.input.msnm,
        montaje: v.input.montaje as any,
        tipo_circuito: v.input.tipo_circuito as any,
        cables_por_fase: v.input.cables_por_fase,
        tipo_falla: v.input.tipo_falla as any ?? '3f',
        t_inicial_c: v.input.t_inicial_c ?? 75,
        t_max_c: v.input.t_max_c ?? 160,
        icc_ka: (v.input as any).icc_ka ?? null,
        tiempo_cc_s: (v.input as any).tiempo_cc_s ?? null,
        limite_caida_pct: (v.input as any).limite_caida_pct ?? null,
        seccion_forzada_mm2: (v.input as any).seccion_forzada_mm2 ?? null,
      }

      const res = calculate(inp)
      const r = res.resultado
      const e = v.expected

      // Sección y calibre
      expect(r.seccion_mm2).toBe(e.seccion_mm2)
      expect(r.calibre_awg).toBe(e.calibre_awg)
      expect(r.cables_por_fase).toBe(e.cables_por_fase)

      // Corrientes
      expect(closeTo(r.i_diseno_a, e.i_diseno_a)).toBe(true)
      expect(closeTo(r.i_calc_a, e.i_calc_a)).toBe(true)
      expect(closeTo(r.i_req_a, e.i_req_a)).toBe(true)
      expect(closeTo(r.i_max_corregida_a, e.i_max_corregida_a)).toBe(true)

      // Caída de tensión
      expect(closeTo(r.caida_pct, e.caida_pct)).toBe(true)
      expect(r.limite_caida_pct).toBe(e.limite_caida_pct)

      // Cumplimiento
      expect(r.cumple_termico).toBe(e.cumple_termico)
      expect(r.cumple_caida).toBe(e.cumple_caida)
      expect(r.cumple).toBe(e.cumple)

      // Factores
      expect(r.ft).toBe(e.ft)
      expect(r.fg).toBe(e.fg)
      expect(r.fa).toBe(e.fa)
      expect(closeTo(r.factor_total, e.factor_total)).toBe(true)

      // Neutro y tierra
      expect(r.sec_neutro_mm2).toBe(e.sec_neutro_mm2)
      expect(r.sec_tierra_mm2).toBe(e.sec_tierra_mm2)

      // Ajustes
      expect(r.ajustado_por_minimo).toBe(e.ajustado_por_minimo)
      expect(r.ajustado_por_caida).toBe(e.ajustado_por_caida)

      // Protección
      if (e.proteccion_in_a != null) {
        expect(r.proteccion).not.toBeNull()
        expect(r.proteccion!.termomagnetico.in_a).toBe(e.proteccion_in_a)
        expect(r.proteccion!.termomagnetico.curva).toBe(e.proteccion_curva)
        expect(r.proteccion!.cumple).toBe(e.proteccion_cumple)
      }

      // Estrés térmico
      if (e.estres_cumple != null) {
        expect(r.estres_termico).not.toBeNull()
        expect(r.estres_termico!.cumple).toBe(e.estres_cumple)
        expect(r.estres_termico!.sec_min_termica_mm2).toBe(e.estres_sec_min)
      }
    })
  }
})
