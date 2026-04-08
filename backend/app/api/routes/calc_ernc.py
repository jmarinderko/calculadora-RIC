"""
Rutas API — Calculadora ERNC (Energía Renovable No Convencional / FV)
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Literal, Union, Annotated
from pydantic import Field

from app.engine.calculator_ernc import (
    ERNCStringDCInput,
    ERNCAcInversorInput,
    ERNCGdRedBtInput,
    ERNCBateriasDCInput,
    ERNCResponse,
    calc_string_dc,
    calc_ac_inversor,
    calc_gd_red_bt,
    calc_baterias_dc,
)

router = APIRouter()


# ── Esquema de request unificado ─────────────────────────────────────────────

class ERNCRequestStringDC(BaseModel):
    topologia: Literal["string_dc"]
    datos: ERNCStringDCInput


class ERNCRequestAcInversor(BaseModel):
    topologia: Literal["ac_inversor"]
    datos: ERNCAcInversorInput


class ERNCRequestGdRedBt(BaseModel):
    topologia: Literal["gd_red_bt"]
    datos: ERNCGdRedBtInput


class ERNCRequestBateriasDC(BaseModel):
    topologia: Literal["baterias_dc"]
    datos: ERNCBateriasDCInput


ERNCRequest = Annotated[
    Union[
        ERNCRequestStringDC,
        ERNCRequestAcInversor,
        ERNCRequestGdRedBt,
        ERNCRequestBateriasDC,
    ],
    Field(discriminator="topologia"),
]


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/ernc", response_model=ERNCResponse)
async def calc_ernc(body: ERNCRequest):  # type: ignore[valid-type]
    """
    Calcula conductor ERNC/FV según topología:
    - **string_dc**   → String fotovoltaico DC, cable ZZ-F
    - **ac_inversor** → Salida AC del inversor hacia tablero BT
    - **gd_red_bt**   → Generación distribuida, inyección a red BT (NTCO SEC)
    - **baterias_dc** → Enlace DC de sistema de baterías
    """
    try:
        if body.topologia == "string_dc":
            return calc_string_dc(body.datos)
        elif body.topologia == "ac_inversor":
            return calc_ac_inversor(body.datos)
        elif body.topologia == "gd_red_bt":
            return calc_gd_red_bt(body.datos)
        elif body.topologia == "baterias_dc":
            return calc_baterias_dc(body.datos)
        else:
            raise HTTPException(status_code=422, detail=f"Topología desconocida: {body.topologia}")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/ernc/public", response_model=ERNCResponse)
async def calc_ernc_public(body: ERNCRequest):  # type: ignore[valid-type]
    """Endpoint público ERNC para pruebas y verificación (sin autenticación)."""
    try:
        if body.topologia == "string_dc":
            return calc_string_dc(body.datos)
        elif body.topologia == "ac_inversor":
            return calc_ac_inversor(body.datos)
        elif body.topologia == "gd_red_bt":
            return calc_gd_red_bt(body.datos)
        elif body.topologia == "baterias_dc":
            return calc_baterias_dc(body.datos)
        else:
            raise HTTPException(status_code=422, detail=f"Topología desconocida: {body.topologia}")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


# ── Endpoints individuales por topología (alternativa REST explícita) ─────────

@router.post("/ernc/string-dc", response_model=ERNCResponse)
async def calc_ernc_string_dc(body: ERNCStringDCInput):
    """String fotovoltaico DC — cable ZZ-F, factor 1.25×Isc."""
    try:
        return calc_string_dc(body)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/ernc/ac-inversor", response_model=ERNCResponse)
async def calc_ernc_ac_inversor(body: ERNCAcInversorInput):
    """Tramo AC desde inversor hasta tablero BT — cable THW/NYY."""
    try:
        return calc_ac_inversor(body)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/ernc/gd-red-bt", response_model=ERNCResponse)
async def calc_ernc_gd_red_bt(body: ERNCGdRedBtInput):
    """Generación distribuida — inyección a red BT (NTCO SEC Chile)."""
    try:
        return calc_gd_red_bt(body)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/ernc/baterias-dc", response_model=ERNCResponse)
async def calc_ernc_baterias_dc(body: ERNCBateriasDCInput):
    """Enlace DC de sistema de baterías estacionarias."""
    try:
        return calc_baterias_dc(body)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
