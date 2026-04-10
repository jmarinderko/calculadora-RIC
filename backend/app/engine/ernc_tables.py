"""
Tablas ERNC — Energía Renovable No Convencional (Solar FV / Baterías)
Fuentes:
  - IEC 62930 / EN 50618  → cable solar ZZ-F (doble aislación, resistente UV)
  - IEC 60364-7-712       → instalaciones fotovoltaicas
  - RIC       → requisitos mínimos instalación
  - NTCO SEC (2020)       → normativa generación distribuida red BT Chile
"""
from dataclasses import dataclass
from typing import Optional


# ── Cable solar ZZ-F (TÜV/EN 50618, 90°C servicio continuo, 120°C punta) ──────
# Ampacidades al aire libre (aire libre ≥ 0.3 m entre cables), T_amb = 40°C
# Referencia: IEC 60364-7-712 Tabla 712.52

@dataclass
class ZZFRow:
    sec: float          # Sección mm²
    i_aire: int         # I_max al aire (A), T_amb=40°C, 1 cable
    i_ducto: int        # I_max en ducto/conduit (A), T_amb=40°C
    rcu: float          # Resistencia Cu a 20°C (Ω/km)
    awg: str            # Referencia AWG aproximada


# Tabla ZZ-F — Cable solar cobre (serie estándar FV)
TABLA_ZZF: list[ZZFRow] = [
    ZZFRow(sec=4.0,  i_aire=46,  i_ducto=34,  rcu=4.61,  awg="10 AWG"),
    ZZFRow(sec=6.0,  i_aire=60,  i_ducto=44,  rcu=3.08,  awg="8 AWG"),
    ZZFRow(sec=10.0, i_aire=80,  i_ducto=59,  rcu=1.83,  awg="6 AWG"),
    ZZFRow(sec=16.0, i_aire=107, i_ducto=79,  rcu=1.15,  awg="4 AWG"),
    ZZFRow(sec=25.0, i_aire=142, i_ducto=105, rcu=0.727, awg="2 AWG"),
    ZZFRow(sec=35.0, i_aire=176, i_ducto=130, rcu=0.524, awg="1 AWG"),
    ZZFRow(sec=50.0, i_aire=218, i_ducto=162, rcu=0.387, awg="1/0 AWG"),
]

# Sección mínima absoluta para string DC (IEC 60364-7-712 cláusula 712.52.1)
SEC_MIN_DC_MM2 = 4.0

# Sección mínima para AC inversor (RIC Art. 5.3.1 — alimentador)
SEC_MIN_AC_MM2 = 4.0


# ── Resistividad por temperatura ───────────────────────────────────────────────
# ρ(T) = ρ₂₀ × [1 + α(T − 20)]
# Cu: ρ₂₀ = 0.01724 Ω·mm²/m,  α = 0.00393 /°C
# Al: ρ₂₀ = 0.02826 Ω·mm²/m,  α = 0.00403 /°C

RHO_20: dict[str, float] = {
    "cu": 0.01724,   # Ω·mm²/m a 20°C
    "al": 0.02826,
}
ALPHA_RESISTIVIDAD: dict[str, float] = {
    "cu": 0.00393,   # /°C
    "al": 0.00403,
}


def get_rho(material: str, temp_c: float) -> float:
    """Resistividad del conductor a la temperatura dada (Ω·mm²/m)."""
    rho20 = RHO_20[material]
    alpha = ALPHA_RESISTIVIDAD[material]
    return rho20 * (1 + alpha * (temp_c - 20))


def get_r_ohm_per_m(sec_mm2: float, material: str, temp_c: float) -> float:
    """Resistencia por metro de conductor (Ω/m) a temperatura dada."""
    return get_rho(material, temp_c) / sec_mm2


# ── Tensiones DC típicas sistemas FV ──────────────────────────────────────────
TENSIONES_DC_V: list[int] = [
    48, 96, 120, 240, 360, 480, 600, 800, 1000, 1500
]

# Tensión máxima admisible string DC en BT (IEC 60364-7-712 / SEC Chile)
# Sistemas < 1000V CC se clasifican como LVDC; 1000–1500V requieren MLVDC
TENSION_MAX_LVDC_V = 1000
TENSION_MAX_DC_SEC_V = 1500  # Con diseño específico NTCO

# Tensiones AC típicas para lado inversor (Chile)
TENSIONES_AC_V: list[int] = [220, 380, 400]


# ── Factor de temperatura para Voc de panel FV ────────────────────────────────
# Voc_operacion = Voc_STC × [1 + coef_voc × (T_celda − T_STC)]
# T_STC = 25°C (Standard Test Conditions)
# coef_voc típico Si cristalino: −0.29 %/°C (rango −0.25 a −0.45 %/°C)
# Temperatura de celda: T_celda = T_amb + NOCT − 20°C (IEC 61215)
# NOCT típico: 45°C

T_STC_C: float = 25.0          # °C condiciones estándar
NOCT_DEFAULT_C: float = 45.0   # °C Nominal Operating Cell Temperature
COEF_VOC_DEFAULT: float = -0.0029  # /°C (−0.29%/°C para Si cristalino)


def get_voc_operacion(
    voc_stc: float,
    temp_amb_c: float,
    noct_c: float = NOCT_DEFAULT_C,
    coef_voc_pct_per_c: float = -0.29
) -> float:
    """
    Calcula Voc de operación a temperatura ambiente dada.
    IEC 60891 / IEC 61215.

    Args:
        voc_stc: Tensión de circuito abierto a STC (25°C) en V
        temp_amb_c: Temperatura ambiente en °C
        noct_c: NOCT del panel (Nominal Operating Cell Temperature) en °C
        coef_voc_pct_per_c: Coeficiente temperatura Voc en %/°C (negativo p/ Si)

    Returns:
        Voc en condiciones de operación (V)
    """
    t_celda = temp_amb_c + (noct_c - 20.0) * 0.8  # IEC 61215 estimación
    coef = coef_voc_pct_per_c / 100.0
    return voc_stc * (1 + coef * (t_celda - T_STC_C))


def get_voc_minima(
    voc_stc: float,
    temp_max_c: float,
    noct_c: float = NOCT_DEFAULT_C,
    coef_voc_pct_per_c: float = -0.29
) -> float:
    """
    Voc mínima (temperatura máxima → Voc baja).
    Útil para verificar punto de operación MPPT del inversor.
    """
    return get_voc_operacion(voc_stc, temp_max_c, noct_c, coef_voc_pct_per_c)


def get_voc_maxima(
    voc_stc: float,
    temp_min_c: float,
    noct_c: float = NOCT_DEFAULT_C,
    coef_voc_pct_per_c: float = -0.29
) -> float:
    """
    Voc máxima (temperatura mínima → Voc sube).
    Crítica para dimensionar aislación de cable y arribo de inversor.
    """
    return get_voc_operacion(voc_stc, temp_min_c, noct_c, coef_voc_pct_per_c)


# ── Factores de diseño ERNC ───────────────────────────────────────────────────

# Factor de diseño corriente DC string (IEC 62548 / NEC 690.8)
# I_diseño = 1.25 × Isc  (margen para irradiancia superior a STC)
FACTOR_ISC_DC: float = 1.25

# Factor corriente baterías (margen transitorio)
FACTOR_BATERIAS: float = 1.25

# Límites de caída de tensión ERNC
LIMITE_CAIDA_DC_STRING_PCT: float = 1.5   # String DC: 1.5% (IEC 60364-7-712)
LIMITE_CAIDA_AC_INVERSOR_PCT: float = 1.5  # AC inversor: 1.5% (NTCO SEC / buena práctica)
LIMITE_CAIDA_GD_RED_PCT: float = 1.5      # GD red BT: 1.5% (NTCO SEC)
LIMITE_CAIDA_BATERIAS_PCT: float = 1.0    # Baterías DC: 1.0% (mayor sensibilidad)


# ── Factores temperatura ZZ-F (IEC 60364-7-712, conductor 90°C continuo) ──────
# T_ref = 40°C para cable solar, T_max_conductor = 90°C
FACTORES_TEMP_ZZF: dict[int, float] = {
    25: 1.14,
    30: 1.10,
    35: 1.05,
    40: 1.00,   # referencia
    45: 0.95,
    50: 0.89,
    55: 0.84,
    60: 0.77,
    70: 0.63,
}


def get_temp_factor_zzf(temp_c: int) -> float:
    """Factor corrección temperatura para cable ZZ-F (base 40°C)."""
    if temp_c in FACTORES_TEMP_ZZF:
        return FACTORES_TEMP_ZZF[temp_c]
    closest = min(FACTORES_TEMP_ZZF.keys(), key=lambda t: abs(t - temp_c))
    return FACTORES_TEMP_ZZF[closest]


def get_zzf_row(sec_mm2: float) -> Optional[ZZFRow]:
    """Retorna la fila ZZ-F para la sección dada."""
    return next((r for r in TABLA_ZZF if r.sec == sec_mm2), None)


def buscar_seccion_zzf(i_req: float, en_ducto: bool, ft: float = 1.0) -> Optional[ZZFRow]:
    """
    Busca la primera sección ZZ-F que cumpla ampacidad requerida.

    Args:
        i_req: Corriente requerida (A)
        en_ducto: True si va en ducto/conduit; False si es al aire
        ft: Factor de temperatura ya aplicado a i_req (o 1.0 si i_req ya está corregida)

    Returns:
        ZZFRow seleccionada o None si supera tabla
    """
    for row in TABLA_ZZF:
        i_max = row.i_ducto if en_ducto else row.i_aire
        if i_max * ft >= i_req:
            return row
    return None
