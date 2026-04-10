"""
Motor de cálculo — Corrección de Factor de Potencia / Banco de Condensadores.
Calcula la potencia reactiva a compensar, el banco estándar recomendado,
la reducción de corriente y el ahorro tarifario estimado.
"""
import math
from pydantic import BaseModel, field_validator

# Potencias estándar de bancos de condensadores trifásicos (kVAR)
POTENCIAS_STANDARD = [2.5, 5, 7.5, 10, 12.5, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 200]


class PowerFactorInput(BaseModel):
    potencia_kw: float               # Potencia activa total de la instalación
    fp_actual: float                 # Factor de potencia actual (0.1 - 0.99)
    fp_objetivo: float = 0.95        # Factor de potencia objetivo (0.9 - 0.99)
    tension_v: float = 380           # Tensión de línea (V)
    sistema: str = "trifasico"       # "trifasico" | "monofasico"
    frecuencia_hz: float = 50.0      # Hz (Chile = 50 Hz)
    horas_mensuales: float = 720.0   # Horas de operación al mes
    tarifa_kvarh: float = 0.05       # Tarifa energía reactiva (USD/kVARh)

    @field_validator("fp_actual")
    @classmethod
    def validate_fp_actual(cls, v: float) -> float:
        if v < 0.1 or v > 0.99:
            raise ValueError("fp_actual debe estar entre 0.1 y 0.99")
        return v

    @field_validator("fp_objetivo")
    @classmethod
    def validate_fp_objetivo(cls, v: float) -> float:
        if v > 0.99:
            raise ValueError("fp_objetivo no puede superar 0.99 (riesgo de sobrecorrección)")
        if v < 0.5:
            raise ValueError("fp_objetivo debe ser al menos 0.5")
        return v


class PowerFactorResult(BaseModel):
    fp_actual: float
    fp_objetivo: float
    potencia_activa_kw: float
    potencia_reactiva_antes_kvar: float
    potencia_reactiva_despues_kvar: float
    q_compensar_kvar: float           # kVAR a compensar
    q_banco_standard_kvar: float      # Potencia del banco estándar recomendado
    corriente_antes_a: float
    corriente_despues_a: float
    reduccion_corriente_pct: float
    capacitancia_por_fase_uf: float   # Solo para trifásico
    ahorro_mensual_usd: float
    ahorro_anual_usd: float
    advertencias: list[str]


def _seleccionar_banco_standard(q_kvar: float) -> float:
    """Retorna el banco estándar más cercano por encima del valor calculado."""
    for p in POTENCIAS_STANDARD:
        if p >= q_kvar:
            return p
    # Si supera el máximo, retorna el mayor disponible
    return POTENCIAS_STANDARD[-1]


def calcular_correccion_fp(inp: PowerFactorInput) -> PowerFactorResult:
    """
    Calcula la corrección de factor de potencia mediante banco de condensadores.

    Fórmulas:
    - Q_compensar = P × (tan(φ1) - tan(φ2))
    - I = P×1000 / (√3 × V × FP)  para trifásico
    - I = P×1000 / (V × FP)        para monofásico
    - C_fase = Q×1000 / (3 × 2π × f × V_fase²)  para trifásico
    """
    advertencias: list[str] = []

    fp_actual = inp.fp_actual
    fp_objetivo = inp.fp_objetivo
    p_kw = inp.potencia_kw

    # Caso especial: FP actual ya es mayor o igual al objetivo
    if fp_actual >= fp_objetivo:
        advertencias.append(
            "El FP actual ya es mayor al objetivo; no se requiere compensación"
        )
        # Devolver resultado con Q=0 y banco=0
        if inp.sistema == "trifasico":
            i_actual = p_kw * 1000 / (math.sqrt(3) * inp.tension_v * fp_actual)
        else:
            i_actual = p_kw * 1000 / (inp.tension_v * fp_actual)

        kvar_antes = p_kw * math.tan(math.acos(fp_actual))

        return PowerFactorResult(
            fp_actual=fp_actual,
            fp_objetivo=fp_objetivo,
            potencia_activa_kw=p_kw,
            potencia_reactiva_antes_kvar=round(kvar_antes, 3),
            potencia_reactiva_despues_kvar=round(kvar_antes, 3),
            q_compensar_kvar=0.0,
            q_banco_standard_kvar=0.0,
            corriente_antes_a=round(i_actual, 3),
            corriente_despues_a=round(i_actual, 3),
            reduccion_corriente_pct=0.0,
            capacitancia_por_fase_uf=0.0,
            ahorro_mensual_usd=0.0,
            ahorro_anual_usd=0.0,
            advertencias=advertencias,
        )

    # Ángulos de fase
    phi1 = math.acos(fp_actual)
    phi2 = math.acos(fp_objetivo)

    # Potencias reactivas
    kvar_antes = p_kw * math.tan(phi1)
    kvar_despues = p_kw * math.tan(phi2)
    q_compensar = kvar_antes - kvar_despues

    # Banco estándar recomendado
    q_banco = _seleccionar_banco_standard(q_compensar)

    # Corrientes
    if inp.sistema == "trifasico":
        i_actual = p_kw * 1000 / (math.sqrt(3) * inp.tension_v * fp_actual)
        i_corregida = p_kw * 1000 / (math.sqrt(3) * inp.tension_v * fp_objetivo)
    else:  # monofasico
        i_actual = p_kw * 1000 / (inp.tension_v * fp_actual)
        i_corregida = p_kw * 1000 / (inp.tension_v * fp_objetivo)

    reduccion_pct = (1 - i_corregida / i_actual) * 100

    # Capacitancia por fase (solo trifásico)
    if inp.sistema == "trifasico":
        v_fase = inp.tension_v / math.sqrt(3)
        omega = 2 * math.pi * inp.frecuencia_hz
        # C = Q / (3 × ω × V_fase²)  [F]  → convertir a μF
        capacitancia_f = (q_compensar * 1000) / (3 * omega * v_fase ** 2)
        capacitancia_uf = capacitancia_f * 1e6
    else:
        # Para monofásico: C = Q / (ω × V²)
        omega = 2 * math.pi * inp.frecuencia_hz
        capacitancia_f = (q_compensar * 1000) / (omega * inp.tension_v ** 2)
        capacitancia_uf = capacitancia_f * 1e6

    # Ahorro mensual estimado por reducción de kVARh penalizables
    ahorro_kvar = q_compensar  # kVAR reducidos
    ahorro_mensual = ahorro_kvar * inp.horas_mensuales * inp.tarifa_kvarh
    ahorro_anual = ahorro_mensual * 12

    # Advertencias adicionales
    if fp_actual < 0.5:
        advertencias.append("FP muy bajo (<0.5): considerar revisión de la instalación")
    if q_compensar > 1000:
        advertencias.append("Q a compensar muy elevado: considerar banco de condensadores automático escalonado")

    return PowerFactorResult(
        fp_actual=fp_actual,
        fp_objetivo=fp_objetivo,
        potencia_activa_kw=p_kw,
        potencia_reactiva_antes_kvar=round(kvar_antes, 3),
        potencia_reactiva_despues_kvar=round(kvar_despues, 3),
        q_compensar_kvar=round(q_compensar, 3),
        q_banco_standard_kvar=q_banco,
        corriente_antes_a=round(i_actual, 3),
        corriente_despues_a=round(i_corregida, 3),
        reduccion_corriente_pct=round(reduccion_pct, 3),
        capacitancia_por_fase_uf=round(capacitancia_uf, 3),
        ahorro_mensual_usd=round(ahorro_mensual, 2),
        ahorro_anual_usd=round(ahorro_anual, 2),
        advertencias=advertencias,
    )
