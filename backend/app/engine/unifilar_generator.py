"""
Generador de diagrama unifilar SVG — RIC NCh Elec 4/2003
SVG puro Python (solo stdlib), sin dependencias externas.
viewBox 800×600 px.
"""
from __future__ import annotations
import math


# ──────────────────────────────────────────────────────────────────────────────
# Helpers SVG
# ──────────────────────────────────────────────────────────────────────────────

def _tag(name: str, content: str = "", **attrs) -> str:
    """Genera un tag SVG con atributos y contenido opcional."""
    attr_str = " ".join(
        f'{k.replace("_", "-")}="{v}"' for k, v in attrs.items() if v is not None
    )
    if content:
        return f"<{name} {attr_str}>{content}</{name}>"
    return f"<{name} {attr_str}/>"


def _text(x: float, y: float, content: str, **kwargs) -> str:
    return _tag("text", content, x=x, y=y, **kwargs)


def _line(x1: float, y1: float, x2: float, y2: float, **kwargs) -> str:
    return _tag("line", x1=x1, y1=y1, x2=x2, y2=y2, **kwargs)


def _rect(x: float, y: float, w: float, h: float, **kwargs) -> str:
    return _tag("rect", x=x, y=y, width=w, height=h, **kwargs)


def _circle(cx: float, cy: float, r: float, **kwargs) -> str:
    return _tag("circle", cx=cx, cy=cy, r=r, **kwargs)


def _path(d: str, **kwargs) -> str:
    return _tag("path", d=d, **kwargs)


def _group(content: str, **kwargs) -> str:
    attr_str = " ".join(f'{k.replace("_", "-")}="{v}"' for k, v in kwargs.items())
    return f"<g {attr_str}>{content}</g>"


# ──────────────────────────────────────────────────────────────────────────────
# Secciones del diagrama
# ──────────────────────────────────────────────────────────────────────────────

# Posiciones principales
BARRA_Y = 70          # barra de alimentación
BREAKER_TOP_Y = 110   # parte superior del interruptor
BREAKER_BOT_Y = 175   # parte inferior del interruptor
CABLE_BOT_Y = 380     # donde llega el cable a la carga
LOAD_CY = 430         # centro símbolo de carga
TABLA_Y = 490         # inicio tabla resumen
CX = 240              # eje central (fase)
CX_N = 370            # eje neutro
CX_PE = 500           # eje tierra (PE)


def _barra_alimentacion(sistema: str, tension_v: float) -> str:
    """Barra de alimentación horizontal superior con etiqueta de tensión."""
    partes: list[str] = []

    # Barra principal (horizontal)
    partes.append(_line(60, BARRA_Y, 680, BARRA_Y,
                        stroke="#111", stroke_width="5", stroke_linecap="round"))

    # Etiqueta a la izquierda
    labels_sistema = {
        "trifasico": "3~ 380 V / 220 V",
        "bifasico":  "2~ 220 V",
        "monofasico": "1~ 220 V",
    }
    label = labels_sistema.get(sistema, f"{tension_v} V")
    partes.append(_text(65, BARRA_Y - 12, label,
                        font_family="IBM Plex Mono, monospace",
                        font_size="11", fill="#555", font_weight="600"))

    # Ticks de fase (L1, L2, L3 o solo L1)
    fases = {"trifasico": ["L1", "L2", "L3"], "bifasico": ["L1", "L2"], "monofasico": ["L1"]}
    cols = {"trifasico": [CX - 30, CX, CX + 30], "bifasico": [CX - 15, CX + 15], "monofasico": [CX]}
    for i, (fx, lbl) in enumerate(zip(cols.get(sistema, [CX]), fases.get(sistema, ["L1"]))):
        partes.append(_line(fx, BARRA_Y, fx, BARRA_Y + 16,
                            stroke="#111", stroke_width="2.5"))
        partes.append(_text(fx, BARRA_Y + 27, lbl,
                            font_family="IBM Plex Mono, monospace",
                            font_size="10", fill="#333", text_anchor="middle"))

    return "".join(partes)


def _interruptor_termomagnetico(i_calc: float, sec_mm2: float) -> str:
    """
    Símbolo IEC del interruptor termomagnético:
    rectángulo con línea diagonal interna.
    """
    bw, bh = 36, 52
    bx = CX - bw // 2
    by = BREAKER_TOP_Y

    partes: list[str] = []

    # Línea de entrada (barra → interruptor)
    partes.append(_line(CX, BARRA_Y + 16, CX, by,
                        stroke="#111", stroke_width="2.5"))

    # Cuerpo del interruptor
    partes.append(_rect(bx, by, bw, bh,
                        fill="white", stroke="#111", stroke_width="2",
                        rx="3"))

    # Diagonal IEC (símbolo termomagnético)
    partes.append(_line(bx + 5, by + bh - 8, bx + bw - 5, by + 8,
                        stroke="#111", stroke_width="1.8", stroke_linecap="round"))

    # Pequeño arco en la diagonal (símbolo bimetal)
    arc_cx = bx + bw // 2
    arc_cy = by + bh // 2
    partes.append(_path(
        f"M {arc_cx - 6} {arc_cy + 4} Q {arc_cx} {arc_cy - 8} {arc_cx + 6} {arc_cy + 4}",
        fill="none", stroke="#111", stroke_width="1.5"
    ))

    # Línea de salida (interruptor → cable)
    partes.append(_line(CX, by + bh, CX, BREAKER_BOT_Y + 10,
                        stroke="#111", stroke_width="2.5"))

    # Etiqueta In estimada
    in_val = math.ceil(i_calc * 1.25 / 5) * 5   # próximo múltiplo de 5A
    in_val = max(in_val, 6)
    partes.append(_text(bx + bw + 7, by + bh // 2 + 4,
                        f"In≈{in_val}A",
                        font_family="IBM Plex Mono, monospace",
                        font_size="10", fill="#555"))

    return "".join(partes)


def _conductor_label(sec_mm2: float, material: str, cables_por_fase: int,
                     sistema: str, longitud_m: float, tipo_canalizacion: str) -> str:
    """Línea conductora con anotaciones."""
    partes: list[str] = []

    # Línea de conductor (fase)
    partes.append(_line(CX, BREAKER_BOT_Y + 10, CX, CABLE_BOT_Y,
                        stroke="#111", stroke_width="2.5"))

    # Anotaciones del conductor
    mat_str = "Cu" if material == "cu" else "Al"
    if cables_por_fase > 1:
        fase_str = f"{cables_por_fase}×{int(sec_mm2)}mm² {mat_str}/fase"
    else:
        fase_str = f"{int(sec_mm2)}mm² {mat_str}"

    # Etiqueta canalización
    canal_map = {
        "ducto_pvc": "ducto PVC",
        "ducto_metalico": "ducto met.",
        "bandeja_perforada": "bandeja perf.",
        "bandeja_escalera": "bandeja esc.",
        "enterrado_directo": "ent. directo",
        "enterrado_ducto": "ent. en ducto",
        "aereo_libre": "aéreo libre",
    }
    canal_str = canal_map.get(tipo_canalizacion, tipo_canalizacion)

    mid_y = (BREAKER_BOT_Y + CABLE_BOT_Y) // 2

    partes.append(_text(CX + 12, mid_y - 12, fase_str,
                        font_family="IBM Plex Mono, monospace",
                        font_size="11", fill="#222", font_weight="600"))
    partes.append(_text(CX + 12, mid_y + 4, f"L = {longitud_m} m",
                        font_family="IBM Plex Mono, monospace",
                        font_size="10", fill="#555"))
    partes.append(_text(CX + 12, mid_y + 18, canal_str,
                        font_family="IBM Plex Mono, monospace",
                        font_size="10", fill="#888"))

    # Hash marks en el conductor (indicador de número de conductores)
    n_marks = min(cables_por_fase + 2, 5)
    hash_y = mid_y - 30
    angle_deg = 60
    half = 7
    dx = half * math.cos(math.radians(angle_deg))
    dy = half * math.sin(math.radians(angle_deg))
    for i in range(n_marks):
        hy = hash_y + i * 8
        partes.append(_line(CX - dx, hy - dy, CX + dx, hy + dy,
                            stroke="#111", stroke_width="1.5", stroke_linecap="round"))

    return "".join(partes)


def _neutro(sec_neutro_mm2: float, sistema: str) -> str:
    """Conductor neutro (azul)."""
    partes: list[str] = []
    ny = BARRA_Y

    # Punto de toma en barra
    partes.append(_circle(CX_N, ny, 4, fill="#2563eb", stroke="#1d4ed8", stroke_width="1"))

    # Línea vertical
    partes.append(_line(CX_N, ny + 4, CX_N, CABLE_BOT_Y,
                        stroke="#2563eb", stroke_width="2", stroke_dasharray="6 3"))

    # Etiqueta
    mid_y = (ny + CABLE_BOT_Y) // 2
    partes.append(_text(CX_N + 8, mid_y, f"N {int(sec_neutro_mm2)}mm²",
                        font_family="IBM Plex Mono, monospace",
                        font_size="10", fill="#2563eb"))

    return "".join(partes)


def _tierra_iec(sec_tierra_mm2: float) -> str:
    """
    Conductor de protección (PE) con símbolo tierra IEC al final.
    Color verde/amarillo según estándar.
    """
    partes: list[str] = []
    ny = BARRA_Y

    # Punto de toma en barra (símbolo tierra IEC)
    # Barra de tierra en la barra principal
    partes.append(_line(CX_PE - 12, ny, CX_PE + 12, ny,
                        stroke="#16a34a", stroke_width="3"))
    partes.append(_line(CX_PE - 8, ny + 5, CX_PE + 8, ny + 5,
                        stroke="#16a34a", stroke_width="2.5"))
    partes.append(_line(CX_PE - 4, ny + 10, CX_PE + 4, ny + 10,
                        stroke="#16a34a", stroke_width="2"))

    # Línea vertical al símbolo tierra inferior
    partes.append(_line(CX_PE, ny + 10, CX_PE, CABLE_BOT_Y,
                        stroke="#16a34a", stroke_width="2", stroke_dasharray="8 4"))

    # Símbolo tierra IEC en destino (carga)
    ty = CABLE_BOT_Y + 5
    partes.append(_line(CX_PE - 14, ty, CX_PE + 14, ty,
                        stroke="#16a34a", stroke_width="3"))
    partes.append(_line(CX_PE - 9, ty + 5, CX_PE + 9, ty + 5,
                        stroke="#16a34a", stroke_width="2.5"))
    partes.append(_line(CX_PE - 4, ty + 10, CX_PE + 4, ty + 10,
                        stroke="#16a34a", stroke_width="2"))

    # Etiqueta
    mid_y = (ny + CABLE_BOT_Y) // 2
    partes.append(_text(CX_PE + 8, mid_y, f"PE {int(sec_tierra_mm2)}mm²",
                        font_family="IBM Plex Mono, monospace",
                        font_size="10", fill="#16a34a"))

    return "".join(partes)


def _simbolo_carga(tipo_circuito: str, potencia_kw: float, sistema: str) -> str:
    """
    Símbolo IEC de carga:
    - motor: M en círculo
    - alumbrado: círculo con X (luminaria)
    - resto: rectángulo con zigzag (carga genérica)
    """
    partes: list[str] = []
    cx, cy = CX, LOAD_CY
    r = 30

    if tipo_circuito == "motor":
        # Motor: M en círculo
        partes.append(_circle(cx, cy, r,
                               fill="white", stroke="#111", stroke_width="2"))
        partes.append(_text(cx, cy + 7, "M",
                             font_family="IBM Plex Mono, monospace",
                             font_size="24", fill="#111", font_weight="700",
                             text_anchor="middle"))
        # Tilde de motor (3~)
        fases_str = "3~" if sistema == "trifasico" else ("2~" if sistema == "bifasico" else "1~")
        partes.append(_text(cx, cy + r + 16, fases_str,
                             font_family="IBM Plex Mono, monospace",
                             font_size="11", fill="#555", text_anchor="middle"))

    elif tipo_circuito == "alumbrado":
        # Luminaria: círculo con X interna
        partes.append(_circle(cx, cy, r,
                               fill="white", stroke="#111", stroke_width="2"))
        d = r * 0.65
        partes.append(_line(cx - d, cy - d, cx + d, cy + d,
                             stroke="#111", stroke_width="1.8"))
        partes.append(_line(cx + d, cy - d, cx - d, cy + d,
                             stroke="#111", stroke_width="1.8"))

    else:
        # Carga genérica: rectángulo con zigzag interno
        rw, rh = 56, 44
        rx_pos = cx - rw // 2
        ry_pos = cy - rh // 2
        partes.append(_rect(rx_pos, ry_pos, rw, rh,
                             fill="white", stroke="#111", stroke_width="2", rx="3"))
        # Zigzag (símbolo resistencia IEC)
        zx = cx - 18
        zy_start = cy - 10
        zpoints: list[tuple[float, float]] = [
            (zx, zy_start),
            (zx + 6, zy_start - 7),
            (zx + 12, zy_start + 7),
            (zx + 18, zy_start - 7),
            (zx + 24, zy_start + 7),
            (zx + 30, zy_start - 7),
            (zx + 36, zy_start),
        ]
        zigzag_d = "M " + " L ".join(f"{p[0]} {p[1]}" for p in zpoints)
        partes.append(_path(zigzag_d, fill="none", stroke="#111", stroke_width="2",
                             stroke_linecap="round", stroke_linejoin="round"))

    # Etiqueta potencia
    partes.append(_text(cx, cy + r + 32, f"{potencia_kw:.1f} kW",
                         font_family="IBM Plex Mono, monospace",
                         font_size="11", fill="#333", font_weight="600",
                         text_anchor="middle"))

    # Línea de conexión carga → símbolo
    partes.append(_line(CX, CABLE_BOT_Y, CX, cy - r,
                        stroke="#111", stroke_width="2.5"))

    return "".join(partes)


def _tabla_resumen(resultado: dict) -> str:
    """Tabla resumen en la parte inferior del diagrama."""
    partes: list[str] = []

    caida_pct   = resultado.get("caida_pct", 0.0)
    limite      = resultado.get("limite_caida_pct", 3.0)
    cumple      = resultado.get("cumple", False)
    sec_mm2     = resultado.get("seccion_mm2", 0)
    sec_neutro  = resultado.get("sec_neutro_mm2", 0)
    sec_tierra  = resultado.get("sec_tierra_mm2", 0)
    i_calc      = resultado.get("i_calc_a", 0.0)
    i_max       = resultado.get("i_max_corregida_a", 0.0)
    material    = resultado.get("material", "cu")
    cables      = resultado.get("cables_por_fase", 1)
    cumple_term = resultado.get("cumple_termico", False)
    cumple_caid = resultado.get("cumple_caida", False)

    tw = 720
    tx = 40
    ty = TABLA_Y
    row_h = 22
    col1 = 180
    col2 = 350
    col3 = 520

    # Fondo de tabla
    n_rows = 4
    partes.append(_rect(tx, ty, tw, row_h * (n_rows + 1),
                        fill="#f8fafc", stroke="#cbd5e1", stroke_width="1", rx="4"))

    # Encabezado
    partes.append(_rect(tx, ty, tw, row_h,
                        fill="#1e293b", stroke="none", rx="4"))
    partes.append(_text(tx + 12, ty + 15, "RESUMEN DEL CÁLCULO RIC",
                        font_family="IBM Plex Mono, monospace",
                        font_size="11", fill="white", font_weight="700"))

    cumple_color = "#16a34a" if cumple else "#dc2626"
    cumple_txt = "CUMPLE RIC" if cumple else "NO CUMPLE"
    partes.append(_text(col3 + 60, ty + 15, cumple_txt,
                        font_family="IBM Plex Mono, monospace",
                        font_size="11", fill=cumple_color, font_weight="700",
                        text_anchor="middle"))

    # Separadores columnas encabezado
    for cx_sep in [col1, col2, col3]:
        partes.append(_line(cx_sep, ty, cx_sep, ty + row_h * (n_rows + 1),
                            stroke="#cbd5e1", stroke_width="1"))

    # Filas de datos
    rows_data = [
        ("Sección fase",
         f"{int(sec_mm2)} mm² {'Cu' if material=='cu' else 'Al'}"
         + (f" × {cables} en //" if cables > 1 else ""),
         "Sección neutro",
         f"{int(sec_neutro)} mm²",
         "Sección tierra (PE)",
         f"{int(sec_tierra)} mm²"),
        ("Corriente diseño",
         f"{i_calc:.2f} A",
         "Corriente máx. corr.",
         f"{i_max:.2f} A",
         "Cumple térmico",
         "SÍ" if cumple_term else "NO"),
        ("Caída de tensión",
         f"{caida_pct:.2f}%",
         "Límite RIC",
         f"{limite:.1f}%",
         "Cumple caída",
         "SÍ" if cumple_caid else "NO"),
    ]

    status_cols = {2: cumple_term, 5: cumple_caid}

    for ri, row in enumerate(rows_data):
        base_y = ty + row_h * (ri + 1)
        bg = "#f1f5f9" if ri % 2 == 0 else "#f8fafc"
        partes.append(_rect(tx, base_y, tw, row_h,
                            fill=bg, stroke="#e2e8f0", stroke_width="1"))

        # Pares (label, valor) en 3 columnas
        positions = [tx, col1, col2, col3]
        for ci in range(3):
            label_x = positions[ci] + 8
            val_x   = positions[ci + 1] - 8
            lbl = row[ci * 2]
            val = row[ci * 2 + 1]

            # Color especial para valores de cumplimiento
            val_color = "#333"
            if ci == 2 and ri >= 1:
                if "SÍ" in val:
                    val_color = "#16a34a"
                elif "NO" in val:
                    val_color = "#dc2626"

            partes.append(_text(label_x, base_y + 15, lbl,
                                font_family="IBM Plex Mono, monospace",
                                font_size="10", fill="#64748b"))
            partes.append(_text(val_x, base_y + 15, val,
                                font_family="IBM Plex Mono, monospace",
                                font_size="10", fill=val_color,
                                font_weight="600", text_anchor="end"))

    # Última fila: advertencias (si las hay)
    base_y = ty + row_h * 4
    advertencias = resultado.get("advertencias", [])
    if advertencias:
        partes.append(_rect(tx, base_y, tw, row_h,
                            fill="#fffbeb", stroke="#fde68a", stroke_width="1"))
        warn_txt = " · ".join(advertencias)[:110]
        if len(" · ".join(advertencias)) > 110:
            warn_txt += "…"
        partes.append(_text(tx + 12, base_y + 15, f"⚠ {warn_txt}",
                            font_family="IBM Plex Mono, monospace",
                            font_size="9", fill="#92400e"))
    else:
        partes.append(_rect(tx, base_y, tw, row_h,
                            fill="#f0fdf4", stroke="#bbf7d0", stroke_width="1"))
        partes.append(_text(tx + 12, base_y + 15,
                            "Instalación conforme NCh Elec 4/2003 — RIC Art. 5.3.1 / 5.5.4",
                            font_family="IBM Plex Mono, monospace",
                            font_size="9", fill="#166534"))

    return "".join(partes)


def _titulo_diagrama(resultado: dict, input_data: dict | None) -> str:
    """Título y subtítulo del diagrama."""
    sistema = input_data.get("sistema", "trifasico") if input_data else "trifasico"
    tension = input_data.get("tension_v", 380) if input_data else 380
    sistema_map = {"trifasico": "Trifásico", "bifasico": "Bifásico", "monofasico": "Monofásico"}
    sistema_str = sistema_map.get(sistema, sistema)

    partes = [
        _text(400, 22, "DIAGRAMA UNIFILAR — NCh Elec 4/2003 (RIC Chile)",
              font_family="IBM Plex Mono, monospace",
              font_size="13", fill="#0f172a", font_weight="700",
              text_anchor="middle"),
        _text(400, 38, f"Sistema {sistema_str} · {tension} V — Generado automáticamente",
              font_family="IBM Plex Mono, monospace",
              font_size="10", fill="#64748b",
              text_anchor="middle"),
    ]
    return "".join(partes)


# ──────────────────────────────────────────────────────────────────────────────
# Función principal
# ──────────────────────────────────────────────────────────────────────────────

def generate_unifilar(calculation_result: dict, input_data: dict | None = None) -> str:
    """
    Genera un diagrama unifilar SVG a partir del resultado del cálculo RIC.

    Args:
        calculation_result: dict del CalculatorResult (campo 'resultado' del response).
        input_data:         dict del CalculatorInput original (opcional, para enriquecer el SVG).

    Returns:
        String SVG completo, listo para ser embebido en HTML o servido como image/svg+xml.
    """
    r = calculation_result
    inp = input_data or {}

    sistema          = inp.get("sistema", "trifasico")
    tension_v        = inp.get("tension_v", 380)
    tipo_circuito    = inp.get("tipo_circuito", "fuerza")
    potencia_kw      = inp.get("potencia_kw", 0.0)
    longitud_m       = inp.get("longitud_m", 0.0)
    material         = r.get("material", inp.get("material", "cu"))
    tipo_canalizacion = inp.get("tipo_canalizacion", "ducto_pvc")

    sec_mm2          = r.get("seccion_mm2", 0)
    sec_neutro       = r.get("sec_neutro_mm2", 0)
    sec_tierra       = r.get("sec_tierra_mm2", 0)
    cables_por_fase  = r.get("cables_por_fase", 1)
    i_calc_a         = r.get("i_calc_a", 0.0)

    # Construir cuerpo SVG
    body_parts: list[str] = [
        _titulo_diagrama(r, inp),
        _barra_alimentacion(sistema, tension_v),
        _interruptor_termomagnetico(i_calc_a, sec_mm2),
        _conductor_label(sec_mm2, material, cables_por_fase, sistema, longitud_m, tipo_canalizacion),
    ]

    # Neutro (trifásico/bifásico/monofásico siempre lleva neutro en RIC)
    body_parts.append(_neutro(sec_neutro, sistema))

    # Tierra PE
    body_parts.append(_tierra_iec(sec_tierra))

    # Símbolo de carga
    body_parts.append(_simbolo_carga(tipo_circuito, potencia_kw, sistema))

    # Tabla resumen
    body_parts.append(_tabla_resumen(r))

    body = "".join(body_parts)

    svg = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<svg xmlns="http://www.w3.org/2000/svg" '
        'viewBox="0 0 800 600" '
        'width="800" height="600" '
        'font-family="IBM Plex Mono, monospace" '
        'style="background:#ffffff;border-radius:8px;">'
        # Fondo
        + _rect(0, 0, 800, 600, fill="#ffffff", rx="0")
        + body
        + "</svg>"
    )

    return svg
