"""
Motor de cálculo — Puesta a tierra RIC Art. 3.12
Electrodos: varilla, cable horizontal, malla rectangular, múltiples varillas en paralelo.
"""
import math
from typing import Optional

from pydantic import BaseModel, field_validator


# Resistividades típicas del suelo (orientativas, no normativas) en Ω·m
RESISTIVIDADES = {
    "pantanoso": 30,
    "arcilla_humeda": 100,
    "arcilla_seca": 200,
    "arena_humeda": 300,
    "arena_seca": 1000,
    "roca": 3000,
}

# Factores de interferencia para múltiples varillas no optimamente espaciadas
FACTOR_INTERFERENCIA = {
    2: 0.66,
    3: 0.58,
    4: 0.52,
}

# Resistencia máxima requerida por tipo de instalación (Ω), excepto TN
RESISTENCIA_MAX = {
    "general": 25.0,
    "medica": 5.0,
    "sobretension": 10.0,
}


class GroundingInput(BaseModel):
    tipo_electrodo: str           # "varilla" | "malla" | "cable_horizontal" | "multiple_varillas"
    resistividad_suelo: float     # Ω·m

    # Para varillas
    longitud_varilla_m: float = 2.4       # m (estándar: 1.5, 2.4, 3.0)
    diametro_varilla_m: float = 0.016     # m (estándar: 16mm)
    numero_varillas: int = 1
    espaciado_varillas_m: float = 5.0     # m (debe ser >= 2×longitud para máxima eficiencia)

    # Para cable horizontal
    longitud_cable_m: float = 30.0
    diametro_cable_m: float = 0.010
    profundidad_m: float = 0.6

    # Para malla
    ancho_malla_m: float = 10.0
    largo_malla_m: float = 10.0

    # Requisito
    tipo_instalacion: str = "general"     # "general" | "medica" | "sobretension" | "tn"
    corriente_disparo_a: Optional[float] = None  # solo para tipo_instalacion="tn"

    @field_validator("tipo_electrodo")
    @classmethod
    def validar_tipo_electrodo(cls, v: str) -> str:
        opciones = {"varilla", "malla", "cable_horizontal", "multiple_varillas"}
        if v not in opciones:
            raise ValueError(f"tipo_electrodo debe ser uno de: {opciones}")
        return v

    @field_validator("tipo_instalacion")
    @classmethod
    def validar_tipo_instalacion(cls, v: str) -> str:
        opciones = {"general", "medica", "sobretension", "tn"}
        if v not in opciones:
            raise ValueError(f"tipo_instalacion debe ser uno de: {opciones}")
        return v

    @field_validator("resistividad_suelo")
    @classmethod
    def validar_resistividad(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("resistividad_suelo debe ser positiva")
        return v


class GroundingResult(BaseModel):
    tipo_electrodo: str
    resistencia_calculada_ohm: float
    resistencia_requerida_ohm: float
    cumple: bool
    descripcion_electrodo: str
    recomendacion: str
    advertencias: list[str]


def _calc_varilla(rho: float, L: float, d: float) -> float:
    """
    Resistencia de una varilla vertical enterrada.
    R = (ρ / (2π·L)) × (ln(4L/d) - 1)
    """
    return (rho / (2 * math.pi * L)) * (math.log(4 * L / d) - 1)


def _calc_cable_horizontal(rho: float, L: float, d: float, h: float) -> float:
    """
    Resistencia de cable horizontal enterrado.
    R = (ρ / (2π·L)) × (ln(2L²/(d·h)) + 0.5)
    """
    return (rho / (2 * math.pi * L)) * (math.log(2 * L**2 / (d * h)) + 0.5)


def _calc_malla(rho: float, A: float) -> float:
    """
    Resistencia de malla rectangular.
    r = √(A/π), R = ρ × (1/(4r) + 1/√A)
    """
    r = math.sqrt(A / math.pi)
    return rho * (1 / (4 * r) + 1 / math.sqrt(A))


def _resistencia_requerida(tipo_instalacion: str, corriente_disparo_a: Optional[float]) -> float:
    """Retorna la resistencia máxima requerida en Ω."""
    if tipo_instalacion == "tn":
        if corriente_disparo_a and corriente_disparo_a > 0:
            return 50.0 / corriente_disparo_a
        else:
            # Sin corriente de disparo, usar límite general
            return 25.0
    return RESISTENCIA_MAX.get(tipo_instalacion, 25.0)


def calcular_puesta_tierra(inp: GroundingInput) -> GroundingResult:
    """Calcula la resistencia de puesta a tierra según RIC Art. 3.12."""
    advertencias: list[str] = []
    rho = inp.resistividad_suelo

    # ── Cálculo según tipo de electrodo ──────────────────────────────────────

    if inp.tipo_electrodo == "varilla":
        R = _calc_varilla(rho, inp.longitud_varilla_m, inp.diametro_varilla_m)
        descripcion = (
            f"Varilla vertical: L={inp.longitud_varilla_m} m, "
            f"d={inp.diametro_varilla_m*1000:.0f} mm, ρ={rho} Ω·m"
        )

    elif inp.tipo_electrodo == "multiple_varillas":
        R_individual = _calc_varilla(rho, inp.longitud_varilla_m, inp.diametro_varilla_m)
        N = inp.numero_varillas
        espaciado_min = 2 * inp.longitud_varilla_m

        if N < 1:
            raise ValueError("numero_varillas debe ser >= 1")

        if N == 1:
            R = R_individual
            descripcion = (
                f"Varilla vertical única: L={inp.longitud_varilla_m} m, "
                f"d={inp.diametro_varilla_m*1000:.0f} mm, ρ={rho} Ω·m"
            )
        elif inp.espaciado_varillas_m >= espaciado_min:
            # Sin interferencia: R_total = R_individual / N
            R = R_individual / N
            descripcion = (
                f"{N} varillas en paralelo (sin interferencia): "
                f"L={inp.longitud_varilla_m} m, espaciado={inp.espaciado_varillas_m} m >= {espaciado_min} m"
            )
        else:
            # Con interferencia
            k = FACTOR_INTERFERENCIA.get(N, 0.5)
            R = (R_individual * k) / N
            advertencias.append(
                f"Espaciado {inp.espaciado_varillas_m} m < {espaciado_min} m recomendados para {N} varillas. "
                f"Se aplica factor de interferencia k={k}."
            )
            descripcion = (
                f"{N} varillas en paralelo (con interferencia k={k}): "
                f"L={inp.longitud_varilla_m} m, espaciado={inp.espaciado_varillas_m} m"
            )

    elif inp.tipo_electrodo == "cable_horizontal":
        R = _calc_cable_horizontal(
            rho, inp.longitud_cable_m, inp.diametro_cable_m, inp.profundidad_m
        )
        descripcion = (
            f"Cable horizontal enterrado: L={inp.longitud_cable_m} m, "
            f"d={inp.diametro_cable_m*1000:.0f} mm, h={inp.profundidad_m} m, ρ={rho} Ω·m"
        )
        if inp.profundidad_m < 0.5:
            advertencias.append(
                "Profundidad de enterramiento < 0.5 m. RIC recomienda mínimo 0.6 m."
            )

    elif inp.tipo_electrodo == "malla":
        A = inp.ancho_malla_m * inp.largo_malla_m
        R = _calc_malla(rho, A)
        descripcion = (
            f"Malla rectangular: {inp.ancho_malla_m} m × {inp.largo_malla_m} m = {A} m², "
            f"ρ={rho} Ω·m"
        )
    else:
        raise ValueError(f"tipo_electrodo no reconocido: {inp.tipo_electrodo}")

    R = round(R, 4)

    # ── Requisito RIC ─────────────────────────────────────────────────────────
    R_req = _resistencia_requerida(inp.tipo_instalacion, inp.corriente_disparo_a)
    R_req = round(R_req, 4)
    cumple = R <= R_req

    # ── Advertencias adicionales ──────────────────────────────────────────────
    if rho > 2000:
        advertencias.append(
            "Resistividad muy alta (>2000 Ω·m). Considere tratamiento químico del suelo o malla extendida."
        )

    if inp.tipo_instalacion == "tn" and inp.corriente_disparo_a is None:
        advertencias.append(
            "Para instalación TN se requiere la corriente de disparo (Ia) del protector. "
            "Se usó el límite general de 25 Ω."
        )

    # ── Recomendación ─────────────────────────────────────────────────────────
    if cumple:
        recomendacion = (
            f"El electrodo cumple RIC Art. 3.12. "
            f"R={R} Ω ≤ {R_req} Ω requeridos para instalación {inp.tipo_instalacion}."
        )
    else:
        margen = R - R_req
        if inp.tipo_electrodo in ("varilla", "multiple_varillas"):
            recomendacion = (
                f"No cumple (R={R} Ω > {R_req} Ω). "
                f"Considere agregar más varillas en paralelo o aumentar la longitud de las varillas."
            )
        elif inp.tipo_electrodo == "malla":
            recomendacion = (
                f"No cumple (R={R} Ω > {R_req} Ω). "
                f"Amplíe el área de la malla o combine con electrodos adicionales."
            )
        else:
            recomendacion = (
                f"No cumple (R={R} Ω > {R_req} Ω). "
                f"Aumente la longitud del cable enterrado o combine con otros electrodos."
            )

    return GroundingResult(
        tipo_electrodo=inp.tipo_electrodo,
        resistencia_calculada_ohm=R,
        resistencia_requerida_ohm=R_req,
        cumple=cumple,
        descripcion_electrodo=descripcion,
        recomendacion=recomendacion,
        advertencias=advertencias,
    )
