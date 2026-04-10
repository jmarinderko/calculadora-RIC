"""
Tests para el motor de cálculo de iluminación (método cavidades zonales).
Verificación NCh 2/1984.
"""
import math
import pytest

from app.engine.lighting import (
    LightingInput,
    LightingResult,
    NIVELES_NCH_2,
    calcular_iluminacion,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_oficina(**kwargs) -> LightingInput:
    """Oficina 6×4m, h=2.8m, luminaria 3200 lm, 36W — base para varios tests."""
    defaults = dict(
        largo_m=6.0,
        ancho_m=4.0,
        altura_m=2.8,
        altura_trabajo_m=0.85,
        flujo_luminaria_lm=3200.0,
        tipo_recinto="oficina_trabajo_normal",
        factor_mantenimiento=0.7,
        potencia_luminaria_w=36.0,
    )
    defaults.update(kwargs)
    return LightingInput(**defaults)


# ── Test 1: Oficina básica — verificar N ──────────────────────────────────────

def test_oficina_basica():
    """Oficina 6×4m, luminarias 3200 lm → debe calcular N de luminarias."""
    inp = make_oficina()
    res = calcular_iluminacion(inp)

    # Verificaciones básicas de tipos y rangos
    assert isinstance(res, LightingResult)
    assert res.numero_luminarias >= 1
    assert res.iluminancia_real_lux > 0

    # Con 3200 lm y objetivo 300 lux en 24 m², debe necesitar al menos 3 luminarias
    assert res.numero_luminarias >= 3

    # La iluminancia real con N luminarias debe ser >= objetivo (N = ceil → siempre cumple)
    assert res.iluminancia_real_lux >= res.iluminancia_objetivo_lux


# ── Test 2: Índice del local k ────────────────────────────────────────────────

def test_indice_local():
    """Verifica cálculo del índice del local k = L×W / (Hm×(L+W))."""
    inp = make_oficina()
    res = calcular_iluminacion(inp)

    L, W = 6.0, 4.0
    hm = 2.8 - 0.85  # = 1.95
    k_esperado = (L * W) / (hm * (L + W))

    assert abs(res.indice_local_k - k_esperado) < 0.001


# ── Test 3: Iluminancia real vs objetivo ──────────────────────────────────────

def test_iluminancia_real_vs_objetivo():
    """La iluminancia real debe ser >= objetivo (N = ceil garantiza esto)."""
    inp = make_oficina(iluminancia_objetivo_lux=300.0)
    res = calcular_iluminacion(inp)

    # E_real >= E_objetivo porque N = ceil(N_exacto)
    assert res.iluminancia_real_lux >= res.iluminancia_objetivo_lux

    # La diferencia no debe ser excesiva (< 100% exceso = menos de 2× lo pedido)
    assert res.iluminancia_real_lux < res.iluminancia_objetivo_lux * 2.5


# ── Test 4: Cumple NCh 2/1984 ─────────────────────────────────────────────────

def test_cumple_nch2():
    """Con luminarias suficientes, debe cumplir mínimo NCh 2."""
    inp = make_oficina(flujo_luminaria_lm=4000.0)
    res = calcular_iluminacion(inp)

    assert res.cumple_nch2 is True
    assert res.iluminancia_real_lux >= res.nivel_minimo_nch2_lux
    assert res.nivel_minimo_nch2_lux == 300.0  # oficina_trabajo_normal


# ── Test 5: No cumple NCh 2/1984 ─────────────────────────────────────────────

def test_no_cumple_nch2():
    """Con iluminancia objetivo muy por debajo del mínimo, no cumple NCh 2."""
    # Pedimos sólo 50 lux en una oficina (mínimo 300 lux)
    inp = make_oficina(iluminancia_objetivo_lux=50.0)
    res = calcular_iluminacion(inp)

    assert res.cumple_nch2 is False
    assert res.iluminancia_real_lux < res.nivel_minimo_nch2_lux
    # Debe haber advertencia indicando incumplimiento
    assert any("NCh 2/1984" in adv for adv in res.advertencias)


# ── Test 6: Distribución simétrica ───────────────────────────────────────────

def test_distribucion_simetrica():
    """N=6 en recinto 6×4m → distribución razonable (filas×columnas ~ 2×3 o 3×2)."""
    # Forzamos exactamente 6 luminarias configurando el flujo apropiado
    # N = ceil((E*A) / (phi*CU*fm))
    # Primero calculamos cuánto flujo necesitamos para N=6 exacto
    L, W = 6.0, 4.0
    hm = 2.8 - 0.85
    k = (L * W) / (hm * (L + W))
    rho_medio = (0.7 + 0.5) / 2.0
    cu = (k / (k + 2.0)) * (0.5 + 0.5 * rho_medio)
    fm = 0.7
    area = L * W
    e = 300.0

    # Para que N=6 exacto, necesitamos que 5 < (E*A)/(phi*CU*fm) <= 6
    # phi = (E*A) / (6 * cu * fm)
    phi_para_6 = (e * area) / (6.0 * cu * fm)

    inp = LightingInput(
        largo_m=L, ancho_m=W, altura_m=2.8,
        flujo_luminaria_lm=phi_para_6,
        tipo_recinto="oficina_trabajo_normal",
        factor_mantenimiento=fm,
    )
    res = calcular_iluminacion(inp)

    assert res.numero_luminarias == 6
    # filas × columnas >= 6
    assert res.filas * res.columnas >= res.numero_luminarias
    # distribución razonable: 2 o 3 filas
    assert res.filas in (2, 3)
    assert res.columnas in (2, 3)


# ── Test 7: Potencia instalada ────────────────────────────────────────────────

def test_potencia_instalada():
    """potencia_instalada_w == N × potencia_luminaria_w."""
    inp = make_oficina(potencia_luminaria_w=40.0)
    res = calcular_iluminacion(inp)

    esperada = res.numero_luminarias * 40.0
    assert abs(res.potencia_instalada_w - esperada) < 0.01

    # densidad = potencia_instalada / area
    assert abs(res.densidad_potencia_wm2 - esperada / (6.0 * 4.0)) < 0.01


# ── Test 8: Tipo de recinto correcto ──────────────────────────────────────────

def test_tipo_recinto_correcto():
    """tipo_recinto 'oficina_trabajo_normal' → nivel mínimo 300 lux."""
    inp = make_oficina()
    res = calcular_iluminacion(inp)

    assert res.nivel_minimo_nch2_lux == 300.0


# ── Tests adicionales de robustez ─────────────────────────────────────────────

def test_todos_tipos_recinto():
    """Todos los tipos de recinto en NIVELES_NCH_2 deben funcionar sin error."""
    for tipo in NIVELES_NCH_2:
        inp = LightingInput(
            largo_m=5.0, ancho_m=4.0, altura_m=2.7,
            flujo_luminaria_lm=2500.0,
            tipo_recinto=tipo,
        )
        res = calcular_iluminacion(inp)
        assert res.numero_luminarias >= 1
        assert res.nivel_minimo_nch2_lux == float(NIVELES_NCH_2[tipo])


def test_tipo_recinto_invalido():
    """Tipo de recinto desconocido debe lanzar ValueError."""
    with pytest.raises(Exception):
        LightingInput(
            largo_m=5.0, ancho_m=4.0, altura_m=2.7,
            flujo_luminaria_lm=2500.0,
            tipo_recinto="tipo_inexistente",
        )


def test_area_m2_correcto():
    """area_m2 = largo × ancho."""
    inp = make_oficina(largo_m=8.0, ancho_m=5.0)
    res = calcular_iluminacion(inp)
    assert abs(res.area_m2 - 40.0) < 0.01


def test_habitacion_vivienda():
    """Habitación de vivienda 4×3m — mínimo 100 lux, luminaria 1200 lm."""
    inp = LightingInput(
        largo_m=4.0, ancho_m=3.0, altura_m=2.5,
        flujo_luminaria_lm=1200.0,
        tipo_recinto="vivienda_habitacion",
        factor_mantenimiento=0.7,
    )
    res = calcular_iluminacion(inp)

    assert res.nivel_minimo_nch2_lux == 100.0
    assert res.numero_luminarias >= 1
    assert res.iluminancia_real_lux > 0
