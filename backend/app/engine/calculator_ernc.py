"""
Motor de cálculo ERNC — Energía Renovable No Convencional (Solar FV / Baterías)

Topologías soportadas:
  1. string_dc   — String fotovoltaico DC, cable ZZ-F, Voc/Isc de panel
  2. ac_inversor — Salida AC de inversor → tablero BT, reutiliza lógica RIC
  3. gd_red_bt   — Generación Distribuida inyección a red BT (NTCO SEC Chile)
  4. baterias_dc — Enlace DC sistema de baterías estacionarias

Normas de referencia:
  - IEC 60364-7-712     → Instalaciones fotovoltaicas
  - IEC 62548           → Diseño sistemas FV
  - EN 50618 / IEC 62930 → Cable solar ZZ-F
  - RIC     → RIC Chile (tramos AC)
  - NTCO SEC (2020)     → Normativa técnica conexión obras (GD Chile)
  - NEC 690             → Referencia complementaria (EE.UU.)
"""
import math
from typing import Optional

from pydantic import BaseModel, Field

from app.engine.ernc_tables import (
    TABLA_ZZF, ZZFRow,
    SEC_MIN_DC_MM2, SEC_MIN_AC_MM2,
    FACTOR_ISC_DC, FACTOR_BATERIAS,
    LIMITE_CAIDA_DC_STRING_PCT, LIMITE_CAIDA_AC_INVERSOR_PCT,
    LIMITE_CAIDA_GD_RED_PCT, LIMITE_CAIDA_BATERIAS_PCT,
    get_r_ohm_per_m, get_voc_maxima, get_voc_minima,
    get_temp_factor_zzf, buscar_seccion_zzf,
)
from app.engine.ric_tables import (
    TABLA_RIC, RicRow,
    get_temp_factor, get_grouping_factor,
    is_air_installation,
)


# ══════════════════════════════════════════════════════════════════════════════
# Schemas Pydantic de entrada y salida
# ══════════════════════════════════════════════════════════════════════════════

class ERNCStringDCInput(BaseModel):
    """Entrada para topología String DC fotovoltaico."""
    potencia_wp: float = Field(..., gt=0, description="Potencia pico del string (Wp)")
    voc_stc_v: float = Field(..., gt=0, description="Tensión Voc del string a STC (V)")
    isc_stc_a: float = Field(..., gt=0, description="Corriente Isc del string a STC (A)")
    temp_min_c: float = Field(..., description="Temperatura mínima ambiente (°C), ej: -10 Atacama")
    temp_max_c: float = Field(..., description="Temperatura máxima ambiente (°C), ej: 40")
    longitud_m: float = Field(..., gt=0, description="Longitud del cable (m), ida simple")
    material: str = Field("cu", pattern="^(cu|al)$", description="Material: cu (cobre, recomendado para DC)")
    en_ducto: bool = Field(False, description="True si el cable va dentro de ducto/conduit")
    noct_c: float = Field(45.0, description="NOCT del panel en °C")
    coef_voc_pct: float = Field(-0.29, description="Coeficiente Voc temperatura (%/°C), típico -0.29")
    limite_caida_pct: Optional[float] = Field(None, description="Límite ΔV%, defecto 1.5%")


class ERNCAcInversorInput(BaseModel):
    """Entrada para topología AC Inversor → tablero BT."""
    potencia_kw: float = Field(..., gt=0, description="Potencia nominal inversor (kW)")
    tension_v: float = Field(..., gt=0, description="Tensión AC línea (V), ej: 380 trifásico")
    sistema: str = Field("trifasico", pattern="^(trifasico|monofasico)$")
    cos_phi: float = Field(1.0, ge=0.8, le=1.0, description="Factor de potencia inversor (típico 1.0 o 0.9 cap.)")
    longitud_m: float = Field(..., gt=0, description="Longitud del tramo AC (m)")
    material: str = Field("cu", pattern="^(cu|al)$")
    tipo_canalizacion: str = Field("ducto_pvc", description="Tipo canalización (igual que BT)")
    temp_ambiente_c: int = Field(30, description="Temperatura ambiente (°C)")
    circuitos_agrupados: int = Field(1, ge=1)
    msnm: float = Field(0.0, ge=0)
    limite_caida_pct: Optional[float] = Field(None, description="Límite ΔV%, defecto 1.5%")


class ERNCGdRedBtInput(BaseModel):
    """Entrada para Generación Distribuida — inyección a red BT (NTCO SEC)."""
    potencia_kw: float = Field(..., gt=0, description="Potencia nominal GD (kW)")
    tension_v: float = Field(380.0, gt=0, description="Tensión de interconexión (V)")
    sistema: str = Field("trifasico", pattern="^(trifasico|monofasico)$")
    cos_phi: float = Field(1.0, ge=0.8, le=1.0)
    longitud_m: float = Field(..., gt=0, description="Longitud tramo desde inversor a punto conexión red (m)")
    material: str = Field("cu", pattern="^(cu|al)$")
    tipo_canalizacion: str = Field("ducto_pvc")
    temp_ambiente_c: int = Field(30)
    circuitos_agrupados: int = Field(1, ge=1)
    msnm: float = Field(0.0, ge=0)
    limite_caida_pct: Optional[float] = Field(None, description="Límite ΔV%, defecto 1.5%")
    # Datos adicionales GD
    potencia_instalada_kw: Optional[float] = Field(None, description="Potencia total instalación GD (kW)")
    numero_fases_interconexion: int = Field(3, ge=1, le=3, description="Fases punto conexión distribuidora")


class ERNCBateriasDCInput(BaseModel):
    """Entrada para enlace DC sistema de baterías."""
    potencia_w: float = Field(..., gt=0, description="Potencia máxima de carga/descarga (W)")
    tension_banco_v: float = Field(..., gt=0, description="Tensión nominal banco de baterías (V)")
    longitud_m: float = Field(..., gt=0, description="Longitud del cable DC (m), ida simple")
    material: str = Field("cu", pattern="^(cu|al)$")
    en_ducto: bool = Field(False)
    temp_ambiente_c: int = Field(30)
    limite_caida_pct: Optional[float] = Field(None, description="Límite ΔV%, defecto 1.0%")


# ── Resultado genérico ERNC ───────────────────────────────────────────────────

class ERNCResult(BaseModel):
    topologia: str
    seccion_mm2: float
    material: str
    tipo_cable: str                  # "ZZ-F", "THW", etc.
    i_diseno_a: float
    i_max_admisible_a: float
    caida_pct: float
    caida_v: float
    limite_caida_pct: float
    cumple_termico: bool
    cumple_caida: bool
    cumple: bool
    longitud_m: float
    # DC-específico
    voc_max_v: Optional[float] = None
    voc_min_v: Optional[float] = None
    i_cortocircuito_diseno_a: Optional[float] = None
    # Extra
    factor_temperatura: Optional[float] = None
    advertencias: list[str] = []
    descripcion: str = ""


class ERNCResponse(BaseModel):
    ok: bool
    topologia: str
    resultado: ERNCResult
    advertencias: list[str] = []


# ══════════════════════════════════════════════════════════════════════════════
# Funciones auxiliares internas
# ══════════════════════════════════════════════════════════════════════════════

def _caida_dc(i_a: float, r_ohm_per_m: float, longitud_m: float, tension_v: float) -> tuple[float, float]:
    """
    Caída de tensión en circuito DC (ida + vuelta = 2L).
    ΔV = 2 × L × I × ρ/S = 2 × L × I × R_por_m
    """
    dv = 2 * longitud_m * i_a * r_ohm_per_m
    dv_pct = (dv / tension_v) * 100
    return dv, dv_pct


def _caida_ac(sistema: str, i_a: float, r_ohm_per_m: float,
              longitud_m: float, tension_v: float) -> tuple[float, float]:
    """Caída de tensión en circuito AC (reutiliza lógica BT)."""
    if sistema == "trifasico":
        dv = math.sqrt(3) * i_a * r_ohm_per_m * longitud_m
        dv_pct = (dv / tension_v) * 100
    else:  # monofasico
        dv = 2 * i_a * r_ohm_per_m * longitud_m
        dv_pct = (dv / tension_v) * 100
    return dv, dv_pct


def _buscar_seccion_ric(i_req: float, material: str, es_aire: bool) -> Optional[RicRow]:
    """Busca primera sección en TABLA_RIC que cumpla ampacidad."""
    for row in TABLA_RIC:
        if material == "cu":
            imax = row.icu_a if es_aire else row.icu_d
        else:
            imax = row.ial_a if es_aire else row.ial_d
        if imax == 0:
            continue
        if imax >= i_req:
            return row
    return None


def _get_imax_ric(row: RicRow, material: str, es_aire: bool) -> int:
    if material == "cu":
        return row.icu_a if es_aire else row.icu_d
    return row.ial_a if es_aire else row.ial_d


def _temperatura_operacion_conductor_dc(temp_max_amb: float) -> float:
    """
    Temperatura estimada del conductor en strings DC al sol.
    Cable ZZ-F sobre tejado/estructura: T_conductor ≈ T_amb + 20°C (conservador).
    """
    return min(temp_max_amb + 20.0, 85.0)  # no superar 85°C para cálculo resistividad


# ══════════════════════════════════════════════════════════════════════════════
# Topología 1: String DC
# ══════════════════════════════════════════════════════════════════════════════

def calc_string_dc(inp: ERNCStringDCInput) -> ERNCResponse:
    """
    Calcula conductor para string fotovoltaico DC.

    Algoritmo:
    1. I_diseño = 1.25 × Isc_STC  (IEC 62548 / NEC 690.8)
    2. Voc_max = Voc(T_min)  — para verificar aislación
    3. Voc_min = Voc(T_max)  — para verificar MPPT
    4. Buscar sección ZZ-F por ampacidad (corregida por temperatura)
    5. Verificar sección mínima 4 mm²
    6. Calcular ΔV con factor 2L (ida + vuelta)
    7. Ajustar sección si ΔV > límite
    """
    advertencias: list[str] = []
    lim = inp.limite_caida_pct if inp.limite_caida_pct else LIMITE_CAIDA_DC_STRING_PCT

    # ── 1. Corriente de diseño ─────────────────────────────────────────────
    i_diseno = FACTOR_ISC_DC * inp.isc_stc_a
    advertencias.append(f"I_diseño = 1.25 × {inp.isc_stc_a} A (Isc) = {round(i_diseno, 2)} A (IEC 62548 §8.3)")

    # ── 2. Tensiones Voc ───────────────────────────────────────────────────
    voc_max = get_voc_maxima(inp.voc_stc_v, inp.temp_min_c, inp.noct_c, inp.coef_voc_pct)
    voc_min = get_voc_minima(inp.voc_stc_v, inp.temp_max_c, inp.noct_c, inp.coef_voc_pct)

    if voc_max > 1000:
        advertencias.append(
            f"Voc_max = {round(voc_max, 1)} V supera 1000 V (LVDC). "
            "Requiere diseño MLVDC y protecciones especiales (IEC 60364-7-712)."
        )
    if voc_max > 1500:
        raise ValueError(f"Voc_max = {round(voc_max, 1)} V supera límite absoluto de 1500 V DC.")

    # ── 3. Factor temperatura cable ────────────────────────────────────────
    # Temperatura ambiente máxima → conductor más caliente → menor ampacidad
    ft = get_temp_factor_zzf(int(inp.temp_max_c))

    # ── 4. Buscar sección ZZ-F por ampacidad ──────────────────────────────
    # i_req corregida: I_diseño / ft para encontrar la sección que,
    # aplicando ft, soporta I_diseño
    i_req = i_diseno / ft
    fila_termica = buscar_seccion_zzf(i_req, inp.en_ducto, ft=1.0)

    if fila_termica is None:
        raise ValueError(
            f"Corriente de diseño {round(i_diseno, 1)} A supera la tabla ZZ-F disponible (máx. 50 mm²). "
            "Considerar subdivisión en múltiples strings o cable especial."
        )

    # ── 5. Sección mínima normativa 4 mm² ─────────────────────────────────
    ajustado_por_minimo = False
    if fila_termica.sec < SEC_MIN_DC_MM2:
        fila_termica = next(r for r in TABLA_ZZF if r.sec >= SEC_MIN_DC_MM2)
        ajustado_por_minimo = True
        advertencias.append(f"Sección aumentada al mínimo 4 mm² (IEC 60364-7-712 §712.52.1).")

    # ── 6. Resistividad a temperatura de operación ─────────────────────────
    # Usamos temperatura de conductor bajo irradiancia (más conservador)
    t_conductor = _temperatura_operacion_conductor_dc(inp.temp_max_c)
    r_por_m = get_r_ohm_per_m(fila_termica.sec, inp.material, t_conductor)

    # ── 7. Caída de tensión con factor 2L ─────────────────────────────────
    tension_ref = inp.voc_stc_v  # referencia STC para ΔV%
    dv, dv_pct = _caida_dc(i_diseno, r_por_m, inp.longitud_m, tension_ref)

    # ── 8. Ajustar sección si ΔV > límite ─────────────────────────────────
    fila_final = fila_termica
    ajustado_por_caida = False

    if dv_pct > lim:
        for row in TABLA_ZZF:
            if row.sec < fila_termica.sec:
                continue
            r = get_r_ohm_per_m(row.sec, inp.material, t_conductor)
            _, dv_test = _caida_dc(i_diseno, r, inp.longitud_m, tension_ref)
            if dv_test <= lim:
                fila_final = row
                ajustado_por_caida = True
                break

    # Recalcular ΔV final
    r_final = get_r_ohm_per_m(fila_final.sec, inp.material, t_conductor)
    dv_final, dv_pct_final = _caida_dc(i_diseno, r_final, inp.longitud_m, tension_ref)

    # Ampacidad final corregida
    i_max_raw = fila_final.i_ducto if inp.en_ducto else fila_final.i_aire
    i_max_corr = i_max_raw * ft

    cumple_termico = i_max_corr >= i_diseno
    cumple_caida = dv_pct_final <= lim

    if ajustado_por_minimo:
        advertencias.append("Sección mínima 4 mm² aplicada (IEC 60364-7-712).")
    if ajustado_por_caida:
        advertencias.append(
            f"Sección aumentada por caída de tensión: "
            f"ΔV = {round(dv_pct_final, 2)}% vs. límite {lim}%."
        )
    advertencias.append(
        f"Voc_max (T_min={inp.temp_min_c}°C) = {round(voc_max, 1)} V — "
        f"verificar tensión máxima inversor/fusibles."
    )
    advertencias.append(
        f"Voc_min (T_max={inp.temp_max_c}°C) = {round(voc_min, 1)} V — "
        f"verificar rango MPPT del inversor."
    )
    advertencias.append(
        "Cable recomendado: ZZ-F (EN 50618 / IEC 62930) — doble aislación, resistente UV, "
        "para uso en intemperie en sistemas FV."
    )

    resultado = ERNCResult(
        topologia="string_dc",
        seccion_mm2=fila_final.sec,
        material=inp.material,
        tipo_cable="ZZ-F (EN 50618)",
        i_diseno_a=round(i_diseno, 3),
        i_max_admisible_a=round(i_max_corr, 3),
        caida_pct=round(dv_pct_final, 4),
        caida_v=round(dv_final, 4),
        limite_caida_pct=lim,
        cumple_termico=cumple_termico,
        cumple_caida=cumple_caida,
        cumple=cumple_termico and cumple_caida,
        longitud_m=inp.longitud_m,
        voc_max_v=round(voc_max, 2),
        voc_min_v=round(voc_min, 2),
        i_cortocircuito_diseno_a=round(i_diseno, 3),
        factor_temperatura=ft,
        advertencias=advertencias,
        descripcion=(
            f"String DC {round(inp.potencia_wp/1000, 2)} kWp — "
            f"Cable {fila_final.sec} mm² ZZ-F, "
            f"Isc×1.25={round(i_diseno,1)} A, "
            f"ΔV={round(dv_pct_final,2)}%"
        ),
    )
    return ERNCResponse(ok=True, topologia="string_dc", resultado=resultado, advertencias=advertencias)


# ══════════════════════════════════════════════════════════════════════════════
# Topología 2: AC Inversor → tablero BT
# ══════════════════════════════════════════════════════════════════════════════

def calc_ac_inversor(inp: ERNCAcInversorInput) -> ERNCResponse:
    """
    Calcula conductor AC desde inversor hasta tablero de distribución BT.
    Reutiliza lógica RIC (TABLA_RIC, factores Ft/Fg/Fa).

    I = P / (√3 × V × cosφ)  para trifásico
    I = P / (V × cosφ)        para monofásico
    """
    advertencias: list[str] = []
    lim = inp.limite_caida_pct if inp.limite_caida_pct else LIMITE_CAIDA_AC_INVERSOR_PCT

    # ── Corriente de diseño ────────────────────────────────────────────────
    kw = inp.potencia_kw * 1000
    if inp.sistema == "trifasico":
        i_diseno = kw / (math.sqrt(3) * inp.tension_v * inp.cos_phi)
    else:
        i_diseno = kw / (inp.tension_v * inp.cos_phi)

    # Sin factor de demanda extra para inversor (ya opera a potencia nominal declarada)
    i_calc = i_diseno

    # ── Factores de corrección RIC ─────────────────────────────────────────
    ft = get_temp_factor(inp.temp_ambiente_c)
    fg = get_grouping_factor(inp.circuitos_agrupados)
    from app.engine.ric_tables import get_altitude_factor
    fa = get_altitude_factor(inp.msnm)
    factor_total = ft * fg * fa

    i_req = i_calc / factor_total
    es_aire = is_air_installation(inp.tipo_canalizacion)

    # ── Buscar sección por ampacidad (TABLA_RIC) ───────────────────────────
    fila_termica = _buscar_seccion_ric(i_req, inp.material, es_aire)
    if fila_termica is None:
        raise ValueError(
            "Corriente calculada supera la tabla RIC. Verificar potencia o subdividir circuito."
        )

    # Sección mínima AC: 4 mm² (alimentador)
    ajustado_por_minimo = False
    if fila_termica.sec < SEC_MIN_AC_MM2:
        fila_min = next((r for r in TABLA_RIC if r.sec >= SEC_MIN_AC_MM2), None)
        if fila_min:
            fila_termica = fila_min
            ajustado_por_minimo = True
            advertencias.append(f"Sección aumentada al mínimo 4 mm² para tramo AC inversor.")

    # ── Caída de tensión ───────────────────────────────────────────────────
    r_cu = inp.material == "cu"
    r_por_m = (fila_termica.rcu if r_cu else fila_termica.ral) / 1000
    dv, dv_pct = _caida_ac(inp.sistema, i_calc, r_por_m, inp.longitud_m, inp.tension_v)

    # ── Ajustar por caída ──────────────────────────────────────────────────
    fila_final = fila_termica
    ajustado_por_caida = False

    if dv_pct > lim:
        for row in TABLA_RIC:
            if row.sec < fila_termica.sec:
                continue
            r = (row.rcu if r_cu else row.ral) / 1000
            _, dv_test = _caida_ac(inp.sistema, i_calc, r, inp.longitud_m, inp.tension_v)
            imax = _get_imax_ric(row, inp.material, es_aire)
            if imax == 0:
                continue
            if dv_test <= lim and imax * factor_total >= i_calc:
                fila_final = row
                ajustado_por_caida = True
                break

    # ΔV y ampacidad finales
    r_final = (fila_final.rcu if r_cu else fila_final.ral) / 1000
    dv_final, dv_pct_final = _caida_ac(inp.sistema, i_calc, r_final, inp.longitud_m, inp.tension_v)

    imax_final = _get_imax_ric(fila_final, inp.material, es_aire) * factor_total
    cumple_termico = imax_final >= i_calc
    cumple_caida = dv_pct_final <= lim

    if ajustado_por_minimo:
        advertencias.append("Sección mínima 4 mm² aplicada (RIC Art. 5.3.1 — alimentador).")
    if ajustado_por_caida:
        advertencias.append(
            f"Sección aumentada por caída: ΔV = {round(dv_pct_final, 2)}% vs. límite {lim}%."
        )
    if inp.msnm > 1000:
        advertencias.append(
            f"Altitud {inp.msnm} msnm: factor Fa = {round(fa, 3)} — "
            f"capacidad reducida {round((1-fa)*100, 0)}% (IEC 60364-5-52)."
        )
    advertencias.append(
        f"Tramo AC inversor — factor_total = {round(factor_total, 3)} "
        f"(Ft={ft}, Fg={fg}, Fa={round(fa, 3)})."
    )
    advertencias.append(
        "Cable recomendado: THW/NYY apto para AC. "
        "Verificar protección en bornes de inversor (IEC 60364-7-712 §712.53)."
    )

    resultado = ERNCResult(
        topologia="ac_inversor",
        seccion_mm2=fila_final.sec,
        material=inp.material,
        tipo_cable="THW / NYY",
        i_diseno_a=round(i_diseno, 3),
        i_max_admisible_a=round(imax_final, 3),
        caida_pct=round(dv_pct_final, 4),
        caida_v=round(dv_final, 4),
        limite_caida_pct=lim,
        cumple_termico=cumple_termico,
        cumple_caida=cumple_caida,
        cumple=cumple_termico and cumple_caida,
        longitud_m=inp.longitud_m,
        factor_temperatura=round(factor_total, 4),
        advertencias=advertencias,
        descripcion=(
            f"AC Inversor {inp.potencia_kw} kW {inp.sistema} {inp.tension_v} V — "
            f"Cable {fila_final.sec} mm² THW, "
            f"I={round(i_diseno,1)} A, ΔV={round(dv_pct_final,2)}%"
        ),
    )
    return ERNCResponse(ok=True, topologia="ac_inversor", resultado=resultado, advertencias=advertencias)


# ══════════════════════════════════════════════════════════════════════════════
# Topología 3: GD Red BT (Generación Distribuida, NTCO SEC Chile)
# ══════════════════════════════════════════════════════════════════════════════

def calc_gd_red_bt(inp: ERNCGdRedBtInput) -> ERNCResponse:
    """
    Calcula conductor para conexión GD a red BT chilena.
    Normativa: NTCO SEC (2020), RIC.

    Requisitos adicionales NTCO:
    - Potencia inyectable ≤ 300 kW (instalación en BT simplificada)
    - Protección de desconexión automática (interruptor de interconexión)
    - Neutro sólido en sistemas trifásicos
    """
    advertencias: list[str] = []
    lim = inp.limite_caida_pct if inp.limite_caida_pct else LIMITE_CAIDA_GD_RED_PCT

    # Verificaciones NTCO
    if inp.potencia_kw > 300:
        advertencias.append(
            f"Potencia {inp.potencia_kw} kW supera 300 kW — trámite de conexión Media Tensión "
            "o AT requerido ante SEC (NTCO §3.2)."
        )
    if inp.potencia_instalada_kw and inp.potencia_instalada_kw > inp.potencia_kw:
        advertencias.append(
            f"Potencia instalada ({inp.potencia_instalada_kw} kW) > potencia a inyectar "
            f"({inp.potencia_kw} kW). NTCO requiere declarar potencia instalada total."
        )

    # Misma lógica que AC inversor (corriente y factores)
    kw = inp.potencia_kw * 1000
    if inp.sistema == "trifasico":
        i_diseno = kw / (math.sqrt(3) * inp.tension_v * inp.cos_phi)
    else:
        i_diseno = kw / (inp.tension_v * inp.cos_phi)

    i_calc = i_diseno

    ft = get_temp_factor(inp.temp_ambiente_c)
    fg = get_grouping_factor(inp.circuitos_agrupados)
    from app.engine.ric_tables import get_altitude_factor
    fa = get_altitude_factor(inp.msnm)
    factor_total = ft * fg * fa

    i_req = i_calc / factor_total
    es_aire = is_air_installation(inp.tipo_canalizacion)

    fila_termica = _buscar_seccion_ric(i_req, inp.material, es_aire)
    if fila_termica is None:
        raise ValueError(
            f"Corriente de diseño {round(i_diseno, 1)} A supera la tabla RIC disponible. "
            "Para GD > 200 kW en BT considere múltiples circuitos en paralelo o conexión en MT."
        )

    ajustado_por_minimo = False
    if fila_termica.sec < SEC_MIN_AC_MM2:
        fila_min = next((r for r in TABLA_RIC if r.sec >= SEC_MIN_AC_MM2), None)
        if fila_min:
            fila_termica = fila_min
            ajustado_por_minimo = True

    r_cu = inp.material == "cu"
    r_por_m = (fila_termica.rcu if r_cu else fila_termica.ral) / 1000
    dv, dv_pct = _caida_ac(inp.sistema, i_calc, r_por_m, inp.longitud_m, inp.tension_v)

    fila_final = fila_termica
    ajustado_por_caida = False

    if dv_pct > lim:
        for row in TABLA_RIC:
            if row.sec < fila_termica.sec:
                continue
            r = (row.rcu if r_cu else row.ral) / 1000
            _, dv_test = _caida_ac(inp.sistema, i_calc, r, inp.longitud_m, inp.tension_v)
            imax = _get_imax_ric(row, inp.material, es_aire)
            if imax == 0:
                continue
            if dv_test <= lim and imax * factor_total >= i_calc:
                fila_final = row
                ajustado_por_caida = True
                break

    r_final = (fila_final.rcu if r_cu else fila_final.ral) / 1000
    dv_final, dv_pct_final = _caida_ac(inp.sistema, i_calc, r_final, inp.longitud_m, inp.tension_v)

    imax_final = _get_imax_ric(fila_final, inp.material, es_aire) * factor_total
    cumple_termico = imax_final >= i_calc
    cumple_caida = dv_pct_final <= lim

    if ajustado_por_minimo:
        advertencias.append("Sección mínima 4 mm² aplicada.")
    if ajustado_por_caida:
        advertencias.append(f"Sección aumentada por caída: ΔV = {round(dv_pct_final, 2)}% vs. límite {lim}%.")

    # Advertencias NTCO
    advertencias.append(
        "NTCO SEC: requiere protección de desconexión automática (interruptor de interconexión) "
        "en el punto de conexión a la red de distribución."
    )
    advertencias.append(
        "NTCO SEC: el sistema de protección debe impedir operación en isla (anti-islanding)."
    )
    if inp.sistema == "trifasico" and inp.numero_fases_interconexion == 1:
        advertencias.append(
            "Interconexión monofásica para GD trifásico: verificar desequilibrio de fases "
            "con la distribuidora (NTCO §4.5)."
        )

    resultado = ERNCResult(
        topologia="gd_red_bt",
        seccion_mm2=fila_final.sec,
        material=inp.material,
        tipo_cable="THW / NYY (XLPE recomendado para GD)",
        i_diseno_a=round(i_diseno, 3),
        i_max_admisible_a=round(imax_final, 3),
        caida_pct=round(dv_pct_final, 4),
        caida_v=round(dv_final, 4),
        limite_caida_pct=lim,
        cumple_termico=cumple_termico,
        cumple_caida=cumple_caida,
        cumple=cumple_termico and cumple_caida,
        longitud_m=inp.longitud_m,
        factor_temperatura=round(factor_total, 4),
        advertencias=advertencias,
        descripcion=(
            f"GD Red BT {inp.potencia_kw} kW — NTCO SEC — "
            f"Cable {fila_final.sec} mm² THW, "
            f"I={round(i_diseno,1)} A, ΔV={round(dv_pct_final,2)}%"
        ),
    )
    return ERNCResponse(ok=True, topologia="gd_red_bt", resultado=resultado, advertencias=advertencias)


# ══════════════════════════════════════════════════════════════════════════════
# Topología 4: Baterías DC
# ══════════════════════════════════════════════════════════════════════════════

def calc_baterias_dc(inp: ERNCBateriasDCInput) -> ERNCResponse:
    """
    Calcula conductor para enlace DC de sistema de baterías estacionarias.

    I_diseño = (P / V_banco) × 1.25
    Límite ΔV = 1.0% (mayor sensibilidad de cargadores/inversores híbridos)
    Cable ZZ-F o H07V-K (flexible, para baterías en sala de energía).
    """
    advertencias: list[str] = []
    lim = inp.limite_caida_pct if inp.limite_caida_pct else LIMITE_CAIDA_BATERIAS_PCT

    # ── Corriente de diseño ────────────────────────────────────────────────
    i_nominal = inp.potencia_w / inp.tension_banco_v
    i_diseno = i_nominal * FACTOR_BATERIAS  # ×1.25 margen de pico

    advertencias.append(
        f"I_diseño = {round(i_nominal, 2)} A × 1.25 = {round(i_diseno, 2)} A "
        "(margen por corrientes de pico en carga/descarga de baterías)."
    )

    # ── Factor temperatura ─────────────────────────────────────────────────
    ft = get_temp_factor_zzf(inp.temp_ambiente_c)
    i_req = i_diseno / ft

    # ── Buscar sección ZZ-F ────────────────────────────────────────────────
    fila_termica = buscar_seccion_zzf(i_req, inp.en_ducto, ft=1.0)

    if fila_termica is None:
        # Si supera ZZ-F, usar TABLA_RIC para secciones mayores
        advertencias.append(
            "Corriente supera tabla ZZ-F — usando cable THW de sección mayor."
        )
        # Búsqueda en TABLA_RIC
        es_aire = not inp.en_ducto
        fila_ric = _buscar_seccion_ric(i_req, inp.material, es_aire)
        if fila_ric is None:
            raise ValueError(
                f"Corriente {round(i_diseno, 1)} A supera tablas disponibles. "
                "Dividir banco de baterías en módulos paralelos."
            )
        # Convertir a pseudo-ZZFRow usando datos RIC
        from app.engine.ernc_tables import ZZFRow as ZRow
        imax_ric = _get_imax_ric(fila_ric, inp.material, es_aire)
        fila_termica = ZRow(
            sec=fila_ric.sec,
            i_aire=imax_ric,
            i_ducto=imax_ric,
            rcu=fila_ric.rcu,
            awg=fila_ric.awg,
        )
        tipo_cable = "THW (sección > 50 mm²)"
    else:
        tipo_cable = "ZZ-F (EN 50618) / H07V-K"

    # ── Sección mínima 4 mm² ───────────────────────────────────────────────
    ajustado_por_minimo = False
    if fila_termica.sec < SEC_MIN_DC_MM2:
        min_row = next((r for r in TABLA_ZZF if r.sec >= SEC_MIN_DC_MM2), None)
        if min_row:
            fila_termica = min_row
            ajustado_por_minimo = True
            advertencias.append("Sección aumentada al mínimo 4 mm².")

    # ── Caída de tensión (2L: ida+vuelta) ─────────────────────────────────
    # Temperatura de operación para resistividad
    t_op = min(float(inp.temp_ambiente_c) + 15.0, 80.0)  # sala baterías típico +15°C
    r_por_m = get_r_ohm_per_m(fila_termica.sec, inp.material, t_op)
    dv, dv_pct = _caida_dc(i_diseno, r_por_m, inp.longitud_m, inp.tension_banco_v)

    # ── Ajustar por caída ──────────────────────────────────────────────────
    fila_final = fila_termica
    ajustado_por_caida = False

    if dv_pct > lim:
        for row in TABLA_ZZF:
            if row.sec < fila_termica.sec:
                continue
            r = get_r_ohm_per_m(row.sec, inp.material, t_op)
            _, dv_test = _caida_dc(i_diseno, r, inp.longitud_m, inp.tension_banco_v)
            if dv_test <= lim:
                fila_final = row
                ajustado_por_caida = True
                break
        # Si aún no cumple, usar TABLA_RIC
        if not ajustado_por_caida:
            es_aire = not inp.en_ducto
            for row_ric in TABLA_RIC:
                if row_ric.sec < fila_termica.sec:
                    continue
                r = get_r_ohm_per_m(row_ric.sec, inp.material, t_op)
                _, dv_test = _caida_dc(i_diseno, r, inp.longitud_m, inp.tension_banco_v)
                if dv_test <= lim:
                    from app.engine.ernc_tables import ZZFRow as ZRow
                    imax_ric = _get_imax_ric(row_ric, inp.material, es_aire)
                    fila_final = ZRow(
                        sec=row_ric.sec,
                        i_aire=imax_ric,
                        i_ducto=imax_ric,
                        rcu=row_ric.rcu,
                        awg=row_ric.awg,
                    )
                    ajustado_por_caida = True
                    tipo_cable = "THW (sección > 50 mm²)"
                    break

    r_final = get_r_ohm_per_m(fila_final.sec, inp.material, t_op)
    dv_final, dv_pct_final = _caida_dc(i_diseno, r_final, inp.longitud_m, inp.tension_banco_v)

    i_max_raw = fila_final.i_ducto if inp.en_ducto else fila_final.i_aire
    i_max_corr = i_max_raw * ft
    cumple_termico = i_max_corr >= i_diseno
    cumple_caida = dv_pct_final <= lim

    if ajustado_por_caida:
        advertencias.append(
            f"Sección aumentada por caída: ΔV = {round(dv_pct_final, 2)}% vs. límite {lim}% "
            "(baterías: límite estricto 1% para proteger ciclos de carga)."
        )
    advertencias.append(
        f"Límite ΔV = {lim}% para baterías — más estricto que DC string (1.5%) "
        "para proteger BMS y maximizar eficiencia de ciclos."
    )
    advertencias.append(
        "Instalar fusible o interruptor DC en cada polo a máximo 0.5 m del banco de baterías "
        "(IEC 62619 / RIC Art. 5.7)."
    )

    resultado = ERNCResult(
        topologia="baterias_dc",
        seccion_mm2=fila_final.sec,
        material=inp.material,
        tipo_cable=tipo_cable,
        i_diseno_a=round(i_diseno, 3),
        i_max_admisible_a=round(i_max_corr, 3),
        caida_pct=round(dv_pct_final, 4),
        caida_v=round(dv_final, 4),
        limite_caida_pct=lim,
        cumple_termico=cumple_termico,
        cumple_caida=cumple_caida,
        cumple=cumple_termico and cumple_caida,
        longitud_m=inp.longitud_m,
        factor_temperatura=ft,
        advertencias=advertencias,
        descripcion=(
            f"Baterías DC {inp.potencia_w/1000:.1f} kW @ {inp.tension_banco_v} V — "
            f"Cable {fila_final.sec} mm² {tipo_cable}, "
            f"I={round(i_diseno,1)} A, ΔV={round(dv_pct_final,2)}%"
        ),
    )
    return ERNCResponse(ok=True, topologia="baterias_dc", resultado=resultado, advertencias=advertencias)
