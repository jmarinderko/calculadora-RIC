"""Pydantic schemas para el motor de cálculo RIC."""
from pydantic import BaseModel, Field
from typing import Optional, Literal


class CalculatorInput(BaseModel):
    # Sistema eléctrico
    sistema: Literal["trifasico", "bifasico", "monofasico"] = "trifasico"

    # Parámetros eléctricos
    tension_v: float = Field(..., gt=0, description="Tensión de servicio en voltios")
    potencia_kw: float = Field(..., gt=0, description="Potencia de la carga en kW")
    factor_potencia: float = Field(0.85, ge=0.5, le=1.0, description="cos φ")
    factor_demanda: float = Field(1.0, ge=1.0, le=2.0, description="Factor de demanda RIC Art. 5.2")
    longitud_m: float = Field(..., gt=0, description="Longitud del circuito en metros")

    # Instalación
    material: Literal["cu", "al"] = "cu"
    tipo_canalizacion: Literal[
        "ducto_pvc", "ducto_metalico", "bandeja_perforada",
        "bandeja_escalera", "enterrado_directo", "enterrado_ducto", "aereo_libre"
    ] = "ducto_pvc"
    temp_ambiente_c: int = Field(30, description="Temperatura ambiente °C")
    circuitos_agrupados: int = Field(1, ge=1, description="Número de circuitos agrupados")
    msnm: float = Field(0.0, ge=0, le=5500, description="Altitud de instalación msnm")
    montaje: Literal["vista", "banco", "oculto"] = "vista"

    # Tipo de circuito
    tipo_circuito: Literal["alumbrado", "fuerza", "tomacorrientes", "motor", "alimentador"] = "fuerza"

    # Opciones avanzadas
    limite_caida_pct: Optional[float] = Field(None, description="Límite caída de tensión %. Si None, se usa el del tipo_circuito")
    cables_por_fase: int = Field(0, ge=0, le=3, description="Cables por fase: 0=automático")

    # Override manual de sección (editor visual)
    seccion_forzada_mm2: Optional[float] = Field(None, description="Forzar sección específica — omite búsqueda térmica")

    # Estrés térmico (opcional)
    icc_ka: Optional[float] = Field(None, gt=0, description="Corriente de cortocircuito kA")
    tiempo_cc_s: Optional[float] = Field(None, gt=0, description="Tiempo de despeje de falla en segundos")
    tipo_falla: Literal["3f", "2f", "2ft", "1ft"] = "3f"
    t_inicial_c: float = Field(75.0, description="Temperatura inicial del conductor °C")
    t_max_c: float = Field(160.0, description="Temperatura máxima admisible °C")


class RadioCurvatura(BaseModel):
    radio_mm: float
    radio_interno_mm: float
    diametro_mm: float
    factor: int
    descripcion_factor: str
    tipo_constructivo: str
    montaje: str


class EstresTermico(BaseModel):
    icc_efectiva_ka: float
    factor_falla: float
    tipo_falla: str
    k_const: int
    es_xlpe: bool
    sec_min_termica_mm2: float
    icc_max_soportada_ka: float
    i2t_ja: float
    i2t_max_ja: float
    ratio_saturacion: float
    t_final_estimada_c: float
    t_max_c: float
    cumple: bool


class CalculatorResult(BaseModel):
    seccion_mm2: float
    calibre_awg: str
    cables_por_fase: int
    material: str
    i_diseno_a: float
    i_calc_a: float
    i_req_a: float
    i_max_corregida_a: float
    caida_pct: float
    caida_v: float
    limite_caida_pct: float
    cumple_termico: bool
    cumple_caida: bool
    cumple: bool
    ft: float
    fg: float
    fa: float
    factor_total: float
    sec_neutro_mm2: float
    sec_tierra_mm2: float
    descripcion_config: str
    radio_curvatura: RadioCurvatura
    estres_termico: Optional[EstresTermico] = None
    ajustado_por_minimo: bool = False
    ajustado_por_caida: bool = False
    sec_min_ric_mm2: float
    advertencias: list[str]


class CalculatorResponse(BaseModel):
    ok: bool
    resultado: CalculatorResult
    advertencias: list[str]
