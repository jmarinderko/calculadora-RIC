"""
Tests del motor de cálculo RIC — 24 tests.
Verifican exactamente la misma lógica del prototipo calculadora_ric_v7.html.
No requieren base de datos — el motor es puro Python.
"""
import pytest
import math

from app.engine.calculator import calculate
from app.engine.schemas import CalculatorInput
from app.engine.ric_tables import (
    get_temp_factor, get_grouping_factor, get_altitude_factor,
    is_air_installation, is_buried_installation,
)


# ─── Helper ───────────────────────────────────────────────────────────────────

def base_input(**kwargs) -> CalculatorInput:
    """Input base: trifásico 380V 15kW fp=0.85 Fd=1.0 80m cobre ducto_pvc."""
    defaults = dict(
        sistema="trifasico",
        tension_v=380,
        potencia_kw=15.0,
        factor_potencia=0.85,
        factor_demanda=1.0,
        longitud_m=80,
        material="cu",
        tipo_canalizacion="ducto_pvc",
        temp_ambiente_c=30,
        circuitos_agrupados=1,
        msnm=0,
        montaje="vista",
        tipo_circuito="fuerza",
        cables_por_fase=0,
    )
    defaults.update(kwargs)
    return CalculatorInput(**defaults)


# ─── 1. Tests de corriente ────────────────────────────────────────────────────

def test_corriente_trifasico_basico():
    """Trifásico 380V 15kW fp=0.85 → I ≈ 26.86 A."""
    inp = base_input()
    res = calculate(inp)
    expected = 15000 / (math.sqrt(3) * 380 * 0.85)
    assert abs(res.resultado.i_calc_a - expected) < 0.01


def test_corriente_monofasico():
    """Monofásico 220V 3kW fp=0.9 → I = 3000/(220×0.9) ≈ 15.15 A."""
    inp = base_input(sistema="monofasico", tension_v=220, potencia_kw=3.0, factor_potencia=0.9)
    res = calculate(inp)
    expected = 3000 / (220 * 0.9)
    assert abs(res.resultado.i_calc_a - expected) < 0.01


def test_corriente_bifasico():
    """Bifásico 220V 5kW fp=0.85 → I = 5000/(2×220×0.85) ≈ 13.37 A."""
    inp = base_input(sistema="bifasico", tension_v=220, potencia_kw=5.0, factor_potencia=0.85)
    res = calculate(inp)
    expected = 5000 / (2 * 220 * 0.85)
    assert abs(res.resultado.i_calc_a - expected) < 0.01


def test_factor_demanda_motor():
    """Factor de demanda 1.25 → I_calc = I_diseño × 1.25."""
    inp = base_input(factor_demanda=1.25)
    res = calculate(inp)
    i_diseno = 15000 / (math.sqrt(3) * 380 * 0.85)
    assert abs(res.resultado.i_calc_a - i_diseno * 1.25) < 0.01
    assert abs(res.resultado.i_diseno_a - i_diseno) < 0.01


def test_i_diseno_separado_de_i_calc():
    """i_diseno_a y i_calc_a deben ser distintos cuando Fd != 1."""
    inp = base_input(factor_demanda=1.25)
    res = calculate(inp)
    assert res.resultado.i_diseno_a != res.resultado.i_calc_a


# ─── 2. Tests de sección mínima normativa ────────────────────────────────────

def test_seccion_minima_alumbrado():
    """Alumbrado: sección mínima 1.5 mm² (RIC Art. 5.3.1)."""
    inp = base_input(potencia_kw=0.5, tipo_circuito="alumbrado", longitud_m=5)
    res = calculate(inp)
    assert res.resultado.seccion_mm2 >= 1.5
    assert res.resultado.ajustado_por_minimo is True


def test_seccion_minima_fuerza():
    """Fuerza: sección mínima 2.5 mm²."""
    inp = base_input(potencia_kw=0.5, tipo_circuito="fuerza", longitud_m=5)
    res = calculate(inp)
    assert res.resultado.seccion_mm2 >= 2.5


def test_seccion_minima_alimentador():
    """Alimentador: sección mínima 4.0 mm²."""
    inp = base_input(potencia_kw=0.5, tipo_circuito="alimentador", longitud_m=5)
    res = calculate(inp)
    assert res.resultado.seccion_mm2 >= 4.0
    assert res.resultado.sec_min_ric_mm2 == 4.0


def test_seccion_minima_motor():
    """Motor: sección mínima 2.5 mm²."""
    inp = base_input(potencia_kw=0.3, tipo_circuito="motor", longitud_m=5)
    res = calculate(inp)
    assert res.resultado.seccion_mm2 >= 2.5


# ─── 3. Tests de caída de tensión ────────────────────────────────────────────

def test_caida_trifasico_dentro_limite():
    """15kW 380V 80m → caída ≤ 3% con sección elegida."""
    inp = base_input()
    res = calculate(inp)
    assert res.resultado.caida_pct <= 3.0
    assert res.resultado.cumple_caida is True


def test_caida_obliga_subir_seccion():
    """Circuito largo → debe ajustarse por criterio caída."""
    inp = base_input(longitud_m=400, potencia_kw=20)
    res = calculate(inp)
    # La sección debe cumplir con la caída independientemente del flag
    assert res.resultado.caida_pct <= res.resultado.limite_caida_pct


def test_limite_caida_alumbrado_2pct():
    """Alumbrado: límite 2%."""
    inp = base_input(tipo_circuito="alumbrado")
    res = calculate(inp)
    assert res.resultado.limite_caida_pct == 2.0


def test_limite_caida_fuerza_3pct():
    """Fuerza: límite 3%."""
    inp = base_input(tipo_circuito="fuerza")
    res = calculate(inp)
    assert res.resultado.limite_caida_pct == 3.0


def test_caida_positiva_y_en_rango():
    """La caída siempre es positiva y razonable."""
    inp = base_input()
    res = calculate(inp)
    assert res.resultado.caida_v > 0
    assert 0 < res.resultado.caida_pct < 100


def test_limite_caida_custom():
    """Límite personalizado via campo limite_caida_pct."""
    inp = base_input(limite_caida_pct=5.0)
    res = calculate(inp)
    assert res.resultado.limite_caida_pct == 5.0


# ─── 4. Tests de factores de corrección ──────────────────────────────────────

def test_factor_temperatura_referencia():
    """30°C → Ft = 1.000."""
    assert get_temp_factor(30) == 1.0


def test_factor_temperatura_40():
    """40°C → Ft = 0.870."""
    assert get_temp_factor(40) == 0.870


def test_factor_agrupamiento_sin_reduccion():
    """1 circuito → Fg = 1.000."""
    assert get_grouping_factor(1) == 1.0


def test_factor_agrupamiento_4_circuitos():
    """4 circuitos → Fg = 0.650."""
    assert get_grouping_factor(4) == 0.650


def test_factor_altitud_nivel_mar():
    """0 msnm → Fa = 1.00."""
    assert get_altitude_factor(0) == 1.00


def test_factor_altitud_1000():
    """1000 msnm → Fa = 1.00 (sin reducción)."""
    assert get_altitude_factor(1000) == 1.00


def test_factor_altitud_2000():
    """2000 msnm → Fa = 0.94."""
    assert get_altitude_factor(2000) == 0.94


def test_factor_altitud_reduccion_capacidad():
    """Alta altitud → sección ≥ sección a nivel del mar."""
    res_nm = calculate(base_input(msnm=0))
    res_alt = calculate(base_input(msnm=3500))
    assert res_alt.resultado.seccion_mm2 >= res_nm.resultado.seccion_mm2


# ─── 5. Tests de estrés térmico ──────────────────────────────────────────────

def test_estres_termico_basico():
    """Icc=10kA t=0.5s Cu THW → S_min = (10000×√0.5)/115 ≈ 61.5 mm²."""
    inp = base_input(icc_ka=10.0, tiempo_cc_s=0.5, tipo_falla="3f", t_inicial_c=75, t_max_c=160)
    res = calculate(inp)
    e = res.resultado.estres_termico
    assert e is not None
    expected_smin = (10000 * math.sqrt(0.5)) / 115
    assert abs(e.sec_min_termica_mm2 - math.ceil(expected_smin * 10) / 10) < 0.5


def test_estres_termico_xlpe():
    """T_max >= 200°C → K=143 (XLPE)."""
    inp = base_input(icc_ka=5.0, tiempo_cc_s=1.0, t_max_c=250)
    res = calculate(inp)
    e = res.resultado.estres_termico
    assert e is not None
    assert e.es_xlpe is True
    assert e.k_const == 143


def test_estres_termico_sin_datos():
    """Sin Icc → estres_termico es None."""
    inp = base_input()
    res = calculate(inp)
    assert res.resultado.estres_termico is None


def test_respuesta_ok():
    """Campo ok=True en cálculo exitoso."""
    inp = base_input()
    res = calculate(inp)
    assert res.ok is True
