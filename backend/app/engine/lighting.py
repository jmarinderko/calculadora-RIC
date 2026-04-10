"""
Motor de cálculo de iluminación — Método Cavidades Zonales
Verificación según NCh 2/1984 (niveles mínimos de iluminancia)
"""
import math
from typing import Optional

from pydantic import BaseModel, field_validator

# Niveles mínimos de iluminancia según NCh 2/1984 (lux)
NIVELES_NCH_2: dict[str, int] = {
    "vivienda_habitacion": 100,
    "vivienda_cocina": 200,
    "vivienda_bano": 150,
    "oficina_trabajo_normal": 300,
    "oficina_dibujo": 500,
    "salon_clases": 300,
    "taller_trabajo_grueso": 200,
    "taller_trabajo_fino": 500,
    "pasillo": 100,
    "estacionamiento": 50,
    "bodega": 100,
    "hospital_sala_general": 300,
    "laboratorio": 500,
    "sala_reuniones": 300,
    "recepcion": 200,
}

# Etiquetas legibles para cada tipo de recinto
LABELS_RECINTO: dict[str, str] = {
    "vivienda_habitacion": "Vivienda — Habitación",
    "vivienda_cocina": "Vivienda — Cocina",
    "vivienda_bano": "Vivienda — Baño",
    "oficina_trabajo_normal": "Oficina — Trabajo normal",
    "oficina_dibujo": "Oficina — Dibujo técnico",
    "salon_clases": "Salón de clases",
    "taller_trabajo_grueso": "Taller — Trabajo grueso",
    "taller_trabajo_fino": "Taller — Trabajo fino",
    "pasillo": "Pasillo / Circulación",
    "estacionamiento": "Estacionamiento",
    "bodega": "Bodega",
    "hospital_sala_general": "Hospital — Sala general",
    "laboratorio": "Laboratorio",
    "sala_reuniones": "Sala de reuniones",
    "recepcion": "Recepción",
}


class LightingInput(BaseModel):
    largo_m: float                              # Largo del recinto (m)
    ancho_m: float                              # Ancho del recinto (m)
    altura_m: float                             # Altura total del recinto (m)
    altura_trabajo_m: float = 0.85              # Altura plano de trabajo (m)
    flujo_luminaria_lm: float                   # Flujo luminoso por luminaria (lm)
    tipo_recinto: str                           # Clave de NIVELES_NCH_2
    iluminancia_objetivo_lux: Optional[float] = None  # Si None, usar tabla NCh 2
    reflectancia_techo: float = 0.7             # 0.0-1.0
    reflectancia_paredes: float = 0.5           # 0.0-1.0
    factor_mantenimiento: float = 0.7           # fm (0.6-0.8)
    potencia_luminaria_w: float = 36.0          # W por luminaria (para potencia total)

    @field_validator('tipo_recinto')
    @classmethod
    def validar_tipo_recinto(cls, v: str) -> str:
        if v not in NIVELES_NCH_2:
            tipos = ', '.join(NIVELES_NCH_2.keys())
            raise ValueError(f"tipo_recinto '{v}' no reconocido. Opciones: {tipos}")
        return v

    @field_validator('reflectancia_techo', 'reflectancia_paredes')
    @classmethod
    def validar_reflectancia(cls, v: float) -> float:
        if not (0.0 <= v <= 1.0):
            raise ValueError("Reflectancia debe estar entre 0.0 y 1.0")
        return v

    @field_validator('factor_mantenimiento')
    @classmethod
    def validar_fm(cls, v: float) -> float:
        if not (0.3 <= v <= 1.0):
            raise ValueError("Factor de mantenimiento debe estar entre 0.3 y 1.0")
        return v


class LightingResult(BaseModel):
    iluminancia_objetivo_lux: float
    iluminancia_real_lux: float
    area_m2: float
    indice_local_k: float
    coeficiente_utilizacion: float
    factor_mantenimiento: float
    numero_luminarias: int
    filas: int
    columnas: int
    separacion_largo_m: float
    separacion_ancho_m: float
    potencia_instalada_w: float
    densidad_potencia_wm2: float      # W/m²
    cumple_nch2: bool
    nivel_minimo_nch2_lux: float
    advertencias: list[str]


def calcular_iluminacion(inp: LightingInput) -> LightingResult:
    """
    Calcula el número de luminarias y distribución usando el método de
    cavidades zonales. Verifica cumplimiento NCh 2/1984.
    """
    advertencias: list[str] = []

    # ── Paso 1: Índice del local k ────────────────────────────────────────────
    hm = inp.altura_m - inp.altura_trabajo_m  # altura de montaje sobre plano de trabajo
    if hm <= 0:
        raise ValueError(
            f"La altura de montaje (altura_m - altura_trabajo_m = {hm:.2f} m) "
            "debe ser positiva. Verifique que altura_m > altura_trabajo_m."
        )

    L, W = inp.largo_m, inp.ancho_m
    area_m2 = L * W
    k = (L * W) / (hm * (L + W))

    # ── Paso 2: Coeficiente de utilización (CU) ───────────────────────────────
    # Aproximación aceptable para diseño preliminar
    rho_medio = (inp.reflectancia_techo + inp.reflectancia_paredes) / 2.0
    cu = (k / (k + 2.0)) * (0.5 + 0.5 * rho_medio)

    # ── Paso 3: Iluminancia objetivo ──────────────────────────────────────────
    nivel_minimo_nch2 = float(NIVELES_NCH_2[inp.tipo_recinto])
    if inp.iluminancia_objetivo_lux is not None:
        e_objetivo = inp.iluminancia_objetivo_lux
    else:
        e_objetivo = nivel_minimo_nch2

    # ── Paso 4: Número de luminarias ──────────────────────────────────────────
    phi = inp.flujo_luminaria_lm
    fm = inp.factor_mantenimiento

    if phi <= 0:
        raise ValueError("El flujo luminoso por luminaria debe ser positivo.")
    if cu <= 0:
        raise ValueError("El coeficiente de utilización calculado es cero o negativo.")

    n_exacto = (e_objetivo * area_m2) / (phi * cu * fm)
    n = math.ceil(n_exacto)
    if n < 1:
        n = 1

    # ── Paso 5: Iluminancia real ──────────────────────────────────────────────
    e_real = (n * phi * cu * fm) / area_m2

    # ── Paso 6: Distribución ─────────────────────────────────────────────────
    # Filas = round(sqrt(N × W / L)), mínimo 1
    filas = max(1, round(math.sqrt(n * W / L)))
    columnas = math.ceil(n / filas)

    # Separaciones entre luminarias (entre paredes y entre luminarias)
    sep_largo = L / (columnas + 1)
    sep_ancho = W / (filas + 1)

    # ── Paso 7: Potencia instalada ────────────────────────────────────────────
    potencia_instalada_w = n * inp.potencia_luminaria_w
    densidad_potencia_wm2 = potencia_instalada_w / area_m2

    # ── Paso 8: Verificación NCh 2/1984 ──────────────────────────────────────
    cumple_nch2 = e_real >= nivel_minimo_nch2

    # ── Advertencias ─────────────────────────────────────────────────────────
    if not cumple_nch2:
        advertencias.append(
            f"La iluminancia real ({e_real:.0f} lux) no cumple el mínimo "
            f"NCh 2/1984 para '{inp.tipo_recinto}' ({nivel_minimo_nch2:.0f} lux)."
        )

    if densidad_potencia_wm2 > 15.0:
        advertencias.append(
            f"Densidad de potencia ({densidad_potencia_wm2:.1f} W/m²) supera la "
            "referencia de 15 W/m² para oficinas (revisar eficiencia luminaria)."
        )

    if inp.factor_mantenimiento < 0.6:
        advertencias.append(
            f"Factor de mantenimiento ({fm:.2f}) por debajo de 0.6. "
            "Valor típico: 0.6-0.8."
        )

    if sep_largo < 0.5 or sep_ancho < 0.5:
        advertencias.append(
            "Separación entre luminarias muy pequeña (< 0.5 m). "
            "Considere usar luminarias de menor flujo o aumentar dimensiones."
        )

    if inp.iluminancia_objetivo_lux is not None and inp.iluminancia_objetivo_lux < nivel_minimo_nch2:
        advertencias.append(
            f"La iluminancia objetivo ({inp.iluminancia_objetivo_lux:.0f} lux) es inferior "
            f"al mínimo NCh 2/1984 ({nivel_minimo_nch2:.0f} lux) para '{inp.tipo_recinto}'."
        )

    return LightingResult(
        iluminancia_objetivo_lux=round(e_objetivo, 1),
        iluminancia_real_lux=round(e_real, 1),
        area_m2=round(area_m2, 2),
        indice_local_k=round(k, 3),
        coeficiente_utilizacion=round(cu, 4),
        factor_mantenimiento=fm,
        numero_luminarias=n,
        filas=filas,
        columnas=columnas,
        separacion_largo_m=round(sep_largo, 3),
        separacion_ancho_m=round(sep_ancho, 3),
        potencia_instalada_w=round(potencia_instalada_w, 1),
        densidad_potencia_wm2=round(densidad_potencia_wm2, 2),
        cumple_nch2=cumple_nch2,
        nivel_minimo_nch2_lux=nivel_minimo_nch2,
        advertencias=advertencias,
    )
