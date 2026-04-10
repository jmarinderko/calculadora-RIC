"""
Motor de cálculo: Árbol de caída de tensión acumulada (RIC Art. 5.5.4).
Calcula la caída de tensión individual por tramo y la acumulada desde el origen.
"""
import math
from typing import List

from pydantic import BaseModel, Field

# Resistividad del conductor (Ω·mm²/m) a 20°C
RHO = {
    "cu": 0.01724,   # Cobre
    "al": 0.02826,   # Aluminio
}

# Límites de caída por tipo de circuito (RIC Art. 5.5.4)
LIMITES_CAIDA = {
    "alumbrado":      2.0,
    "fuerza":         3.0,
    "tomacorrientes": 3.0,
    "motor":          3.0,
    "alimentador":    3.0,
}
LIMITE_TOTAL = 5.0  # La caída total acumulada nunca debe superar 5%


class TramoInput(BaseModel):
    model_config = {"extra": "forbid"}

    nombre: str = Field(..., description="Nombre descriptivo del tramo")
    sistema: str = Field(..., description="monofasico | bifasico | trifasico")
    tension_v: float = Field(..., gt=0, description="Tensión nominal del tramo (V)")
    potencia_kw: float = Field(..., gt=0, description="Carga del tramo (kW)")
    factor_potencia: float = Field(0.85, gt=0, le=1, description="Factor de potencia")
    longitud_m: float = Field(..., gt=0, description="Longitud del tramo (m)")
    seccion_mm2: float = Field(..., gt=0, description="Sección del conductor (mm²)")
    material: str = Field("cu", description="Material: cu | al")
    tipo_circuito: str = Field("fuerza", description="Tipo de circuito para límite RIC")


class VoltageDropTreeInput(BaseModel):
    model_config = {"extra": "forbid"}

    tramos: List[TramoInput] = Field(..., min_length=1, description="Tramos en orden desde origen")
    tension_origen_v: float = Field(..., gt=0, description="Tensión en el origen (V)")


class TramoResult(BaseModel):
    nombre: str
    i_a: float
    caida_v: float
    caida_pct: float
    caida_acumulada_v: float
    caida_acumulada_pct: float
    tension_final_v: float
    limite_pct: float
    cumple: bool


class VoltageDropTreeResult(BaseModel):
    tramos: List[TramoResult]
    caida_total_pct: float
    cumple_total: bool
    advertencias: List[str]


def _calcular_corriente(sistema: str, potencia_kw: float, tension_v: float, fp: float) -> float:
    """Calcula la corriente del tramo en amperios."""
    potencia_w = potencia_kw * 1000.0
    if sistema == "trifasico":
        return potencia_w / (math.sqrt(3) * tension_v * fp)
    else:
        # monofasico y bifasico
        return potencia_w / (tension_v * fp)


def _calcular_caida_tramo(sistema: str, i_a: float, rho: float,
                           seccion_mm2: float, longitud_m: float, tension_v: float) -> tuple[float, float]:
    """
    Calcula la caída de tensión del tramo.
    Retorna (caida_v, caida_pct).
    - Monofásico/bifásico: ΔV = 2 × I × (ρ/S) × L
    - Trifásico: ΔV = √3 × I × (ρ/S) × L
    """
    r_ohm_per_m = rho / seccion_mm2  # Ω/m
    if sistema == "trifasico":
        caida_v = math.sqrt(3) * i_a * r_ohm_per_m * longitud_m
    else:
        caida_v = 2 * i_a * r_ohm_per_m * longitud_m
    caida_pct = (caida_v / tension_v) * 100
    return caida_v, caida_pct


def calcular_arbol_caida(data: VoltageDropTreeInput) -> VoltageDropTreeResult:
    """
    Calcula la caída de tensión acumulada para un árbol de circuitos en serie.
    Cada tramo usa su propia tensión nominal para el cálculo individual,
    pero la tensión real al inicio del tramo decrece progresivamente.
    """
    advertencias: list[str] = []
    resultados: list[TramoResult] = []

    caida_acumulada_v = 0.0
    tension_actual_v = data.tension_origen_v

    for tramo in data.tramos:
        # Validar material
        material = tramo.material.lower()
        if material not in RHO:
            raise ValueError(f"Material '{tramo.material}' no reconocido. Use 'cu' o 'al'.")

        # Validar sistema
        sistema = tramo.sistema.lower()
        if sistema not in ("monofasico", "bifasico", "trifasico"):
            raise ValueError(f"Sistema '{tramo.sistema}' no reconocido.")

        rho = RHO[material]

        # Corriente calculada usando la tensión nominal del tramo
        i_a = _calcular_corriente(sistema, tramo.potencia_kw, tramo.tension_v, tramo.factor_potencia)

        # Caída del tramo (usando tensión nominal para % individual)
        caida_v, caida_pct = _calcular_caida_tramo(
            sistema, i_a, rho, tramo.seccion_mm2, tramo.longitud_m, tramo.tension_v
        )

        # Acumulación
        caida_acumulada_v += caida_v
        caida_acumulada_pct = (caida_acumulada_v / data.tension_origen_v) * 100

        # Tensión al final del tramo
        tension_final_v = tension_actual_v - caida_v
        tension_actual_v = tension_final_v

        # Límite aplicable
        tipo = tramo.tipo_circuito.lower()
        limite_pct = LIMITES_CAIDA.get(tipo, 3.0)

        # El tramo cumple si la caída acumulada no supera el límite del tipo Y el límite total
        cumple = caida_acumulada_pct <= limite_pct and caida_acumulada_pct <= LIMITE_TOTAL

        # Advertencias
        if not cumple:
            if caida_acumulada_pct > LIMITE_TOTAL:
                advertencias.append(
                    f"Tramo '{tramo.nombre}': caída acumulada {caida_acumulada_pct:.2f}% "
                    f"supera el límite total de {LIMITE_TOTAL}%"
                )
            else:
                advertencias.append(
                    f"Tramo '{tramo.nombre}': caída acumulada {caida_acumulada_pct:.2f}% "
                    f"supera el límite de {limite_pct}% para circuito tipo '{tipo}'"
                )

        resultados.append(TramoResult(
            nombre=tramo.nombre,
            i_a=round(i_a, 4),
            caida_v=round(caida_v, 4),
            caida_pct=round(caida_pct, 4),
            caida_acumulada_v=round(caida_acumulada_v, 4),
            caida_acumulada_pct=round(caida_acumulada_pct, 4),
            tension_final_v=round(tension_final_v, 4),
            limite_pct=limite_pct,
            cumple=cumple,
        ))

    caida_total_pct = resultados[-1].caida_acumulada_pct if resultados else 0.0
    cumple_total = caida_total_pct <= LIMITE_TOTAL

    if not cumple_total and not advertencias:
        advertencias.append(
            f"Caída total acumulada {caida_total_pct:.2f}% supera el límite máximo de {LIMITE_TOTAL}%"
        )

    return VoltageDropTreeResult(
        tramos=resultados,
        caida_total_pct=round(caida_total_pct, 4),
        cumple_total=cumple_total,
        advertencias=advertencias,
    )
