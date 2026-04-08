"""
Tablas normativas MT/AT — IEC 60502-2 / IEC 60228 / IEC 60287
Conductores de media tensión (1–36 kV) y alta tensión (36–220 kV)
Aislamientos: XLPE, EPR
Instalaciones: aérea, enterrada, en ducto
"""
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class MtatRow:
    sec: float          # Sección mm²
    # Ampacidades XLPE Cu (A) — IEC 60502-2 Tabla B.1/B.2
    icu_aereo: int      # Cu aéreo (trébol, al sol, 40°C suelo)
    icu_enter: int      # Cu enterrado directo (profundidad 1m, ρ=1 K·m/W)
    icu_ducto: int      # Cu en ducto enterrado
    # Ampacidades XLPE Al (A)
    ial_aereo: int
    ial_enter: int
    ial_ducto: int
    # Resistencia DC 20°C (Ω/km) — IEC 60228
    rcu_dc: float       # Cu
    ral_dc: float       # Al
    # Resistencia AC 50Hz 90°C (Ω/km) — aprox. 1.02×rdc×α(90°C)
    rcu_ac: float
    ral_ac: float
    # Reactancia inductiva (Ω/km) — IEC 60287 Tabla 2, formación trébol, s=d_ext
    x_ohm_km: float


# ──────────────────────────────────────────────────────────────────────────────
# Tabla MT/AT — IEC 60502-2 + IEC 60287
# Ampacidades base: XLPE, 90°C, T_amb=25°C (aire) / 20°C (tierra), ρ=1 K·m/W
# ──────────────────────────────────────────────────────────────────────────────
TABLA_MTAT: list[MtatRow] = [
    # sec    icu_a  icu_e  icu_d  ial_a  ial_e  ial_d  rcu_dc  ral_dc  rcu_ac  ral_ac  x
    MtatRow(16,    150,   120,    95,   115,    92,    72,  1.150,  1.910,  1.370,  2.270,  0.120),
    MtatRow(25,    185,   150,   120,   145,   117,    93,  0.727,  1.200,  0.866,  1.427,  0.113),
    MtatRow(35,    225,   180,   145,   175,   140,   112,  0.524,  0.868,  0.624,  1.032,  0.108),
    MtatRow(50,    270,   215,   175,   210,   168,   136,  0.387,  0.641,  0.461,  0.762,  0.102),
    MtatRow(70,    330,   265,   215,   255,   205,   165,  0.268,  0.443,  0.319,  0.527,  0.096),
    MtatRow(95,    395,   315,   255,   305,   245,   198,  0.193,  0.320,  0.230,  0.380,  0.091),
    MtatRow(120,   450,   360,   295,   350,   280,   228,  0.153,  0.253,  0.182,  0.301,  0.088),
    MtatRow(150,   510,   405,   330,   395,   315,   257,  0.124,  0.206,  0.148,  0.245,  0.085),
    MtatRow(185,   575,   455,   375,   445,   355,   290,  0.0991, 0.164,  0.118,  0.195,  0.083),
    MtatRow(240,   665,   530,   435,   515,   410,   336,  0.0754, 0.125,  0.090,  0.149,  0.080),
    MtatRow(300,   755,   600,   495,   585,   465,   382,  0.0601, 0.100,  0.072,  0.119,  0.077),
    MtatRow(400,   870,   690,   570,   675,   540,   445,  0.0470, 0.0778, 0.056,  0.093,  0.074),
    MtatRow(500,   975,   775,   640,   755,   605,   499,  0.0366, 0.0605, 0.044,  0.072,  0.072),
    MtatRow(630,  1090,   865,   715,   845,   675,   558,  0.0283, 0.0469, 0.034,  0.056,  0.069),
]

# Índice rápido por sección
_IDX_MTAT: dict[float, MtatRow] = {r.sec: r for r in TABLA_MTAT}


def get_mtat_row(sec_mm2: float) -> Optional[MtatRow]:
    return _IDX_MTAT.get(sec_mm2)


# ──────────────────────────────────────────────────────────────────────────────
# Secciones mínimas por nivel de tensión (IEC 60502-2 / práctica industrial)
# ──────────────────────────────────────────────────────────────────────────────
SEC_MIN_MTAT: dict[str, float] = {
    "mt_1_7kv":   16.0,
    "mt_7_12kv":  25.0,
    "mt_12_24kv": 35.0,
    "mt_24_36kv": 50.0,
    "at_36_72kv": 70.0,
    "at_72_145kv":120.0,
    "at_145_220kv":150.0,
}


# ──────────────────────────────────────────────────────────────────────────────
# Factores de corrección de temperatura — IEC 60502-2 Tabla B.5
# Base: XLPE 90°C, T_ref=25°C (aire) / 20°C (enterrado)
# ──────────────────────────────────────────────────────────────────────────────
FACTORES_TEMP_MTAT_AIRE: dict[int, float] = {
    10: 1.15,
    15: 1.12,
    20: 1.08,
    25: 1.00,  # referencia
    30: 0.96,
    35: 0.91,
    40: 0.87,
    45: 0.82,
    50: 0.76,
    55: 0.71,
}

FACTORES_TEMP_MTAT_TIERRA: dict[int, float] = {
    10: 1.10,
    15: 1.05,
    20: 1.00,  # referencia
    25: 0.95,
    30: 0.89,
    35: 0.84,
    40: 0.77,
}


def get_temp_factor_mtat(temp_c: int, es_enterrado: bool) -> float:
    """Factor de temperatura para instalación MT/AT."""
    tabla = FACTORES_TEMP_MTAT_TIERRA if es_enterrado else FACTORES_TEMP_MTAT_AIRE
    if temp_c in tabla:
        return tabla[temp_c]
    closest = min(tabla.keys(), key=lambda t: abs(t - temp_c))
    return tabla[closest]


# ──────────────────────────────────────────────────────────────────────────────
# Factores de agrupamiento — IEC 60502-2 Tabla B.6 / IEC 60364-5-52
# ──────────────────────────────────────────────────────────────────────────────
FACTORES_AGRUP_MTAT: dict[int, float] = {
    1: 1.00,
    2: 0.88,
    3: 0.80,
    4: 0.75,
    6: 0.68,
    8: 0.63,
    10: 0.58,
}


def get_grouping_factor_mtat(n_circuits: int) -> float:
    """Factor de agrupamiento para cables MT/AT."""
    if n_circuits <= 1:
        return 1.00
    elif n_circuits <= 2:
        return 0.88
    elif n_circuits <= 3:
        return 0.80
    elif n_circuits <= 4:
        return 0.75
    elif n_circuits <= 6:
        return 0.68
    elif n_circuits <= 8:
        return 0.63
    else:
        return 0.58


# ──────────────────────────────────────────────────────────────────────────────
# Factor de profundidad de enterrado — IEC 60502-2 Tabla B.7
# Referencia: 0.8 m. Factor < 1 indica mayor profundidad (peor disipación)
# ──────────────────────────────────────────────────────────────────────────────
FACTORES_PROFUNDIDAD: dict[float, float] = {
    0.5: 1.07,
    0.8: 1.00,  # referencia
    1.0: 0.98,
    1.2: 0.96,
    1.5: 0.93,
    2.0: 0.89,
    2.5: 0.86,
    3.0: 0.83,
}


def get_depth_factor(profundidad_m: float) -> float:
    """Factor de corrección por profundidad de enterrado."""
    if profundidad_m in FACTORES_PROFUNDIDAD:
        return FACTORES_PROFUNDIDAD[profundidad_m]
    closest = min(FACTORES_PROFUNDIDAD.keys(), key=lambda d: abs(d - profundidad_m))
    return FACTORES_PROFUNDIDAD[closest]


# ──────────────────────────────────────────────────────────────────────────────
# Factor de resistividad del terreno — IEC 60287
# Referencia: ρ = 1.0 K·m/W
# ──────────────────────────────────────────────────────────────────────────────
FACTORES_RESISTIVIDAD: dict[float, float] = {
    0.5: 1.12,
    0.7: 1.06,
    1.0: 1.00,  # referencia
    1.5: 0.93,
    2.0: 0.87,
    2.5: 0.82,
    3.0: 0.78,
}


def get_resistivity_factor(rho: float) -> float:
    """Factor de corrección por resistividad del suelo."""
    if rho in FACTORES_RESISTIVIDAD:
        return FACTORES_RESISTIVIDAD[rho]
    closest = min(FACTORES_RESISTIVIDAD.keys(), key=lambda r: abs(r - rho))
    return FACTORES_RESISTIVIDAD[closest]


# ──────────────────────────────────────────────────────────────────────────────
# Constantes K para estrés térmico — IEC 60949
# Aislamiento XLPE: T_inicial=90°C, T_max=250°C
# Aislamiento EPR:  T_inicial=90°C, T_max=250°C (mismas K que XLPE)
# ──────────────────────────────────────────────────────────────────────────────
K_CONST_MTAT: dict[str, int] = {
    "cu_xlpe": 143,
    "al_xlpe": 94,
    "cu_epr":  143,
    "al_epr":  94,
}

# T° máxima en cortocircuito por tipo aislamiento (IEC 60724)
T_MAX_CC: dict[str, float] = {
    "xlpe": 250.0,
    "epr":  250.0,
}

# T° operación normal (base para estrés térmico)
T_OPE_XLPE_EPR = 90.0


# ──────────────────────────────────────────────────────────────────────────────
# Niveles de tensión
# ──────────────────────────────────────────────────────────────────────────────
NIVELES_TENSION: dict[str, dict] = {
    "mt_1_7kv":    {"label": "MT 1–7 kV",    "vn_kv": 6.6,   "rango_kv": (1,    7),  "sec_min": 16},
    "mt_7_12kv":   {"label": "MT 7–12 kV",   "vn_kv": 10.0,  "rango_kv": (7,   12),  "sec_min": 25},
    "mt_12_24kv":  {"label": "MT 12–24 kV",  "vn_kv": 23.0,  "rango_kv": (12,  24),  "sec_min": 35},
    "mt_24_36kv":  {"label": "MT 24–36 kV",  "vn_kv": 33.0,  "rango_kv": (24,  36),  "sec_min": 50},
    "at_36_72kv":  {"label": "AT 36–72 kV",  "vn_kv": 66.0,  "rango_kv": (36,  72),  "sec_min": 70},
    "at_72_145kv": {"label": "AT 72–145 kV", "vn_kv": 110.0, "rango_kv": (72, 145),  "sec_min": 120},
    "at_145_220kv":{"label": "AT 145–220 kV","vn_kv": 220.0, "rango_kv": (145, 220), "sec_min": 150},
}


def is_buried_mtat(tipo_instalacion: str) -> bool:
    return tipo_instalacion in {"enterrado_directo", "enterrado_ducto"}


def is_ducto_mtat(tipo_instalacion: str) -> bool:
    return tipo_instalacion in {"enterrado_ducto", "ducto_subterraneo"}


def get_ampacity_mtat(row: MtatRow, material: str, tipo_instalacion: str) -> int:
    """Retorna ampacidad base según material e instalación."""
    is_cu = material == "cu"
    if is_buried_mtat(tipo_instalacion):
        if is_ducto_mtat(tipo_instalacion):
            return row.icu_ducto if is_cu else row.ial_ducto
        return row.icu_enter if is_cu else row.ial_enter
    # aéreo o cualquier otro
    return row.icu_aereo if is_cu else row.ial_aereo
