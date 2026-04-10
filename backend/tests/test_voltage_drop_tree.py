"""
Tests para el motor de cálculo de árbol de caída de tensión acumulada.
Issue #26 — RIC Art. 5.5.4
"""
import math
import pytest
from app.engine.voltage_drop_tree import (
    TramoInput, VoltageDropTreeInput,
    calcular_arbol_caida, RHO, LIMITE_TOTAL,
)


def make_tramo(**kwargs) -> dict:
    defaults = {
        "nombre": "Tramo test",
        "sistema": "monofasico",
        "tension_v": 220.0,
        "potencia_kw": 2.0,
        "factor_potencia": 0.85,
        "longitud_m": 20.0,
        "seccion_mm2": 2.5,
        "material": "cu",
        "tipo_circuito": "fuerza",
    }
    defaults.update(kwargs)
    return defaults


# ── Test 1: caída monofásica básica ─────────────────────────────────────────
def test_caida_monofasico_basico():
    """Verifica fórmula monofásica: ΔV = 2·I·(ρ/S)·L"""
    tension = 220.0
    potencia_kw = 2.0
    fp = 0.85
    longitud = 30.0
    seccion = 2.5
    rho = RHO["cu"]

    inp = VoltageDropTreeInput(
        tramos=[TramoInput(**make_tramo(
            longitud_m=longitud, seccion_mm2=seccion, tension_v=tension,
            potencia_kw=potencia_kw, factor_potencia=fp,
        ))],
        tension_origen_v=tension,
    )
    result = calcular_arbol_caida(inp)
    t = result.tramos[0]

    # Corriente esperada
    i_esperada = (potencia_kw * 1000) / (tension * fp)
    # Caída esperada
    r_ohm_per_m = rho / seccion
    caida_v_esperada = 2 * i_esperada * r_ohm_per_m * longitud
    caida_pct_esperada = (caida_v_esperada / tension) * 100

    assert abs(t.i_a - i_esperada) < 0.001
    assert abs(t.caida_v - caida_v_esperada) < 0.001
    assert abs(t.caida_pct - caida_pct_esperada) < 0.001


# ── Test 2: caída trifásica básica ──────────────────────────────────────────
def test_caida_trifasico_basico():
    """Verifica fórmula trifásica: ΔV = √3·I·(ρ/S)·L"""
    tension = 380.0
    potencia_kw = 10.0
    fp = 0.9
    longitud = 50.0
    seccion = 6.0
    rho = RHO["cu"]

    inp = VoltageDropTreeInput(
        tramos=[TramoInput(**make_tramo(
            sistema="trifasico",
            tension_v=tension,
            potencia_kw=potencia_kw,
            factor_potencia=fp,
            longitud_m=longitud,
            seccion_mm2=seccion,
        ))],
        tension_origen_v=tension,
    )
    result = calcular_arbol_caida(inp)
    t = result.tramos[0]

    i_esperada = (potencia_kw * 1000) / (math.sqrt(3) * tension * fp)
    r_ohm_per_m = rho / seccion
    caida_v_esperada = math.sqrt(3) * i_esperada * r_ohm_per_m * longitud
    caida_pct_esperada = (caida_v_esperada / tension) * 100

    assert abs(t.i_a - i_esperada) < 0.001
    assert abs(t.caida_v - caida_v_esperada) < 0.001
    assert abs(t.caida_pct - caida_pct_esperada) < 0.001


# ── Test 3: caída acumulada con dos tramos ──────────────────────────────────
def test_caida_acumulada_dos_tramos():
    """La caída acumulada del segundo tramo debe ser la suma de las caídas individuales."""
    inp = VoltageDropTreeInput(
        tramos=[
            TramoInput(**make_tramo(nombre="T1", longitud_m=20.0, seccion_mm2=4.0, potencia_kw=3.0)),
            TramoInput(**make_tramo(nombre="T2", longitud_m=15.0, seccion_mm2=2.5, potencia_kw=1.5)),
        ],
        tension_origen_v=220.0,
    )
    result = calcular_arbol_caida(inp)
    t1 = result.tramos[0]
    t2 = result.tramos[1]

    # La caída acumulada del T2 debe ser la suma de caídas individuales (en V)
    suma_caidas_v = t1.caida_v + t2.caida_v
    assert abs(t2.caida_acumulada_v - suma_caidas_v) < 0.001

    # La caída acumulada del T1 debe ser igual a su propia caída
    assert abs(t1.caida_acumulada_v - t1.caida_v) < 0.001


# ── Test 4: tres tramos en serie ─────────────────────────────────────────────
def test_tres_tramos_en_serie():
    """Verifica que la caída_acumulada_pct del último tramo sea la suma de los tres."""
    tension = 220.0
    inp = VoltageDropTreeInput(
        tramos=[
            TramoInput(**make_tramo(nombre="A1", longitud_m=10.0, seccion_mm2=6.0, potencia_kw=2.0)),
            TramoInput(**make_tramo(nombre="A2", longitud_m=10.0, seccion_mm2=4.0, potencia_kw=2.0)),
            TramoInput(**make_tramo(nombre="A3", longitud_m=10.0, seccion_mm2=2.5, potencia_kw=2.0)),
        ],
        tension_origen_v=tension,
    )
    result = calcular_arbol_caida(inp)
    tramos = result.tramos

    suma_caidas_v = sum(t.caida_v for t in tramos)
    assert abs(tramos[2].caida_acumulada_v - suma_caidas_v) < 0.001
    assert abs(tramos[2].caida_acumulada_pct - (suma_caidas_v / tension) * 100) < 0.001


# ── Test 5: cumple RIC dentro de límite ─────────────────────────────────────
def test_cumple_ric_dentro_limite():
    """Un tramo corto con buena sección debe cumplir el límite de 3%."""
    inp = VoltageDropTreeInput(
        tramos=[TramoInput(**make_tramo(
            longitud_m=5.0, seccion_mm2=6.0, potencia_kw=1.0,
            tipo_circuito="fuerza",
        ))],
        tension_origen_v=220.0,
    )
    result = calcular_arbol_caida(inp)
    t = result.tramos[0]
    assert t.caida_acumulada_pct < 3.0
    assert t.cumple is True
    assert result.cumple_total is True


# ── Test 6: no cumple RIC — supera límite total ──────────────────────────────
def test_no_cumple_ric_supera_limite():
    """Un tramo muy largo con sección pequeña debe superar el límite total del 5%."""
    inp = VoltageDropTreeInput(
        tramos=[TramoInput(**make_tramo(
            longitud_m=300.0, seccion_mm2=1.5, potencia_kw=3.0,
            tipo_circuito="fuerza",
        ))],
        tension_origen_v=220.0,
    )
    result = calcular_arbol_caida(inp)
    t = result.tramos[0]
    assert t.caida_acumulada_pct > LIMITE_TOTAL
    assert t.cumple is False
    assert result.cumple_total is False
    assert len(result.advertencias) > 0


# ── Test 7: tensión final decrece progresivamente ───────────────────────────
def test_tension_final_decrece():
    """La tensión al final de cada tramo debe ser estrictamente menor que la del tramo anterior."""
    inp = VoltageDropTreeInput(
        tramos=[
            TramoInput(**make_tramo(nombre="T1", longitud_m=20.0, potencia_kw=2.0)),
            TramoInput(**make_tramo(nombre="T2", longitud_m=20.0, potencia_kw=2.0)),
            TramoInput(**make_tramo(nombre="T3", longitud_m=20.0, potencia_kw=2.0)),
        ],
        tension_origen_v=220.0,
    )
    result = calcular_arbol_caida(inp)
    tensiones = [t.tension_final_v for t in result.tramos]
    # Cada tensión final debe ser menor que la anterior
    assert tensiones[0] < 220.0
    assert tensiones[1] < tensiones[0]
    assert tensiones[2] < tensiones[1]


# ── Test 8: aluminio tiene mayor caída que cobre ────────────────────────────
def test_aluminio_vs_cobre():
    """Con las mismas condiciones, el conductor de aluminio debe tener mayor caída que el de cobre."""
    base = dict(longitud_m=50.0, seccion_mm2=6.0, potencia_kw=3.0, tension_v=220.0, factor_potencia=0.85)

    inp_cu = VoltageDropTreeInput(
        tramos=[TramoInput(**make_tramo(**base, material="cu"))],
        tension_origen_v=220.0,
    )
    inp_al = VoltageDropTreeInput(
        tramos=[TramoInput(**make_tramo(**base, material="al"))],
        tension_origen_v=220.0,
    )
    result_cu = calcular_arbol_caida(inp_cu)
    result_al = calcular_arbol_caida(inp_al)

    assert result_al.tramos[0].caida_v > result_cu.tramos[0].caida_v
    assert result_al.tramos[0].caida_pct > result_cu.tramos[0].caida_pct
    # Relación esperada ≈ ρ_al / ρ_cu
    ratio = result_al.tramos[0].caida_v / result_cu.tramos[0].caida_v
    ratio_rho = RHO["al"] / RHO["cu"]
    assert abs(ratio - ratio_rho) < 0.01
