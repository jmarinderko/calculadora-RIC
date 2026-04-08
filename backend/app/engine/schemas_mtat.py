"""
Pydantic schemas para el motor de cálculo MT/AT.
IEC 60502-2 / IEC 60287 / IEC 60949 / IEC 60724
"""
from pydantic import BaseModel, Field
from typing import Optional, Literal


# ── Tipos comunes ──────────────────────────────────────────────────────────────

NivelTension = Literal[
    "mt_1_7kv", "mt_7_12kv", "mt_12_24kv", "mt_24_36kv",
    "at_36_72kv", "at_72_145kv", "at_145_220kv",
]

MaterialMtat = Literal["cu", "al"]

AislamientoMtat = Literal["xlpe", "epr"]

TipoInstalacionMtat = Literal[
    "aereo_trifol",        # Trébol al aire
    "aereo_plano",         # Plano al aire
    "enterrado_directo",   # Enterrado directo
    "enterrado_ducto",     # En ducto enterrado
    "ducto_subterraneo",   # Ducto en galería
]

TipoFallaMtat = Literal["3f", "2f", "2ft", "1ft"]


# ── Input ──────────────────────────────────────────────────────────────────────

class MtatInput(BaseModel):
    """Parámetros de entrada para cálculo de conductor MT/AT."""

    # Nivel de tensión y tensión nominal
    nivel_tension: NivelTension = Field(..., description="Nivel de tensión del sistema")
    tension_kv: float = Field(..., gt=0, description="Tensión nominal del sistema en kV")

    # Definición de la carga
    potencia_kw: Optional[float] = Field(None, gt=0, description="Potencia activa kW (alternativa a corriente)")
    corriente_a: Optional[float] = Field(None, gt=0, description="Corriente de diseño A (alternativa a potencia)")
    factor_potencia: float = Field(0.90, ge=0.5, le=1.0, description="cos φ")
    factor_demanda: float = Field(1.0, ge=1.0, le=2.0, description="Factor de demanda")

    # Circuito
    longitud_km: float = Field(..., gt=0, description="Longitud del circuito en km")

    # Conductor
    material: MaterialMtat = "cu"
    aislamiento: AislamientoMtat = "xlpe"
    tipo_instalacion: TipoInstalacionMtat = "enterrado_directo"

    # Corrección ambiental
    temp_ambiente_c: int = Field(25, description="Temperatura ambiente °C (aire) o del suelo (enterrado)")
    circuitos_agrupados: int = Field(1, ge=1, le=12, description="Circuitos en paralelo en la misma zanja")
    profundidad_m: float = Field(0.8, ge=0.3, le=5.0, description="Profundidad de enterrado m (solo enterrado)")
    resistividad_suelo: float = Field(1.0, ge=0.3, le=4.0, description="Resistividad térmica del suelo K·m/W")

    # Límite caída de tensión
    limite_caida_pct: float = Field(2.0, gt=0, le=10.0, description="Límite caída de tensión %")

    # Sección forzada (override)
    seccion_forzada_mm2: Optional[float] = Field(None, description="Forzar sección específica mm²")

    # Cortocircuito y estrés térmico
    icc_ka: Optional[float] = Field(None, gt=0, description="Corriente de cortocircuito kA")
    tiempo_cc_s: Optional[float] = Field(None, gt=0, description="Tiempo de despeje de falla s")
    tipo_falla: TipoFallaMtat = "3f"


# ── Sub-resultados ─────────────────────────────────────────────────────────────

class EstresTermicoMtat(BaseModel):
    """Verificación de estrés térmico por cortocircuito — IEC 60949."""
    icc_efectiva_ka: float
    factor_falla: float
    tipo_falla: str
    k_const: int
    aislamiento: str
    sec_min_termica_mm2: float
    icc_max_soportada_ka: float
    i2t_ja: float
    i2t_max_ja: float
    ratio_saturacion: float
    t_inicial_c: float
    t_max_cc_c: float
    t_final_estimada_c: float
    cumple: bool


class ImpedanciaCircuito(BaseModel):
    """Impedancia compleja del circuito — IEC 60287."""
    r_ac_ohm_km: float          # Resistencia AC a T° operación
    x_ohm_km: float             # Reactancia inductiva
    z_ohm_km: float             # Módulo impedancia
    r_total_ohm: float          # R total circuito (ida+vuelta trifásico: √3 factor)
    x_total_ohm: float
    z_total_ohm: float
    angulo_grados: float


class FactoresCorreccion(BaseModel):
    """Factores de corrección aplicados."""
    ft: float               # Factor temperatura
    fg: float               # Factor agrupamiento
    fp: float               # Factor profundidad (enterrado)
    fr: float               # Factor resistividad suelo (enterrado)
    factor_total: float
    temp_c: int
    n_circuitos: int
    profundidad_m: Optional[float]
    resistividad: Optional[float]


# ── Resultado principal ────────────────────────────────────────────────────────

class MtatResult(BaseModel):
    """Resultado completo del cálculo MT/AT."""

    # Sección seleccionada
    seccion_mm2: float
    material: str
    aislamiento: str
    nivel_tension: str
    tension_kv: float

    # Corrientes
    i_diseno_a: float
    i_calc_a: float             # I_diseño × Fd
    i_req_a: float              # I_calc / factor_total (lo que debe soportar la tabla)
    i_max_corregida_a: float    # Ampacidad tabla × factor_total

    # Caída de tensión — cálculo con impedancia compleja
    caida_v: float
    caida_pct: float
    limite_caida_pct: float
    caida_r_v: float            # Componente resistiva ΔV
    caida_x_v: float            # Componente reactiva ΔV

    # Cumplimiento
    cumple_termico: bool
    cumple_caida: bool
    cumple: bool

    # Factores y ajustes
    factores: FactoresCorreccion
    ajustado_por_caida: bool
    ajustado_por_minimo: bool
    sec_min_nivel_mm2: float

    # Impedancia del circuito
    impedancia: ImpedanciaCircuito

    # Pérdidas
    perdidas_kw: float
    perdidas_pct: float

    # Estrés térmico (opcional)
    estres_termico: Optional[EstresTermicoMtat] = None

    # Conductores de tierra (referencia)
    sec_tierra_mm2: float

    # Advertencias
    advertencias: list[str]


class MtatResponse(BaseModel):
    """Respuesta de la API MT/AT."""
    ok: bool
    resultado: MtatResult
    advertencias: list[str]
