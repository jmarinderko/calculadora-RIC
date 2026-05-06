from fastapi import APIRouter, Depends, HTTPException, Request

from app.db.models import User
from app.api.deps import get_current_user
from app.core.rate_limit import limiter
from app.engine.schemas import CalculatorInput, CalculatorResponse
from app.engine.calculator import calculate

router = APIRouter()


@router.post("/conductor", response_model=CalculatorResponse)
async def calc_conductor(
    body: CalculatorInput,
    current_user: User = Depends(get_current_user),
):
    """Calcula el conductor óptimo según RIC."""
    try:
        return calculate(body)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/conductor/public", response_model=CalculatorResponse)
@limiter.limit("30/minute;500/hour")
async def calc_conductor_public(request: Request, body: CalculatorInput):
    """Endpoint público para pruebas y verificación (sin autenticación).

    Rate limit: 30/min y 500/hora por IP — evita DoS sobre el motor de cálculo.
    """
    try:
        return calculate(body)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
