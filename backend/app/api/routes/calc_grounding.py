from fastapi import APIRouter, Depends, HTTPException

from app.db.models import User
from app.api.deps import get_current_user
from app.engine.grounding import GroundingInput, GroundingResult, calcular_puesta_tierra

router = APIRouter()


@router.post("/grounding", response_model=GroundingResult)
async def calc_grounding(
    body: GroundingInput,
    current_user: User = Depends(get_current_user),
):
    """
    Calcula la resistencia de puesta a tierra según RIC Art. 3.12.
    Soporta electrodos: varilla, múltiples varillas, cable horizontal, malla rectangular.
    """
    try:
        return calcular_puesta_tierra(body)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
