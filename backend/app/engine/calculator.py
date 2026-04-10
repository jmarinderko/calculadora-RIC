"""
Motor de cálculo RIC — NCh Elec 4/2003
Portado desde calculadora_ric_v7.html (JavaScript → Python)
Lógica idéntica al prototipo HTML: mismas fórmulas, misma tabla, mismos factores.
"""
import math
from typing import Optional

from app.engine.ric_tables import (
    TABLA_RIC, RicRow, SEC_MIN_CIRCUITO, K_CONST, FACTOR_FALLA,
    DIAMETRO_CABLE, get_temp_factor, get_grouping_factor,
    get_altitude_factor, is_air_installation, is_buried_installation,
)
from app.engine.schemas import (
    CalculatorInput, CalculatorResult, CalculatorResponse,
    RadioCurvatura, EstresTermico,
)
from app.engine.protection_selector import seleccionar_proteccion

# Límite de caída por tipo de circuito (RIC Art. 5.5.4)
LIMITE_CAIDA_CIRCUITO: dict[str, float] = {
    "alumbrado":      2.0,
    "fuerza":         3.0,
    "tomacorrientes": 3.0,
    "motor":          3.0,
    "alimentador":    3.0,
}


def _get_imax(row: RicRow, material: str, es_aire: bool) -> int:
    """Retorna la capacidad de corriente según material e instalación."""
    if material == "cu":
        return row.icu_a if es_aire else row.icu_d
    else:
        return row.ial_a if es_aire else row.ial_d


def _calc_caida(sistema: str, i_calc: float, r_ohm_per_m: float,
                longitud: float, tension: float) -> tuple[float, float]:
    """Calcula caída de tensión (V, %)."""
    if sistema == "trifasico":
        dv = math.sqrt(3) * i_calc * r_ohm_per_m * longitud
        dv_pct = (dv / tension) * 100
    elif sistema == "bifasico":
        dv = 2 * i_calc * r_ohm_per_m * longitud
        dv_pct = (dv / (2 * tension)) * 100
    else:  # monofasico
        dv = 2 * i_calc * r_ohm_per_m * longitud
        dv_pct = (dv / tension) * 100
    return dv, dv_pct


def _calc_radio_curvatura(sec_mm2: float, montaje: str, sistema: str, cables_por_fase: int) -> RadioCurvatura:
    """Radio mínimo de curvatura — NEC 300.34 / IEC 60364-5-52."""
    dims = DIAMETRO_CABLE.get(sec_mm2)
    if dims is None:
        d_uni = math.sqrt(sec_mm2) * 3.8 + 3
        d_multi = math.sqrt(sec_mm2) * 5.5 + 5
    else:
        d_uni, d_multi = dims

    es_unipolar = sistema != "monofasico"
    d_base = d_uni if es_unipolar else d_multi

    if montaje == "banco":
        factor = 12
        desc = "12× diámetro (banco de ducto)"
    elif montaje == "oculto":
        factor = 8
        desc = "8× diámetro (oculto/empotrado)"
    else:
        if es_unipolar:
            factor = 8
            desc = "8× diámetro (unipolar a la vista)"
        else:
            factor = 6
            desc = "6× diámetro (multiconductor a la vista)"

    radio = d_base * factor
    return RadioCurvatura(
        radio_mm=round(radio, 2),
        radio_interno_mm=round(radio - d_base, 2),
        diametro_mm=round(d_base, 2),
        factor=factor,
        descripcion_factor=desc,
        tipo_constructivo="Unipolar (THW)" if es_unipolar else "Multiconductor (THWN/NYY)",
        montaje=montaje,
    )


def _calc_estres_termico(
    sec_mm2: float, material: str, icc_ka: float, tiempo_s: float,
    tipo_falla: str, t_inicial: float, t_max: float
) -> EstresTermico:
    """Estrés térmico por cortocircuito — IEC 60949.
    Fórmula: S_min = (Icc_efectiva × √t) / K
    """
    factor_falla = FACTOR_FALLA.get(tipo_falla, 1.0)
    icc_efectiva_a = icc_ka * 1000 * factor_falla

    es_xlpe = t_max >= 200
    k_key = ("cu_" if material == "cu" else "al_") + ("xlpe" if es_xlpe else "thw")
    K = K_CONST[k_key]

    sec_min = (icc_efectiva_a * math.sqrt(tiempo_s)) / K
    icc_max_soportada = (sec_mm2 * K) / math.sqrt(tiempo_s) / 1000

    i2t = (icc_efectiva_a ** 2) * tiempo_s
    i2t_max = (sec_mm2 * K) ** 2
    ratio = i2t / i2t_max
    t_final = t_inicial + ratio * (t_max - t_inicial)

    return EstresTermico(
        icc_efectiva_ka=round(icc_efectiva_a / 1000, 3),
        factor_falla=factor_falla,
        tipo_falla=tipo_falla.upper(),
        k_const=K,
        es_xlpe=es_xlpe,
        sec_min_termica_mm2=math.ceil(sec_min * 10) / 10,
        icc_max_soportada_ka=round(icc_max_soportada, 3),
        i2t_ja=round(i2t, 0),
        i2t_max_ja=round(i2t_max, 0),
        ratio_saturacion=round(ratio, 4),
        t_final_estimada_c=round(t_final, 1),
        t_max_c=t_max,
        cumple=sec_mm2 >= sec_min,
    )


def _buscar_seccion(n_cables: int, i_req: float, material: str, es_aire: bool) -> Optional[RicRow]:
    """Busca la primera fila de TABLA_RIC que cumpla capacidad térmica."""
    for row in TABLA_RIC:
        imax = _get_imax(row, material, es_aire)
        if imax == 0:
            continue
        if imax * n_cables >= i_req:
            return row
    return None


def calculate(inp: CalculatorInput) -> CalculatorResponse:
    """
    Motor de cálculo principal RIC — portado 1:1 desde calculadora_ric_v7.html.

    Pasos:
    1. Corriente de diseño I_diseño
    2. Aplicar Fd → I_calc
    3. Factores Ft, Fg, Fa → factor_total
    4. I_req = I_calc / factor_total
    5. Buscar sección térmica (auto-paralelo hasta 3 cables)
    6. Sección mínima normativa RIC Art. 5.3.1
    7. Caída de tensión
    8. Ajustar sección si caída > límite
    9. Radio curvatura y estrés térmico
    """
    advertencias: list[str] = []

    # ── 1. Corriente de diseño ────────────────────────────────────────────────
    kw = inp.potencia_kw * 1000
    if inp.sistema == "trifasico":
        i_diseno = kw / (math.sqrt(3) * inp.tension_v * inp.factor_potencia)
    elif inp.sistema == "bifasico":
        i_diseno = kw / (2 * inp.tension_v * inp.factor_potencia)
    else:
        i_diseno = kw / (inp.tension_v * inp.factor_potencia)

    # ── 2. Factor de demanda ──────────────────────────────────────────────────
    i_calc = i_diseno * inp.factor_demanda

    # ── 3. Factores de corrección ─────────────────────────────────────────────
    ft = get_temp_factor(inp.temp_ambiente_c)
    fg = get_grouping_factor(inp.circuitos_agrupados)
    fa = get_altitude_factor(inp.msnm)
    factor_total = ft * fg * fa

    # ── 4. Corriente requerida (sin correcciones) ─────────────────────────────
    i_req = i_calc / factor_total

    es_aire = is_air_installation(inp.tipo_canalizacion)
    es_enterrado = is_buried_installation(inp.tipo_canalizacion)

    # ── 5. Buscar sección por capacidad térmica ───────────────────────────────
    fila_elegida: Optional[RicRow] = None
    cables_por_fase = 1

    if inp.cables_por_fase == 0:
        for n in range(1, 4):
            fila_elegida = _buscar_seccion(n, i_req, inp.material, es_aire)
            if fila_elegida:
                cables_por_fase = n
                break
    else:
        cables_por_fase = inp.cables_por_fase
        fila_elegida = _buscar_seccion(cables_por_fase, i_req, inp.material, es_aire)

    if fila_elegida is None:
        raise ValueError(
            "La corriente calculada supera el máximo de las tablas RIC disponibles. "
            "Se requiere media tensión o análisis especial."
        )

    # ── 5b. Override manual de sección (desde editor visual) ─────────────────
    if inp.seccion_forzada_mm2 is not None:
        fila_forzada = next((r for r in TABLA_RIC if r.sec == inp.seccion_forzada_mm2), None)
        if fila_forzada:
            fila_elegida = fila_forzada
            advertencias.append(f"Sección ingresada manualmente: {inp.seccion_forzada_mm2} mm²")

    # ── 6. Sección mínima normativa (RIC Art. 5.3.1) ─────────────────────────
    sec_min_ric = SEC_MIN_CIRCUITO.get(inp.tipo_circuito, 1.5)
    ajustado_por_minimo = False
    if fila_elegida.sec < sec_min_ric:
        fila_min = next((r for r in TABLA_RIC if r.sec >= sec_min_ric), None)
        if fila_min:
            fila_elegida = fila_min
            ajustado_por_minimo = True
    elif fila_elegida.sec == sec_min_ric:
        # Si la corriente de diseño es menor al 70% de la capacidad de la sección
        # mínima, el mínimo normativo es el criterio vinculante (no la térmica)
        imax_min = _get_imax(fila_elegida, inp.material, es_aire) * factor_total
        if imax_min > 0 and i_req < imax_min * 0.7:
            ajustado_por_minimo = True

    seccion_elegida = fila_elegida.sec
    r_cu = inp.material == "cu"
    resistencia_ohm_km = fila_elegida.rcu if r_cu else fila_elegida.ral
    r_ohm_per_m = resistencia_ohm_km / (cables_por_fase * 1000)

    # ── 7. Caída de tensión ───────────────────────────────────────────────────
    dv, dv_pct = _calc_caida(inp.sistema, i_calc, r_ohm_per_m, inp.longitud_m, inp.tension_v)
    lim_caida = inp.limite_caida_pct if inp.limite_caida_pct else LIMITE_CAIDA_CIRCUITO.get(inp.tipo_circuito, 3.0)

    # ── 8. Ajustar sección si caída excede límite ─────────────────────────────
    sec_caida = seccion_elegida
    fila_caida = fila_elegida
    cables_caida = cables_por_fase
    ajustado_por_caida = False

    if dv_pct > lim_caida:
        outer_break = False
        for row in TABLA_RIC:
            if row.sec < seccion_elegida:  # solo secciones >= térmica
                continue
            for n in range(cables_por_fase, 4):
                r = (row.rcu if r_cu else row.ral) / (n * 1000)
                _, dvpct_test = _calc_caida(inp.sistema, i_calc, r, inp.longitud_m, inp.tension_v)
                imax_test = _get_imax(row, inp.material, es_aire)
                if imax_test == 0:
                    continue
                if dvpct_test <= lim_caida and imax_test * n * factor_total >= i_calc:
                    if row.sec > seccion_elegida or n > cables_por_fase:
                        sec_caida = row.sec
                        fila_caida = row
                        cables_caida = n
                        ajustado_por_caida = True
                    outer_break = True
                    break
            if outer_break:
                break

    # Seleccionar la mayor entre sección térmica y sección por caída
    if sec_caida >= seccion_elegida:
        fila_final = fila_caida
        cables_final = cables_caida
    else:
        fila_final = fila_elegida
        cables_final = cables_por_fase

    sec_final = fila_final.sec

    # ── Caída final ───────────────────────────────────────────────────────────
    r_final = (fila_final.rcu if r_cu else fila_final.ral) / (cables_final * 1000)
    dv_final, dv_pct_final = _calc_caida(inp.sistema, i_calc, r_final, inp.longitud_m, inp.tension_v)

    imax_final = _get_imax(fila_final, inp.material, es_aire) * cables_final * factor_total

    cumple_termico = imax_final >= i_calc
    cumple_caida = dv_pct_final <= lim_caida
    cumple = cumple_termico and cumple_caida

    # ── 9. Conductores neutro y tierra ────────────────────────────────────────
    if inp.sistema == "trifasico" and sec_final > 16:
        sec_neutro = sec_final / 2
    else:
        sec_neutro = sec_final

    if sec_final <= 16:
        sec_tierra = sec_final
    elif sec_final <= 35:
        sec_tierra = 16.0
    else:
        sec_tierra = sec_final / 2

    # Descripción de configuración
    if inp.sistema == "trifasico":
        neutro_desc = f"{math.ceil(cables_final/2)} cable(s) neutro" if cables_final > 1 else "1 cable neutro"
        descripcion_config = f"{cables_final} cable(s)/fase × 3 fases + {neutro_desc} + tierra"
    elif inp.sistema == "bifasico":
        descripcion_config = f"{cables_final} cable(s)/fase × 2 fases + {cables_final} cable(s) neutro + tierra"
    else:
        descripcion_config = f"{cables_final} cable(s) fase + {cables_final} cable(s) neutro + tierra"

    # ── 10. Radio de curvatura ────────────────────────────────────────────────
    radio_data = _calc_radio_curvatura(sec_final, inp.montaje, inp.sistema, cables_final)

    # ── 11. Estrés térmico ────────────────────────────────────────────────────
    estres_data: Optional[EstresTermico] = None
    if inp.icc_ka and inp.tiempo_cc_s:
        estres_data = _calc_estres_termico(
            sec_final, inp.material, inp.icc_ka, inp.tiempo_cc_s,
            inp.tipo_falla, inp.t_inicial_c, inp.t_max_c
        )

    # ── Advertencias ──────────────────────────────────────────────────────────
    if ajustado_por_minimo:
        advertencias.append(
            f"Sección aumentada al mínimo normativo RIC Art. 5.3.1: {sec_min_ric} mm² "
            f"para circuito tipo '{inp.tipo_circuito}'."
        )
    if ajustado_por_caida:
        advertencias.append(
            f"Sección aumentada por criterio caída de tensión. "
            f"ΔV = {round(dv_pct_final, 2)}% vs. límite {lim_caida}%."
        )
    if inp.msnm > 1000:
        reduccion = round((1 - fa) * 100, 0)
        advertencias.append(
            f"Altitud {inp.msnm} msnm: Fa = {fa} — capacidad reducida {reduccion}% (IEC 60364-5-52)."
        )
    if es_enterrado:
        advertencias.append(
            "Instalación enterrada: verificar profundidad mínima RIC Art. 5.4 y arena de relleno."
        )
    if cables_final > 1:
        advertencias.append(
            "Paralelo: cables de igual longitud, material, sección y tipo (RIC Art. 5.3.2)."
        )

    # Selección de protecciones (termomagnético + diferencial)
    proteccion_data = seleccionar_proteccion(
        i_b=round(i_calc, 3),
        i_z=round(imax_final, 3),
        tipo_circuito=inp.tipo_circuito,
        sistema=inp.sistema,
        icc_ka=inp.icc_ka,
    )

    resultado = CalculatorResult(
        seccion_mm2=sec_final,
        calibre_awg=fila_final.awg,
        cables_por_fase=cables_final,
        material=inp.material,
        i_diseno_a=round(i_diseno, 3),
        i_calc_a=round(i_calc, 3),
        i_req_a=round(i_req, 3),
        i_max_corregida_a=round(imax_final, 3),
        caida_pct=round(dv_pct_final, 4),
        caida_v=round(dv_final, 4),
        limite_caida_pct=lim_caida,
        cumple_termico=cumple_termico,
        cumple_caida=cumple_caida,
        cumple=cumple,
        ft=ft,
        fg=fg,
        fa=fa,
        factor_total=round(factor_total, 4),
        sec_neutro_mm2=sec_neutro,
        sec_tierra_mm2=sec_tierra,
        descripcion_config=descripcion_config,
        radio_curvatura=radio_data,
        estres_termico=estres_data,
        proteccion=proteccion_data,
        ajustado_por_minimo=ajustado_por_minimo,
        ajustado_por_caida=ajustado_por_caida,
        sec_min_ric_mm2=sec_min_ric,
        advertencias=advertencias,
    )

    return CalculatorResponse(ok=True, resultado=resultado, advertencias=advertencias)
