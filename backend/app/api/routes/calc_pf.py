from fastapi import APIRouter, Depends, HTTPException

from app.db.models import User
from app.api.deps import get_current_user
from app.engine.power_factor import PowerFactorInput, PowerFactorResult, calcular_correccion_fp

router = APIRouter()


@router.post("/power-factor", response_model=PowerFactorResult)
async def calc_power_factor(
    body: PowerFactorInput,
    current_user: User = Depends(get_current_user),
):
    """
    Calcula la corrección de factor de potencia y el banco de condensadores necesario.
    Retorna kVAR a compensar, banco estándar recomendado, reducción de corriente
    y estimación de ahorro tarifario mensual/anual.
    """
    try:
        return calcular_correccion_fp(body)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/power-factor/public", response_model=PowerFactorResult)
async def calc_power_factor_public(body: PowerFactorInput):
    """Endpoint público para pruebas (sin autenticación)."""
    try:
        return calcular_correccion_fp(body)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
