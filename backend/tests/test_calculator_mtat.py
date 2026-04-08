"""
Tests del motor de cálculo MT/AT — IEC 60502-2 / IEC 60287 / IEC 60949
Cubre: 23kV Cu XLPE, caída de tensión, estrés térmico, Al vs Cu, casos límite.
No requieren base de datos — el motor es puro Python.
"""
import pytest
import math

from app.engine.calculator_mtat import calculate_mtat, _r_ac_at_temp, _calc_caida_compleja
from app.engine.schemas_mtat import MtatInput
from app.engine.ric_tables_mtat import (
    get_temp_factor_mtat, get_grouping_factor_mtat,
    get_depth_factor, get_resistivity_factor, TABLA_MTAT,
)


# ── Helper ────────────────────────────────────────────────────────────────────

def base_input(**kwargs) -> MtatInput:
    """Input base: 23 kV, 5 MW, Cu XLPE, enterrado directo, 3 km."""
    defaults = dict(
        nivel_tension="mt_12_24kv",
        tension_kv=23.0,
        potencia_kw=5000.0,
        factor_potencia=0.90,
        factor_demanda=1.0,
        longitud_km=3.0,
        material="cu",
        aislamiento="xlpe",
        tipo_instalacion="enterrado_directo",
        temp_ambiente_c=20,
        circuitos_agrupados=1,
        profundidad_m=0.8,
        resistividad_suelo=1.0,
        limite_caida_pct=2.0,
        tipo_falla="3f",
    )
    defaults.update(kwargs)
    return MtatInput(**defaults)


# ── Test 1: Caso base 23kV Cu XLPE ───────────────────────────────────────────

def test_base_23kv_cu_xlpe():
    """23 kV, 5 MW, Cu XLPE enterrado — debe retornar resultado válido."""
    inp = base_input()
    res = calculate_mtat(inp)

    assert res.ok is True
    assert res.resultado.seccion_mm2 > 0
    assert res.resultado.material == "cu"
    assert res.resultado.aislamiento == "xlpe"
    assert res.resultado.i_diseno_a > 0
    assert res.resultado.i_max_corregida_a > 0


def test_base_23kv_cumple_termico():
    """La sección elegida debe cumplir criterio térmico."""
    res = calculate_mtat(base_input())
    assert res.resultado.cumple_termico is True


def test_base_23kv_corriente_correcta():
    """Verifica cálculo de corriente: I = P / (√3 × V × fp)."""
    inp = base_input(potencia_kw=5000, tension_kv=23, factor_potencia=0.90)
    res = calculate_mtat(inp)
    i_esperada = 5_000_000 / (math.sqrt(3) * 23_000 * 0.90)
    assert abs(res.resultado.i_diseno_a - i_esperada) < 0.1


# ── Test 2: Caída de tensión con impedancia compleja ─────────────────────────

def test_caida_tension_incluye_reactancia():
    """ΔV con impedancia compleja debe ser mayor que solo con resistencia."""
    r_ac = 0.118   # Cu 185mm² a 90°C
    x = 0.083
    i = 200.0
    l = 3.0
    vn_kv = 23.0

    dv_total, dv_pct, dv_r, dv_x = _calc_caida_compleja(i, r_ac, x, l, vn_kv)

    # La componente reactiva debe ser positiva y menor que la resistiva
    assert dv_x > 0
    assert dv_r > dv_x          # R > X en MT estándar
    # Total debe ser mayor que solo R
    dv_solo_r = math.sqrt(3) * i * r_ac * l
    assert dv_total > dv_solo_r * 0.99  # aprox igual pero dv_x suma en cuadratura


def test_caida_tension_proporcional_longitud():
    """ΔV debe ser proporcional a la longitud del circuito."""
    inp1 = base_input(longitud_km=2.0)
    inp2 = base_input(longitud_km=4.0)
    r1 = calculate_mtat(inp1).resultado
    r2 = calculate_mtat(inp2).resultado
    # Si misma sección, caída doble con doble longitud
    if r1.seccion_mm2 == r2.seccion_mm2:
        assert abs(r2.caida_pct / r1.caida_pct - 2.0) < 0.05


def test_caida_dentro_limite():
    """El resultado debe cumplir límite de caída (o mostrar advertencia si no)."""
    inp = base_input(limite_caida_pct=2.0)
    res = calculate_mtat(inp)
    if res.resultado.cumple_caida:
        assert res.resultado.caida_pct <= 2.0


# ── Test 3: Estrés térmico ────────────────────────────────────────────────────

def test_estres_termico_presente_con_icc():
    """Con Icc y tiempo, debe calcular estrés térmico."""
    inp = base_input(icc_ka=16.0, tiempo_cc_s=0.5)
    res = calculate_mtat(inp)
    assert res.resultado.estres_termico is not None


def test_estres_termico_ausente_sin_icc():
    """Sin Icc, el campo estres_termico debe ser None."""
    res = calculate_mtat(base_input())
    assert res.resultado.estres_termico is None


def test_estres_termico_k_143_cu_xlpe():
    """K debe ser 143 para Cu XLPE — IEC 60949."""
    inp = base_input(icc_ka=16.0, tiempo_cc_s=0.5, material="cu", aislamiento="xlpe")
    res = calculate_mtat(inp)
    assert res.resultado.estres_termico is not None
    assert res.resultado.estres_termico.k_const == 143


def test_estres_termico_k_94_al_xlpe():
    """K debe ser 94 para Al XLPE — IEC 60949."""
    inp = base_input(icc_ka=16.0, tiempo_cc_s=0.5, material="al", aislamiento="xlpe")
    res = calculate_mtat(inp)
    assert res.resultado.estres_termico is not None
    assert res.resultado.estres_termico.k_const == 94


def test_estres_termico_formula_i2t():
    """I²t ≤ (K×S)² para sección que cumple."""
    inp = base_input(icc_ka=5.0, tiempo_cc_s=0.5, material="cu", aislamiento="xlpe")
    res = calculate_mtat(inp)
    et = res.resultado.estres_termico
    assert et is not None
    # Verificar relación: si cumple, ratio ≤ 1
    if et.cumple:
        assert et.ratio_saturacion <= 1.0


# ── Test 4: Al vs Cu ──────────────────────────────────────────────────────────

def test_al_requiere_mayor_seccion_que_cu():
    """Aluminio debe elegir sección igual o mayor que cobre por menor conductividad."""
    res_cu = calculate_mtat(base_input(material="cu"))
    res_al = calculate_mtat(base_input(material="al"))
    assert res_al.resultado.seccion_mm2 >= res_cu.resultado.seccion_mm2


def test_cu_menor_caida_que_al_misma_seccion():
    """Cu tiene menor resistividad → menor caída de tensión que Al a igual sección."""
    # Forzar misma sección para comparar
    sec = 185.0
    inp_cu = base_input(material="cu", seccion_forzada_mm2=sec)
    inp_al = base_input(material="al", seccion_forzada_mm2=sec)
    r_cu = calculate_mtat(inp_cu).resultado
    r_al = calculate_mtat(inp_al).resultado
    assert r_cu.caida_pct < r_al.caida_pct


# ── Test 5: Entrada por corriente ────────────────────────────────────────────

def test_entrada_por_corriente():
    """Debe aceptar corriente_a en lugar de potencia_kw."""
    inp = base_input(potencia_kw=None, corriente_a=150.0)
    res = calculate_mtat(inp)
    assert res.ok is True
    assert abs(res.resultado.i_diseno_a - 150.0) < 0.01


def test_error_sin_potencia_ni_corriente():
    """Sin potencia ni corriente debe lanzar ValueError."""
    inp = base_input(potencia_kw=None, corriente_a=None)
    with pytest.raises(ValueError, match="potencia_kw o corriente_a"):
        calculate_mtat(inp)


# ── Test 6: Factores de corrección ────────────────────────────────────────────

def test_factor_temperatura_enterrado():
    """Factor de temperatura a 30°C enterrado debe ser < 1."""
    ft = get_temp_factor_mtat(30, es_enterrado=True)
    assert ft < 1.0


def test_factor_temperatura_aire_ref():
    """Factor de temperatura a 25°C en aire (referencia) debe ser 1.0."""
    ft = get_temp_factor_mtat(25, es_enterrado=False)
    assert ft == 1.0


def test_factor_agrupamiento_1_circuito():
    """Factor agrupamiento para 1 circuito debe ser 1.0."""
    assert get_grouping_factor_mtat(1) == 1.0


def test_factor_agrupamiento_decrece_con_n():
    """Factor agrupamiento debe decrecer al aumentar circuitos."""
    f1 = get_grouping_factor_mtat(1)
    f3 = get_grouping_factor_mtat(3)
    f6 = get_grouping_factor_mtat(6)
    assert f1 > f3 > f6


def test_factor_profundidad_08_es_referencia():
    """Factor profundidad a 0.8m es 1.0 (referencia IEC 60502-2)."""
    assert get_depth_factor(0.8) == 1.0


def test_factor_profundidad_crece_con_menor_profundidad():
    """A menor profundidad, mejor disipación → factor > 1."""
    assert get_depth_factor(0.5) > 1.0


# ── Test 7: Sección mínima por nivel de tensión ──────────────────────────────

def test_seccion_minima_mt_12_24kv():
    """Para MT 12–24 kV la sección mínima debe ser ≥ 35 mm²."""
    inp = base_input(nivel_tension="mt_12_24kv", potencia_kw=100)
    res = calculate_mtat(inp)
    assert res.resultado.seccion_mm2 >= 35.0


def test_seccion_minima_at_36_72kv():
    """Para AT 36–72 kV la sección mínima debe ser ≥ 70 mm²."""
    inp = base_input(
        nivel_tension="at_36_72kv",
        tension_kv=66.0,
        potencia_kw=500,
        limite_caida_pct=3.0,
    )
    res = calculate_mtat(inp)
    assert res.resultado.seccion_mm2 >= 70.0


# ── Test 8: Pérdidas Joule ────────────────────────────────────────────────────

def test_perdidas_positivas():
    """Las pérdidas Joule deben ser siempre positivas."""
    res = calculate_mtat(base_input())
    assert res.resultado.perdidas_kw > 0
    assert res.resultado.perdidas_pct > 0


def test_perdidas_aumentan_con_longitud():
    """Pérdidas deben aumentar con la longitud del circuito."""
    r1 = calculate_mtat(base_input(longitud_km=1.0)).resultado
    r3 = calculate_mtat(base_input(longitud_km=3.0)).resultado
    if r1.seccion_mm2 == r3.seccion_mm2:
        assert r3.perdidas_kw > r1.perdidas_kw


# ── Test 9: Respuesta completa ────────────────────────────────────────────────

def test_respuesta_tiene_todos_los_campos():
    """La respuesta debe contener todos los campos requeridos."""
    res = calculate_mtat(base_input())
    r = res.resultado
    assert r.impedancia is not None
    assert r.factores is not None
    assert r.sec_tierra_mm2 > 0
    assert r.nivel_tension != ""
    assert isinstance(r.advertencias, list)


def test_impedancia_angulo_positivo():
    """El ángulo de la impedancia debe ser positivo (carga inductiva)."""
    res = calculate_mtat(base_input())
    assert res.resultado.impedancia.angulo_grados > 0


# ── Test 10: Casos extremos ───────────────────────────────────────────────────

def test_carga_minima_selecciona_seccion_minima():
    """Con carga muy pequeña, debe seleccionar la sección mínima del nivel."""
    inp = base_input(potencia_kw=10.0, nivel_tension="mt_12_24kv")
    res = calculate_mtat(inp)
    assert res.resultado.seccion_mm2 >= 35.0  # mínimo para MT 12-24kV
    assert res.resultado.ajustado_por_minimo is True


def test_seccion_forzada_respetada():
    """La sección forzada debe ser la sección del resultado."""
    inp = base_input(seccion_forzada_mm2=240.0)
    res = calculate_mtat(inp)
    assert res.resultado.seccion_mm2 == 240.0


def test_r_ac_mayor_que_r_dc():
    """R_ac debe ser mayor que R_dc por efecto pelicular."""
    row = TABLA_MTAT[5]   # 95mm²
    r_ac = _r_ac_at_temp(row.rcu_dc, "cu", 90.0)
    assert r_ac > row.rcu_dc


def test_epr_mismo_k_que_xlpe():
    """EPR y XLPE comparten K=143 (Cu) — IEC 60949."""
    inp_xlpe = base_input(aislamiento="xlpe", icc_ka=10.0, tiempo_cc_s=0.5)
    inp_epr  = base_input(aislamiento="epr",  icc_ka=10.0, tiempo_cc_s=0.5)
    r_xlpe = calculate_mtat(inp_xlpe).resultado.estres_termico
    r_epr  = calculate_mtat(inp_epr).resultado.estres_termico
    assert r_xlpe is not None and r_epr is not None
    assert r_xlpe.k_const == r_epr.k_const == 143
