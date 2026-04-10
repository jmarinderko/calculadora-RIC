"""
Tests para el motor de cálculo de puesta a tierra — RIC Art. 3.12.
"""
import math
import pytest

from app.engine.grounding import (
    GroundingInput,
    calcular_puesta_tierra,
    _calc_varilla,
    _calc_cable_horizontal,
    _calc_malla,
)


# ── Test 1: varilla simple en suelo arcilla húmeda ────────────────────────────

def test_varilla_simple():
    """1 varilla 2.4m en suelo arcilla húmeda (ρ=100). R ≈ 18.7 Ω."""
    rho = 100.0
    L = 2.4
    d = 0.016
    R_esperada = (rho / (2 * math.pi * L)) * (math.log(4 * L / d) - 1)

    inp = GroundingInput(
        tipo_electrodo="varilla",
        resistividad_suelo=rho,
        longitud_varilla_m=L,
        diametro_varilla_m=d,
    )
    result = calcular_puesta_tierra(inp)

    assert result.resistencia_calculada_ohm == pytest.approx(R_esperada, rel=1e-4)
    # Para ρ=100, L=2.4m, d=16mm: R ≈ 35.8 Ω
    assert result.resistencia_calculada_ohm == pytest.approx(35.79, abs=0.1)


# ── Test 2: varilla larga en suelo pantanoso cumple ≤ 25 Ω ───────────────────

def test_varilla_cumple_25ohm():
    """Varilla 3m en suelo pantanoso (ρ=30) debe cumplir ≤25 Ω."""
    inp = GroundingInput(
        tipo_electrodo="varilla",
        resistividad_suelo=30.0,
        longitud_varilla_m=3.0,
        diametro_varilla_m=0.016,
        tipo_instalacion="general",
    )
    result = calcular_puesta_tierra(inp)
    assert result.cumple is True
    assert result.resistencia_calculada_ohm <= 25.0
    assert result.resistencia_requerida_ohm == 25.0


# ── Test 3: dos varillas en paralelo (espaciado ≥ 2L) ────────────────────────

def test_dos_varillas_paralelo():
    """2 varillas espaciadas >= 2L: R_total = R_individual / 2."""
    rho = 100.0
    L = 2.4
    d = 0.016
    R_individual = _calc_varilla(rho, L, d)

    inp = GroundingInput(
        tipo_electrodo="multiple_varillas",
        resistividad_suelo=rho,
        longitud_varilla_m=L,
        diametro_varilla_m=d,
        numero_varillas=2,
        espaciado_varillas_m=5.0,   # >= 2*2.4 = 4.8 m
    )
    result = calcular_puesta_tierra(inp)

    assert result.resistencia_calculada_ohm == pytest.approx(R_individual / 2, rel=1e-4)


# ── Test 4: malla 10×10m en suelo ρ=200 ──────────────────────────────────────

def test_malla_10x10():
    """Malla 10×10m en suelo ρ=200 Ω·m. Verifica la fórmula R=ρ(1/(4r)+1/√A)."""
    rho = 200.0
    A = 100.0
    R_esperada = _calc_malla(rho, A)

    inp = GroundingInput(
        tipo_electrodo="malla",
        resistividad_suelo=rho,
        ancho_malla_m=10.0,
        largo_malla_m=10.0,
    )
    result = calcular_puesta_tierra(inp)

    assert result.resistencia_calculada_ohm == pytest.approx(R_esperada, rel=1e-4)
    # Con ρ=200 y malla 100m², R debe ser razonablemente baja
    assert result.resistencia_calculada_ohm < 50.0


# ── Test 5: cable horizontal 30m ─────────────────────────────────────────────

def test_cable_horizontal():
    """Cable 30m enterrado a 0.6m, d=10mm, ρ=100. Verifica fórmula."""
    rho = 100.0
    L = 30.0
    d = 0.010
    h = 0.6
    R_esperada = _calc_cable_horizontal(rho, L, d, h)

    inp = GroundingInput(
        tipo_electrodo="cable_horizontal",
        resistividad_suelo=rho,
        longitud_cable_m=L,
        diametro_cable_m=d,
        profundidad_m=h,
    )
    result = calcular_puesta_tierra(inp)

    assert result.resistencia_calculada_ohm == pytest.approx(R_esperada, rel=1e-4)


# ── Test 6: instalación general, ρ bajo, cumple ≤ 25 Ω ───────────────────────

def test_cumple_general():
    """Malla grande en suelo conductivo cumple límite general 25 Ω."""
    inp = GroundingInput(
        tipo_electrodo="malla",
        resistividad_suelo=50.0,
        ancho_malla_m=10.0,
        largo_malla_m=10.0,
        tipo_instalacion="general",
    )
    result = calcular_puesta_tierra(inp)
    assert result.resistencia_requerida_ohm == 25.0
    assert result.cumple is True


# ── Test 7: instalación médica requiere R ≤ 5 Ω ──────────────────────────────

def test_no_cumple_medica():
    """1 varilla en suelo arcilla seca (ρ=200) no cumple para instalación médica (≤5Ω)."""
    inp = GroundingInput(
        tipo_electrodo="varilla",
        resistividad_suelo=200.0,
        longitud_varilla_m=2.4,
        diametro_varilla_m=0.016,
        tipo_instalacion="medica",
    )
    result = calcular_puesta_tierra(inp)
    assert result.resistencia_requerida_ohm == 5.0
    assert result.cumple is False
    assert result.resistencia_calculada_ohm > 5.0


# ── Test 8: tipo TN con corriente de disparo ──────────────────────────────────

def test_tipo_instalacion_tn():
    """Para TN con Ia=30A, R_requerida = 50/30 ≈ 1.67 Ω."""
    ia = 30.0
    R_req_esperada = 50.0 / ia   # ≈ 1.667 Ω

    inp = GroundingInput(
        tipo_electrodo="varilla",
        resistividad_suelo=100.0,
        longitud_varilla_m=2.4,
        diametro_varilla_m=0.016,
        tipo_instalacion="tn",
        corriente_disparo_a=ia,
    )
    result = calcular_puesta_tierra(inp)

    assert result.resistencia_requerida_ohm == pytest.approx(R_req_esperada, rel=1e-4)
    # Con ρ=100 y varilla 2.4m, R > 1.67 Ω => no cumple
    assert result.cumple is False


# ── Tests adicionales de validación ──────────────────────────────────────────

def test_multiple_varillas_con_interferencia():
    """3 varillas con espaciado insuficiente aplican factor k=0.58."""
    rho = 100.0
    L = 2.4
    d = 0.016
    R_individual = _calc_varilla(rho, L, d)
    k = 0.58

    inp = GroundingInput(
        tipo_electrodo="multiple_varillas",
        resistividad_suelo=rho,
        longitud_varilla_m=L,
        diametro_varilla_m=d,
        numero_varillas=3,
        espaciado_varillas_m=3.0,   # < 2*2.4 = 4.8 m
    )
    result = calcular_puesta_tierra(inp)

    R_esperada = (R_individual * k) / 3
    assert result.resistencia_calculada_ohm == pytest.approx(R_esperada, rel=1e-4)
    assert len(result.advertencias) >= 1


def test_tipo_tn_sin_corriente_usa_limite_general():
    """TN sin corriente de disparo usa 25 Ω como límite."""
    inp = GroundingInput(
        tipo_electrodo="varilla",
        resistividad_suelo=30.0,
        longitud_varilla_m=3.0,
        tipo_instalacion="tn",
        corriente_disparo_a=None,
    )
    result = calcular_puesta_tierra(inp)
    assert result.resistencia_requerida_ohm == 25.0
    assert any("corriente de disparo" in w.lower() or "Ia" in w for w in result.advertencias)


def test_malla_no_cumple_medica():
    """Malla pequeña en suelo seco no cumple para instalación médica."""
    inp = GroundingInput(
        tipo_electrodo="malla",
        resistividad_suelo=300.0,
        ancho_malla_m=4.0,
        largo_malla_m=4.0,
        tipo_instalacion="medica",
    )
    result = calcular_puesta_tierra(inp)
    assert result.resistencia_requerida_ohm == 5.0
    assert result.cumple is False
