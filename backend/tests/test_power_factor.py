"""
Tests del motor de corrección de Factor de Potencia — Banco de Condensadores.
Cubre: Q a compensar, banco estándar, corriente, FP ya bueno,
monofásico, ahorro tarifario, FP máximo, capacitancia.
No requieren base de datos — el motor es puro Python.
"""
import pytest
import math

from app.engine.power_factor import (
    PowerFactorInput,
    PowerFactorResult,
    calcular_correccion_fp,
    _seleccionar_banco_standard,
    POTENCIAS_STANDARD,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_input(**kwargs) -> PowerFactorInput:
    """Input base: 100 kW, FP=0.75 → objetivo 0.95, trifásico 380 V, 50 Hz."""
    defaults = dict(
        potencia_kw=100.0,
        fp_actual=0.75,
        fp_objetivo=0.95,
        tension_v=380.0,
        sistema="trifasico",
        frecuencia_hz=50.0,
        horas_mensuales=720.0,
        tarifa_kvarh=0.05,
    )
    defaults.update(kwargs)
    return PowerFactorInput(**defaults)


# ── Test 1: kVAR básico ───────────────────────────────────────────────────────

def test_kvar_basico():
    """P=100kW, fp_actual=0.75, fp_objetivo=0.95 → Q ≈ 53.6 kVAR."""
    res = calcular_correccion_fp(make_input())

    phi1 = math.acos(0.75)
    phi2 = math.acos(0.95)
    q_esperado = 100 * (math.tan(phi1) - math.tan(phi2))

    assert abs(res.q_compensar_kvar - q_esperado) < 0.01, (
        f"Q esperado ≈{q_esperado:.2f} kVAR, obtenido {res.q_compensar_kvar}"
    )
    # El valor calculado con las fórmulas exactas está alrededor de 55.3 kVAR
    assert 50.0 < res.q_compensar_kvar < 60.0


# ── Test 2: selección banco estándar ─────────────────────────────────────────

def test_banco_standard_seleccion():
    """Q≈53.6 kVAR → el banco estándar siguiente debe ser 60 kVAR."""
    res = calcular_correccion_fp(make_input())
    assert res.q_banco_standard_kvar == 60.0, (
        f"Banco esperado 60 kVAR, obtenido {res.q_banco_standard_kvar}"
    )


def test_seleccionar_banco_standard_exacto():
    """Función auxiliar: valor exacto debe seleccionar ese estándar."""
    assert _seleccionar_banco_standard(50.0) == 50.0
    assert _seleccionar_banco_standard(50.1) == 60.0
    assert _seleccionar_banco_standard(1.0) == 2.5
    assert _seleccionar_banco_standard(200.0) == 200.0
    # Mayor que el máximo → retorna el mayor disponible
    assert _seleccionar_banco_standard(250.0) == 200.0


# ── Test 3: reducción de corriente ───────────────────────────────────────────

def test_reduccion_corriente():
    """I_corregida debe ser menor que I_actual y la reducción > 0."""
    res = calcular_correccion_fp(make_input())

    assert res.corriente_despues_a < res.corriente_antes_a, (
        "La corriente corregida debe ser menor a la corriente antes"
    )
    assert res.reduccion_corriente_pct > 0, "La reducción de corriente debe ser positiva"

    # Verificar con fórmula manual
    sqrt3 = math.sqrt(3)
    i_antes_esp = 100 * 1000 / (sqrt3 * 380 * 0.75)
    i_despues_esp = 100 * 1000 / (sqrt3 * 380 * 0.95)
    reduccion_esp = (1 - i_despues_esp / i_antes_esp) * 100

    assert abs(res.corriente_antes_a - i_antes_esp) < 0.01
    assert abs(res.corriente_despues_a - i_despues_esp) < 0.01
    assert abs(res.reduccion_corriente_pct - reduccion_esp) < 0.01


# ── Test 4: FP actual ya es bueno ────────────────────────────────────────────

def test_fp_ya_bueno():
    """fp_actual=0.96 > fp_objetivo=0.95 → advertencia, Q=0, banco=0."""
    inp = make_input(fp_actual=0.96, fp_objetivo=0.95)
    res = calcular_correccion_fp(inp)

    assert res.q_compensar_kvar == 0.0, "Q debe ser 0 cuando FP actual >= objetivo"
    assert res.q_banco_standard_kvar == 0.0, "Banco debe ser 0"
    assert res.ahorro_mensual_usd == 0.0
    assert len(res.advertencias) > 0, "Debe haber al menos una advertencia"
    assert any("FP actual" in adv for adv in res.advertencias), (
        "Advertencia debe mencionar FP actual"
    )


def test_fp_igual_objetivo():
    """fp_actual == fp_objetivo → misma lógica que FP ya bueno."""
    inp = make_input(fp_actual=0.95, fp_objetivo=0.95)
    res = calcular_correccion_fp(inp)
    assert res.q_compensar_kvar == 0.0
    assert len(res.advertencias) > 0


# ── Test 5: sistema monofásico ───────────────────────────────────────────────

def test_monofasico():
    """Sistema monofásico: fórmula de corriente = P×1000 / (V × FP)."""
    inp = make_input(sistema="monofasico", tension_v=220.0)
    res = calcular_correccion_fp(inp)

    i_antes_esp = 100 * 1000 / (220.0 * 0.75)
    i_despues_esp = 100 * 1000 / (220.0 * 0.95)

    assert abs(res.corriente_antes_a - i_antes_esp) < 0.01, (
        f"Corriente monofásica esperada {i_antes_esp:.2f} A, obtenida {res.corriente_antes_a}"
    )
    assert abs(res.corriente_despues_a - i_despues_esp) < 0.01

    # Q a compensar es independiente del sistema
    phi1 = math.acos(0.75)
    phi2 = math.acos(0.95)
    q_esp = 100 * (math.tan(phi1) - math.tan(phi2))
    assert abs(res.q_compensar_kvar - q_esp) < 0.01


# ── Test 6: ahorro estimado ──────────────────────────────────────────────────

def test_ahorro_estimado():
    """Tarifa 0.05 USD/kVARh, 720 h/mes → verificar ahorro mensual y anual."""
    inp = make_input(tarifa_kvarh=0.05, horas_mensuales=720.0)
    res = calcular_correccion_fp(inp)

    # Ahorro = Q_compensar × horas × tarifa
    ahorro_esp = res.q_compensar_kvar * 720.0 * 0.05
    assert abs(res.ahorro_mensual_usd - ahorro_esp) < 0.05, (
        f"Ahorro mensual esperado {ahorro_esp:.2f}, obtenido {res.ahorro_mensual_usd}"
    )
    assert abs(res.ahorro_anual_usd - ahorro_esp * 12) < 0.60, (
        "Ahorro anual debe ser 12 × ahorro mensual"
    )
    # Con Q≈53.6 kVAR: 53.6 × 720 × 0.05 ≈ 1930 USD/mes
    assert res.ahorro_mensual_usd > 1000, "Ahorro mensual debe ser significativo"


# ── Test 7: FP objetivo máximo ───────────────────────────────────────────────

def test_fp_objetivo_maximo():
    """fp_objetivo=0.99 debe funcionar sin error."""
    inp = make_input(fp_actual=0.70, fp_objetivo=0.99)
    res = calcular_correccion_fp(inp)

    assert res.fp_objetivo == 0.99
    assert res.q_compensar_kvar > 0, "Q debe ser positivo con FP=0.99"
    # Banco estándar debe ser >= Q calculado
    assert res.q_banco_standard_kvar >= res.q_compensar_kvar


def test_fp_objetivo_sobre_limite_falla():
    """fp_objetivo > 0.99 debe lanzar ValueError."""
    with pytest.raises(Exception):
        PowerFactorInput(
            potencia_kw=100, fp_actual=0.75, fp_objetivo=1.0,
            tension_v=380, sistema="trifasico",
        )


# ── Test 8: capacitancia calculada ───────────────────────────────────────────

def test_capacitancia_calculada():
    """Trifásico 380V 50Hz → verificar unidades μF y valor razonable."""
    res = calcular_correccion_fp(make_input())

    # Fórmula: C = Q×1000 / (3 × 2π × f × V_fase²)  [F] → μF
    v_fase = 380 / math.sqrt(3)
    omega = 2 * math.pi * 50.0
    c_f_esp = (res.q_compensar_kvar * 1000) / (3 * omega * v_fase ** 2)
    c_uf_esp = c_f_esp * 1e6

    assert abs(res.capacitancia_por_fase_uf - c_uf_esp) < 0.01, (
        f"Capacitancia esperada {c_uf_esp:.3f} μF, obtenida {res.capacitancia_por_fase_uf}"
    )
    # Para 100 kW, 380V, Q≈53.6 kVAR → debe estar en rango razonable (decenas de μF)
    assert 100 < res.capacitancia_por_fase_uf < 10000, (
        f"Capacitancia fuera de rango: {res.capacitancia_por_fase_uf} μF"
    )


# ── Test adicional: potencias reactivas ──────────────────────────────────────

def test_potencias_reactivas():
    """Verificar potencias reactivas antes y después."""
    res = calcular_correccion_fp(make_input())

    phi1 = math.acos(0.75)
    phi2 = math.acos(0.95)
    kvar_antes_esp = 100 * math.tan(phi1)
    kvar_despues_esp = 100 * math.tan(phi2)

    assert abs(res.potencia_reactiva_antes_kvar - kvar_antes_esp) < 0.01
    assert abs(res.potencia_reactiva_despues_kvar - kvar_despues_esp) < 0.01
    assert res.potencia_reactiva_antes_kvar > res.potencia_reactiva_despues_kvar
