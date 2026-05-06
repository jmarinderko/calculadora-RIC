from fastapi import APIRouter, Depends, HTTPException, Request

from app.db.models import User
from app.api.deps import get_current_user
from app.core.rate_limit import limiter
from app.engine.schemas_mtat import MtatInput, MtatResponse
from app.engine.calculator_mtat import calculate_mtat

router = APIRouter()


@router.post("/mtat", response_model=MtatResponse)
async def calc_mtat(
    body: MtatInput,
    current_user: User = Depends(get_current_user),
):
    """
    Calcula el conductor óptimo para instalaciones MT/AT.
    Basado en IEC 60502-2 / IEC 60287 / IEC 60949.
    Niveles de tensión: 1–220 kV. Aislamientos: XLPE, EPR.
    """
    try:
        return calculate_mtat(body)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/mtat/public", response_model=MtatResponse)
@limiter.limit("30/minute;500/hour")
async def calc_mtat_public(request: Request, body: MtatInput):
    """Endpoint público MT/AT para pruebas (sin autenticación).

    Rate limit: 30/min y 500/hora por IP.
    """
    try:
        return calculate_mtat(body)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
