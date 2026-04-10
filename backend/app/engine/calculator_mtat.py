"""
Motor de cálculo MT/AT — IEC 60502-2 / IEC 60287 / IEC 60949
Media Tensión (1–36 kV) y Alta Tensión (36–220 kV)

Diferencias clave respecto al motor BT (RIC):
  - Caída de tensión con impedancia compleja Z = R_ac + jX (no solo resistencia)
  - Ampacidades base de IEC 60502-2 con cuatro factores de corrección
  - Icc trifásico: I3f = Vf / Zcc  donde Vf = Vn/√3
  - Estrés térmico: I²t ≤ (K×S)²  —  IEC 60949
  - Aislamientos: XLPE y EPR (K=143/94 para Cu/Al)
"""
import math
from typing import Optional

from app.engine.ric_tables_mtat import (
    TABLA_MTAT, MtatRow, NIVELES_TENSION, K_CONST_MTAT, T_MAX_CC, T_OPE_XLPE_EPR,
    get_temp_factor_mtat, get_grouping_factor_mtat,
    get_depth_factor, get_resistivity_factor,
    is_buried_mtat, is_ducto_mtat, get_ampacity_mtat, SEC_MIN_MTAT,
)
from app.engine.schemas_mtat import (
    MtatInput, MtatResponse, MtatResult,
    EstresTermicoMtat, ImpedanciaCircuito, FactoresCorreccion,
)

# Factor de tipo de falla — IEC 60949
FACTOR_FALLA_MTAT: dict[str, float] = {
    "3f":  1.00,
    "2f":  0.87,
    "2ft": 1.00,
    "1ft": 0.58,
}

# Temperatura de operación base XLPE/EPR (°C) — para corrección de R_ac
T_REF_AC = 90.0

# Coeficiente de resistividad del cobre y aluminio (1/°C) a 20°C
ALPHA_CU = 0.00393
ALPHA_AL = 0.00403


# ──────────────────────────────────────────────────────────────────────────────
# Funciones auxiliares
# ──────────────────────────────────────────────────────────────────────────────

def _r_ac_at_temp(r_dc_20: float, material: str, temp_c: float) -> float:
    """
    Resistencia AC a temperatura de operación (Ω/km).
    Incluye corrección por temperatura y efecto pelicular (factor ~1.02 para MT).
    r_ac(T) = r_dc_20 × [1 + α(T−20)] × 1.02
    """
    alpha = ALPHA_CU if material == "cu" else ALPHA_AL
    r_dc_t = r_dc_20 * (1 + alpha * (temp_c - 20))
    return r_dc_t * 1.02  # factor pelicular IEC 60287


def _calc_caida_compleja(
    i_calc: float,
    r_ac_ohm_km: float,
    x_ohm_km: float,
    longitud_km: float,
    tension_kv: float,
) -> tuple[float, float, float, float]:
    """
    Caída de tensión trifásica con impedancia compleja (IEC 60287).

    ΔV = √3 × I × (R×cos φ_carga + X×sin φ_carga) × L  [aproximación lineal]
    Pero aquí usamos la fórmula exacta de fasores:

        ΔV_fase = I × Z × cos(δ)
        ΔV ≈ √3 × I × (R_total×cos φ + X_total×sin φ)

    Retorna: (dv_v, dv_pct, dv_r_v, dv_x_v)
    """
    # Resistencia e inductancia totales del circuito (trifásico: una sola longitud)
    r_total = r_ac_ohm_km * longitud_km
    x_total = x_ohm_km * longitud_km

    # ΔV componentes (tensión de línea → referencia fase)
    dv_r = math.sqrt(3) * i_calc * r_total   # componente resistiva
    dv_x = math.sqrt(3) * i_calc * x_total   # componente reactiva

    dv_total = math.sqrt(dv_r**2 + dv_x**2)
    tension_v = tension_kv * 1000
    dv_pct = (dv_total / tension_v) * 100

    return dv_total, dv_pct, dv_r, dv_x


def _calc_estres_termico_mtat(
    sec_mm2: float,
    material: str,
    aislamiento: str,
    icc_ka: float,
    tiempo_s: float,
    tipo_falla: str,
) -> EstresTermicoMtat:
    """
    Verificación de estrés térmico — IEC 60949.
    S_min = (Icc_ef × √t) / K
    Condición de cumplimiento: S ≥ S_min  ↔  I²t ≤ (K×S)²
    """
    factor_falla = FACTOR_FALLA_MTAT.get(tipo_falla, 1.0)
    icc_ef_a = icc_ka * 1000 * factor_falla

    k_key = f"{material}_{aislamiento}"
    K = K_CONST_MTAT.get(k_key, 143)
    t_max_cc = T_MAX_CC.get(aislamiento, 250.0)
    t_inicial = T_OPE_XLPE_EPR  # 90°C para XLPE/EPR

    sec_min = (icc_ef_a * math.sqrt(tiempo_s)) / K
    icc_max = (sec_mm2 * K) / math.sqrt(tiempo_s) / 1000

    i2t = (icc_ef_a ** 2) * tiempo_s
    i2t_max = (sec_mm2 * K) ** 2
    ratio = i2t / i2t_max if i2t_max > 0 else 0
    t_final = t_inicial + ratio * (t_max_cc - t_inicial)

    return EstresTermicoMtat(
        icc_efectiva_ka=round(icc_ef_a / 1000, 3),
        factor_falla=factor_falla,
        tipo_falla=tipo_falla.upper(),
        k_const=K,
        aislamiento=aislamiento.upper(),
        sec_min_termica_mm2=math.ceil(sec_min * 10) / 10,
        icc_max_soportada_ka=round(icc_max, 3),
        i2t_ja=round(i2t, 0),
        i2t_max_ja=round(i2t_max, 0),
        ratio_saturacion=round(ratio, 4),
        t_inicial_c=t_inicial,
        t_max_cc_c=t_max_cc,
        t_final_estimada_c=round(t_final, 1),
        cumple=sec_mm2 >= sec_min,
    )


def _build_impedancia(
    r_ac: float, x: float, longitud_km: float
) -> ImpedanciaCircuito:
    """Construye el objeto ImpedanciaCircuito."""
    r_tot = r_ac * longitud_km
    x_tot = x * longitud_km
    z_km = math.sqrt(r_ac**2 + x**2)
    z_tot = math.sqrt(r_tot**2 + x_tot**2)
    angulo = math.degrees(math.atan2(x_tot, r_tot)) if r_tot > 0 else 90.0
    return ImpedanciaCircuito(
        r_ac_ohm_km=round(r_ac, 5),
        x_ohm_km=round(x, 5),
        z_ohm_km=round(z_km, 5),
        r_total_ohm=round(r_tot, 4),
        x_total_ohm=round(x_tot, 4),
        z_total_ohm=round(z_tot, 4),
        angulo_grados=round(angulo, 2),
    )


def _get_sec_tierra(sec_mm2: float) -> float:
    """Conductor de tierra mínimo — IEC 60364-5-54."""
    if sec_mm2 <= 16:
        return sec_mm2
    elif sec_mm2 <= 35:
        return 16.0
    elif sec_mm2 <= 400:
        return sec_mm2 / 2
    else:
        return 200.0


def _buscar_seccion_mtat(
    i_req: float, material: str, tipo_instalacion: str, sec_min: float
) -> Optional[MtatRow]:
    """Busca la primera fila que cumpla capacidad térmica y sección mínima."""
    for row in TABLA_MTAT:
        if row.sec < sec_min:
            continue
        i_tabla = get_ampacity_mtat(row, material, tipo_instalacion)
        if i_tabla >= i_req:
            return row
    return None


# ──────────────────────────────────────────────────────────────────────────────
# Motor principal
# ──────────────────────────────────────────────────────────────────────────────

def calculate_mtat(inp: MtatInput) -> MtatResponse:
    """
    Motor de cálculo MT/AT.

    Pasos:
    1. Corriente de diseño
    2. Factores de corrección (Ft, Fg, Fp, Fr)
    3. Corriente requerida sin corrección → buscar sección térmica
    4. Sección mínima normativa por nivel de tensión
    5. Caída de tensión con impedancia compleja (R+jX)
    6. Ajustar sección por caída si excede límite
    7. Pérdidas Joule
    8. Estrés térmico (opcional)
    9. Construir respuesta
    """
    advertencias: list[str] = []

    # Validar que potencia o corriente estén definidas
    if inp.potencia_kw is None and inp.corriente_a is None:
        raise ValueError("Debe especificar potencia_kw o corriente_a.")

    nivel_info = NIVELES_TENSION.get(inp.nivel_tension)
    if nivel_info is None:
        raise ValueError(f"Nivel de tensión no reconocido: {inp.nivel_tension}")

    tension_v = inp.tension_kv * 1000

    # ── 1. Corriente de diseño ─────────────────────────────────────────────────
    if inp.corriente_a is not None:
        i_diseno = inp.corriente_a
    else:
        # Trifásico siempre para MT/AT
        i_diseno = (inp.potencia_kw * 1000) / (
            math.sqrt(3) * tension_v * inp.factor_potencia
        )

    i_calc = i_diseno * inp.factor_demanda

    # ── 2. Factores de corrección ──────────────────────────────────────────────
    es_enterrado = is_buried_mtat(inp.tipo_instalacion)

    ft = get_temp_factor_mtat(inp.temp_ambiente_c, es_enterrado)
    fg = get_grouping_factor_mtat(inp.circuitos_agrupados)
    fp = get_depth_factor(inp.profundidad_m) if es_enterrado else 1.0
    fr = get_resistivity_factor(inp.resistividad_suelo) if es_enterrado else 1.0
    factor_total = ft * fg * fp * fr

    # ── 3. Corriente requerida a tabla ─────────────────────────────────────────
    i_req = i_calc / factor_total

    sec_min_nivel = float(nivel_info["sec_min"])

    # ── 4. Buscar sección por capacidad térmica ────────────────────────────────
    fila_elegida: Optional[MtatRow] = None

    if inp.seccion_forzada_mm2 is not None:
        fila_elegida = next((r for r in TABLA_MTAT if r.sec == inp.seccion_forzada_mm2), None)
        if fila_elegida is None:
            raise ValueError(f"Sección {inp.seccion_forzada_mm2} mm² no disponible en tablas MT/AT.")
        advertencias.append(f"Sección forzada manualmente: {inp.seccion_forzada_mm2} mm²")
    else:
        fila_elegida = _buscar_seccion_mtat(i_req, inp.material, inp.tipo_instalacion, sec_min_nivel)

    if fila_elegida is None:
        raise ValueError(
            f"La corriente calculada ({i_req:.1f} A) supera el máximo de las tablas MT/AT "
            f"para {inp.material.upper()} en instalación '{inp.tipo_instalacion}'. "
            "Considere cables en paralelo o revisar parámetros."
        )

    ajustado_por_minimo = False
    if fila_elegida.sec < sec_min_nivel and inp.seccion_forzada_mm2 is None:
        fila_min = next((r for r in TABLA_MTAT if r.sec >= sec_min_nivel), None)
        if fila_min:
            fila_elegida = fila_min
            ajustado_por_minimo = True
            advertencias.append(
                f"Sección aumentada al mínimo normativo para {nivel_info['label']}: "
                f"{sec_min_nivel} mm² (IEC 60502-2)."
            )
    elif fila_elegida.sec == sec_min_nivel and inp.seccion_forzada_mm2 is None:
        # Mínimo normativo es vinculante si la corriente es menor al 70% de la capacidad
        imax_min = get_ampacity_mtat(fila_elegida, inp.material, inp.tipo_instalacion) * factor_total
        if imax_min > 0 and i_req < imax_min * 0.7:
            ajustado_por_minimo = True

    # ── 5. Impedancia y caída de tensión ──────────────────────────────────────
    r_dc_20 = fila_elegida.rcu_dc if inp.material == "cu" else fila_elegida.ral_dc
    r_ac = _r_ac_at_temp(r_dc_20, inp.material, T_REF_AC)
    x_km = fila_elegida.x_ohm_km

    dv, dv_pct, dv_r, dv_x = _calc_caida_compleja(
        i_calc, r_ac, x_km, inp.longitud_km, inp.tension_kv
    )

    # ── 6. Ajustar sección por caída si excede límite ─────────────────────────
    ajustado_por_caida = False
    fila_final = fila_elegida

    if dv_pct > inp.limite_caida_pct:
        for row in TABLA_MTAT:
            if row.sec < fila_elegida.sec:
                continue
            r_dc_test = row.rcu_dc if inp.material == "cu" else row.ral_dc
            r_ac_test = _r_ac_at_temp(r_dc_test, inp.material, T_REF_AC)
            x_test = row.x_ohm_km
            _, dvpct_test, _, _ = _calc_caida_compleja(
                i_calc, r_ac_test, x_test, inp.longitud_km, inp.tension_kv
            )
            i_tab = get_ampacity_mtat(row, inp.material, inp.tipo_instalacion)
            if dvpct_test <= inp.limite_caida_pct and i_tab * factor_total >= i_calc:
                if row.sec > fila_elegida.sec:
                    fila_final = row
                    ajustado_por_caida = True
                break

    # Recalcular caída final con sección elegida
    r_dc_fin = fila_final.rcu_dc if inp.material == "cu" else fila_final.ral_dc
    r_ac_fin = _r_ac_at_temp(r_dc_fin, inp.material, T_REF_AC)
    x_fin = fila_final.x_ohm_km
    dv_fin, dv_pct_fin, dv_r_fin, dv_x_fin = _calc_caida_compleja(
        i_calc, r_ac_fin, x_fin, inp.longitud_km, inp.tension_kv
    )

    if ajustado_por_caida:
        advertencias.append(
            f"Sección aumentada por caída de tensión: ΔV = {dv_pct_fin:.2f}% "
            f"vs. límite {inp.limite_caida_pct}%."
        )

    # ── 7. Ampacidad corregida ────────────────────────────────────────────────
    i_tab_fin = get_ampacity_mtat(fila_final, inp.material, inp.tipo_instalacion)
    i_max_corr = i_tab_fin * factor_total

    cumple_termico = i_max_corr >= i_calc
    cumple_caida = dv_pct_fin <= inp.limite_caida_pct
    cumple = cumple_termico and cumple_caida

    # ── 8. Pérdidas Joule ─────────────────────────────────────────────────────
    perdidas_w = 3 * (i_calc ** 2) * r_ac_fin * inp.longitud_km  # W (trifásico)
    perdidas_kw = perdidas_w / 1000
    p_total_kw = inp.potencia_kw if inp.potencia_kw else i_calc * tension_v * inp.factor_potencia * math.sqrt(3) / 1000
    perdidas_pct = (perdidas_kw / p_total_kw) * 100 if p_total_kw > 0 else 0

    # ── 9. Estrés térmico ─────────────────────────────────────────────────────
    estres: Optional[EstresTermicoMtat] = None
    if inp.icc_ka and inp.tiempo_cc_s:
        estres = _calc_estres_termico_mtat(
            fila_final.sec, inp.material, inp.aislamiento,
            inp.icc_ka, inp.tiempo_cc_s, inp.tipo_falla,
        )
        if not estres.cumple:
            advertencias.append(
                f"ADVERTENCIA: Estrés térmico INCUMPLE — sección mínima requerida: "
                f"{estres.sec_min_termica_mm2} mm² (IEC 60949)."
            )

    # ── 10. Advertencias adicionales ──────────────────────────────────────────
    if not cumple_termico:
        advertencias.append(
            f"Capacidad térmica INCUMPLE: I_max_corr={i_max_corr:.1f} A < I_calc={i_calc:.1f} A."
        )
    if not cumple_caida:
        advertencias.append(
            f"Caída de tensión INCUMPLE: ΔV={dv_pct_fin:.2f}% > límite {inp.limite_caida_pct}%."
        )
    if inp.circuitos_agrupados > 1:
        advertencias.append(
            f"Agrupamiento: {inp.circuitos_agrupados} circuitos — factor Fg={fg:.2f}. "
            "Verificar espaciado mínimo entre cables (IEC 60502-2 Cláusula 20)."
        )
    if es_enterrado and inp.resistividad_suelo > 2.0:
        advertencias.append(
            f"Resistividad del suelo elevada (ρ={inp.resistividad_suelo} K·m/W). "
            "Considerar cama de arena seleccionada o protección especial."
        )
    if perdidas_pct > 3.0:
        advertencias.append(
            f"Pérdidas Joule elevadas: {perdidas_kw:.1f} kW ({perdidas_pct:.1f}% de la potencia). "
            "Evaluar sección superior por criterio económico."
        )
    if inp.longitud_km > 10:
        advertencias.append(
            "Longitud > 10 km: verificar estabilidad de tensión y análisis de flujo de carga completo."
        )

    # ── 11. Conductor de tierra ───────────────────────────────────────────────
    sec_tierra = _get_sec_tierra(fila_final.sec)

    # ── Construir objetos de respuesta ────────────────────────────────────────
    factores_obj = FactoresCorreccion(
        ft=round(ft, 4),
        fg=round(fg, 4),
        fp=round(fp, 4),
        fr=round(fr, 4),
        factor_total=round(factor_total, 4),
        temp_c=inp.temp_ambiente_c,
        n_circuitos=inp.circuitos_agrupados,
        profundidad_m=inp.profundidad_m if es_enterrado else None,
        resistividad=inp.resistividad_suelo if es_enterrado else None,
    )

    impedancia_obj = _build_impedancia(r_ac_fin, x_fin, inp.longitud_km)

    resultado = MtatResult(
        seccion_mm2=fila_final.sec,
        material=inp.material,
        aislamiento=inp.aislamiento,
        nivel_tension=nivel_info["label"],
        tension_kv=inp.tension_kv,
        i_diseno_a=round(i_diseno, 3),
        i_calc_a=round(i_calc, 3),
        i_req_a=round(i_req, 3),
        i_max_corregida_a=round(i_max_corr, 3),
        caida_v=round(dv_fin, 4),
        caida_pct=round(dv_pct_fin, 4),
        limite_caida_pct=inp.limite_caida_pct,
        caida_r_v=round(dv_r_fin, 4),
        caida_x_v=round(dv_x_fin, 4),
        cumple_termico=cumple_termico,
        cumple_caida=cumple_caida,
        cumple=cumple,
        factores=factores_obj,
        ajustado_por_caida=ajustado_por_caida,
        ajustado_por_minimo=ajustado_por_minimo,
        sec_min_nivel_mm2=sec_min_nivel,
        impedancia=impedancia_obj,
        perdidas_kw=round(perdidas_kw, 3),
        perdidas_pct=round(perdidas_pct, 2),
        estres_termico=estres,
        sec_tierra_mm2=sec_tierra,
        advertencias=advertencias,
    )

    return MtatResponse(ok=True, resultado=resultado, advertencias=advertencias)
