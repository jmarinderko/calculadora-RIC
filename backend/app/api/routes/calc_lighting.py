from fastapi import APIRouter, Depends, HTTPException

from app.db.models import User
from app.api.deps import get_current_user
from app.engine.lighting import LightingInput, LightingResult, calcular_iluminacion

router = APIRouter()


@router.post("/lighting", response_model=LightingResult)
async def calc_lighting(
    body: LightingInput,
    current_user: User = Depends(get_current_user),
):
    """
    Calcula el número de luminarias y distribución mediante el método de
    cavidades zonales. Verifica cumplimiento NCh 2/1984.
    """
    try:
        return calcular_iluminacion(body)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
