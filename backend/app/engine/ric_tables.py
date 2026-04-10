"""
Tablas normativas RIC — RIC
Portado desde calculadora_ric_v7.html (JavaScript → Python)
Fuente: Tabla 5-1 RIC, conductores THW 75°C, T_amb=30°C
"""
from dataclasses import dataclass
from typing import Optional


@dataclass
class RicRow:
    sec: float          # Sección mm²
    icu_d: int          # I_max Cu ducto (A)
    icu_a: int          # I_max Cu aire (A)
    ial_d: int          # I_max Al ducto (A), 0 = no aplica
    ial_a: int          # I_max Al aire (A), 0 = no aplica
    rcu: float          # Resistencia Cu (Ω/km a 20°C)
    ral: float          # Resistencia Al (Ω/km a 20°C), 0 = no aplica
    awg: str            # Calibre AWG/MCM


# Tabla RIC completa (16 secciones) — portada 1:1 desde calculadora_ric_v7.html
TABLA_RIC: list[RicRow] = [
    RicRow(sec=1.5,   icu_d=13,  icu_a=17,  ial_d=0,   ial_a=0,   rcu=12.10,  ral=0.0,    awg="14 AWG"),
    RicRow(sec=2.5,   icu_d=18,  icu_a=23,  ial_d=0,   ial_a=0,   rcu=7.41,   ral=0.0,    awg="12 AWG"),
    RicRow(sec=4.0,   icu_d=24,  icu_a=31,  ial_d=0,   ial_a=0,   rcu=4.61,   ral=0.0,    awg="10 AWG"),
    RicRow(sec=6.0,   icu_d=31,  icu_a=40,  ial_d=0,   ial_a=0,   rcu=3.08,   ral=0.0,    awg="8 AWG"),
    RicRow(sec=10.0,  icu_d=42,  icu_a=54,  ial_d=32,  ial_a=42,  rcu=1.83,   ral=3.08,   awg="6 AWG"),
    RicRow(sec=16.0,  icu_d=56,  icu_a=73,  ial_d=44,  ial_a=57,  rcu=1.15,   ral=1.91,   awg="4 AWG"),
    RicRow(sec=25.0,  icu_d=73,  icu_a=95,  ial_d=57,  ial_a=75,  rcu=0.727,  ral=1.20,   awg="2 AWG"),
    RicRow(sec=35.0,  icu_d=89,  icu_a=117, ial_d=70,  ial_a=92,  rcu=0.524,  ral=0.868,  awg="1 AWG"),
    RicRow(sec=50.0,  icu_d=108, icu_a=141, ial_d=84,  ial_a=110, rcu=0.387,  ral=0.641,  awg="1/0 AWG"),
    RicRow(sec=70.0,  icu_d=136, icu_a=179, ial_d=107, ial_a=140, rcu=0.268,  ral=0.443,  awg="2/0 AWG"),
    RicRow(sec=95.0,  icu_d=164, icu_a=216, ial_d=129, ial_a=169, rcu=0.193,  ral=0.320,  awg="3/0 AWG"),
    RicRow(sec=120.0, icu_d=188, icu_a=249, ial_d=149, ial_a=197, rcu=0.153,  ral=0.253,  awg="4/0 AWG"),
    RicRow(sec=150.0, icu_d=216, icu_a=285, ial_d=170, ial_a=225, rcu=0.124,  ral=0.206,  awg="250 MCM"),
    RicRow(sec=185.0, icu_d=245, icu_a=324, ial_d=194, ial_a=256, rcu=0.0991, ral=0.164,  awg="350 MCM"),
    RicRow(sec=240.0, icu_d=286, icu_a=380, ial_d=227, ial_a=300, rcu=0.0754, ral=0.125,  awg="500 MCM"),
    RicRow(sec=300.0, icu_d=328, icu_a=435, ial_d=261, ial_a=346, rcu=0.0601, ral=0.100,  awg="600 MCM"),
]

# Sección mínima por tipo de circuito (RIC Art. 5.3.1)
SEC_MIN_CIRCUITO: dict[str, float] = {
    "alumbrado":      1.5,
    "fuerza":         2.5,
    "tomacorrientes": 2.5,
    "motor":          2.5,
    "alimentador":    4.0,
}

# Factores de temperatura (RIC Tabla 5-3, conductor THW 75°C, T_ref=30°C)
FACTORES_TEMPERATURA: dict[int, float] = {
    25: 1.050,
    30: 1.000,
    35: 0.940,
    40: 0.870,
    45: 0.790,
    50: 0.710,
}

# Factores de agrupamiento (RIC Tabla 5-4)
FACTORES_AGRUPAMIENTO: dict[int, float] = {
    1: 1.000,
    2: 0.800,
    3: 0.700,
    4: 0.650,
    6: 0.570,
    9: 0.500,
}

# Constante K para estrés térmico IEC 60949
K_CONST: dict[str, int] = {
    "cu_thw":  115,
    "cu_xlpe": 143,
    "al_thw":   74,
    "al_xlpe":  94,
}

# Factor de tipo de falla cortocircuito
FACTOR_FALLA: dict[str, float] = {
    "3f":  1.00,
    "2f":  0.87,
    "2ft": 1.00,
    "1ft": 0.58,
}

# Diámetros exteriores de cable (mm): [unipolar, multiconductor]
DIAMETRO_CABLE: dict[float, tuple[float, float]] = {
    1.5:   (5.8,  9.5),
    2.5:   (6.5,  11.0),
    4.0:   (7.0,  12.5),
    6.0:   (7.8,  13.5),
    10.0:  (9.2,  16.5),
    16.0:  (11.0, 19.5),
    25.0:  (13.5, 24.0),
    35.0:  (15.0, 27.0),
    50.0:  (17.5, 31.0),
    70.0:  (20.5, 36.5),
    95.0:  (24.0, 43.0),
    120.0: (26.5, 48.0),
    150.0: (29.5, 54.0),
    185.0: (33.0, 60.0),
    240.0: (38.0, 69.0),
    300.0: (42.0, 78.0),
}


def get_temp_factor(temp_c: int) -> float:
    """Retorna el factor de corrección por temperatura más cercano."""
    if temp_c in FACTORES_TEMPERATURA:
        return FACTORES_TEMPERATURA[temp_c]
    closest = min(FACTORES_TEMPERATURA.keys(), key=lambda t: abs(t - temp_c))
    return FACTORES_TEMPERATURA[closest]


def get_grouping_factor(circuitos: int) -> float:
    """Retorna el factor de agrupamiento para N circuitos."""
    if circuitos <= 1:
        return 1.000
    elif circuitos <= 2:
        return 0.800
    elif circuitos <= 3:
        return 0.700
    elif circuitos <= 4:
        return 0.650
    elif circuitos <= 6:
        return 0.570
    else:
        return 0.500


def get_altitude_factor(msnm: float) -> float:
    """Factor de corrección por altitud (IEC 60364-5-52)."""
    if msnm <= 1000:
        return 1.00
    elif msnm <= 1500:
        return 0.97
    elif msnm <= 2000:
        return 0.94
    elif msnm <= 2500:
        return 0.91
    elif msnm <= 3000:
        return 0.88
    elif msnm <= 3500:
        return 0.84
    elif msnm <= 4000:
        return 0.80
    elif msnm <= 4500:
        return 0.76
    else:
        return 0.71


def is_air_installation(tipo_canalizacion: str) -> bool:
    """Determina si la instalación es en aire libre (usa I_max_aire)."""
    return tipo_canalizacion in {"bandeja_perforada", "bandeja_escalera", "aereo_libre"}


def is_buried_installation(tipo_canalizacion: str) -> bool:
    """Determina si la instalación es enterrada."""
    return tipo_canalizacion in {"enterrado_directo", "enterrado_ducto"}
