from fastapi import APIRouter, Depends, HTTPException

from app.db.models import User
from app.api.deps import get_current_user
from app.engine.schemas import CalculatorInput, CalculatorResponse
from app.engine.calculator import calculate

router = APIRouter()


@router.post("/conductor", response_model=CalculatorResponse)
async def calc_conductor(
    body: CalculatorInput,
    current_user: User = Depends(get_current_user),
):
    """Calcula el conductor óptimo según RIC NCh Elec 4/2003."""
    try:
        return calculate(body)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/conductor/public", response_model=CalculatorResponse)
async def calc_conductor_public(body: CalculatorInput):
    """Endpoint público para pruebas y verificación (sin autenticación)."""
    try:
        return calculate(body)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
