"""
Motor de selección de protecciones eléctricas.
Selecciona termomagnético y diferencial conforme RIC Art. 4.4 / RIC.
Condición fundamental: Ib ≤ In ≤ Iz
"""
from __future__ import annotations
from pydantic import BaseModel
from typing import Optional


# ── Calibres normalizados IEC 60898 / IEC 60947-2 ────────────────────────────
CALIBRES_IEC = [6, 8, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160,
                200, 250, 320, 400, 500, 630]

# Poder de corte normalizado (kA) — IEC 60898 Clase B/C
PODER_CORTE = [1.5, 3.0, 4.5, 6.0, 10.0, 15.0, 20.0, 25.0, 36.0, 50.0]

# Sensibilidades diferenciales normalizadas (mA) — IEC 61008
SENSIBILIDADES_DIFF = [10, 30, 100, 300, 500]


# ── Schemas ───────────────────────────────────────────────────────────────────

class TermomagneticoRecomendado(BaseModel):
    in_a: float                  # Corriente nominal seleccionada (A)
    curva: str                   # B | C | D
    icu_ka: float                # Poder de corte (kA)
    tipo: str                    # "Termomagnético IEC 60898"
    descripcion: str             # Ej: "25A curva C — 6kA"
    cumple_ric: bool             # Ib ≤ In ≤ Iz verificado
    advertencias: list[str]


class DiferencialRecomendado(BaseModel):
    in_a: float                  # Corriente nominal del diferencial (A)
    i_delta_n_ma: int            # Sensibilidad de disparo (mA)
    tipo_rcd: str                # AC | A | F
    num_polos: int               # 2 (monofásico) | 4 (trifásico)
    descripcion: str
    advertencias: list[str]


class ProteccionRecomendada(BaseModel):
    termomagnetico: TermomagneticoRecomendado
    diferencial: DiferencialRecomendado
    verificacion_ric: dict       # Resumen Ib/In/Iz
    cumple: bool


# ── Lógica de selección ───────────────────────────────────────────────────────

def _seleccionar_calibre(i_b: float) -> float:
    """Elige el calibre normalizado mínimo que satisface In ≥ Ib."""
    for c in CALIBRES_IEC:
        if c >= i_b:
            return float(c)
    return float(CALIBRES_IEC[-1])


def _seleccionar_poder_corte(icc_ka: Optional[float]) -> float:
    """Elige el poder de corte normalizado mínimo ≥ Icc estimada."""
    if icc_ka is None:
        return 6.0  # 6kA — valor por defecto para instalaciones BT Chile
    for pc in PODER_CORTE:
        if pc >= icc_ka:
            return pc
    return float(PODER_CORTE[-1])


def _curva_por_circuito(tipo_circuito: str) -> str:
    """
    Curva de disparo magnético según tipo de circuito:
    B (3–5×In)  → iluminación, resistivo
    C (5–10×In) → general, tomacorrientes, inductivo leve
    D (10–20×In)→ motores, transformadores, alta corriente de arranque
    """
    if tipo_circuito in ("alumbrado",):
        return "B"
    elif tipo_circuito in ("motor",):
        return "D"
    else:
        return "C"


def _sensibilidad_diferencial(tipo_circuito: str, ambiente_humedo: bool = False) -> int:
    """
    Sensibilidad diferencial según uso:
    10 mA  → cuartos de baño (contacto directo persona)
    30 mA  → doméstico general, circuitos con personas (RIC Art. 4.5.1)
    100 mA → industrial equipos de proceso, motor grande
    300 mA → protección contra incendio (alimentadores, tableros)
    """
    if ambiente_humedo:
        return 30
    if tipo_circuito in ("alimentador",):
        return 300
    if tipo_circuito in ("motor",):
        return 100
    return 30  # estándar residencial / comercial


def _tipo_rcd(tipo_circuito: str) -> str:
    """
    Tipo de dispositivo diferencial residual:
    AC → corrientes de falta sinusoidales (uso general)
    A  → AC + componente DC pulsante (motores VFD, cargadores EV, inversores ERNC)
    F  → AC + DC + alta frecuencia (equipos electrónicos sensibles)
    """
    if tipo_circuito in ("motor",):
        return "A"
    return "AC"


def _num_polos(sistema: str) -> int:
    return 4 if sistema == "trifasico" else 2


# ── Función principal ─────────────────────────────────────────────────────────

def seleccionar_proteccion(
    i_b: float,            # Corriente de diseño (Ib) — del cálculo del conductor
    i_z: float,            # Corriente máx. admisible corregida (Iz)
    tipo_circuito: str,
    sistema: str,
    icc_ka: Optional[float] = None,
    ambiente_humedo: bool = False,
) -> ProteccionRecomendada:
    """
    Selecciona termomagnético y diferencial conforme RIC Art. 4.4.
    Condición: Ib ≤ In ≤ Iz
    """
    advertencias_tm: list[str] = []
    advertencias_diff: list[str] = []

    # ── Termomagnético ────────────────────────────────────────────────────────
    in_a = _seleccionar_calibre(i_b)
    curva = _curva_por_circuito(tipo_circuito)
    icu_ka = _seleccionar_poder_corte(icc_ka)

    # Verificar condición RIC: Ib ≤ In ≤ Iz
    cumple_ib = in_a >= i_b
    cumple_iz = in_a <= i_z
    cumple_ric_tm = cumple_ib and cumple_iz

    if not cumple_iz:
        advertencias_tm.append(
            f"In ({in_a}A) > Iz ({i_z:.1f}A): el termomagnético supera la capacidad del conductor. "
            "Aumentar sección del conductor o usar protección de menor calibre."
        )
    if not cumple_ib:
        # No debería ocurrir con la lógica de selección, pero por robustez
        advertencias_tm.append(
            f"In ({in_a}A) < Ib ({i_b:.1f}A): el termomagnético no protege el circuito."
        )

    if abs(in_a - i_z) / i_z < 0.05:
        advertencias_tm.append(
            "In muy cercano a Iz — considerar calibre superior para margen de seguridad."
        )

    desc_tm = f"{int(in_a)}A curva {curva} — {icu_ka:.0f} kA"

    termomagnetico = TermomagneticoRecomendado(
        in_a=in_a,
        curva=curva,
        icu_ka=icu_ka,
        tipo="Termomagnético IEC 60898",
        descripcion=desc_tm,
        cumple_ric=cumple_ric_tm,
        advertencias=advertencias_tm,
    )

    # ── Diferencial ───────────────────────────────────────────────────────────
    i_delta_n = _sensibilidad_diferencial(tipo_circuito, ambiente_humedo)
    tipo_rcd = _tipo_rcd(tipo_circuito)
    num_polos = _num_polos(sistema)

    # El diferencial debe tener In ≥ In del termomagnético
    in_diff = _seleccionar_calibre(in_a)

    polos_str = f"{num_polos}P"
    desc_diff = f"{int(in_diff)}A {polos_str} — {i_delta_n}mA tipo {tipo_rcd}"

    if tipo_rcd == "A":
        advertencias_diff.append(
            "Tipo A requerido: el circuito tiene cargas con componente DC (motor/VFD). "
            "El tipo AC no detecta corrientes de falta con rectificación parcial."
        )
    if i_delta_n == 300:
        advertencias_diff.append(
            "Sensibilidad 300mA: protección contra incendio. "
            "No constituye protección contra contacto directo — agregar diferencial 30mA aguas abajo."
        )

    diferencial = DiferencialRecomendado(
        in_a=in_diff,
        i_delta_n_ma=i_delta_n,
        tipo_rcd=tipo_rcd,
        num_polos=num_polos,
        descripcion=desc_diff,
        advertencias=advertencias_diff,
    )

    verificacion = {
        "Ib (corriente diseño)": f"{i_b:.2f} A",
        "In (termomagnético)": f"{in_a:.0f} A",
        "Iz (corriente máx. conductor)": f"{i_z:.2f} A",
        "Ib ≤ In": "✓" if cumple_ib else "✗",
        "In ≤ Iz": "✓" if cumple_iz else "✗",
        "Cumple RIC Art. 4.4": "✓ CUMPLE" if cumple_ric_tm else "✗ NO CUMPLE",
    }

    return ProteccionRecomendada(
        termomagnetico=termomagnetico,
        diferencial=diferencial,
        verificacion_ric=verificacion,
        cumple=cumple_ric_tm,
    )
