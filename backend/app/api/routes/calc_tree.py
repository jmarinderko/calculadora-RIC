from fastapi import APIRouter, Depends, HTTPException

from app.db.models import User
from app.api.deps import get_current_user
from app.engine.voltage_drop_tree import VoltageDropTreeInput, VoltageDropTreeResult, calcular_arbol_caida

router = APIRouter()


@router.post("/voltage-drop-tree", response_model=VoltageDropTreeResult)
async def calc_voltage_drop_tree(
    body: VoltageDropTreeInput,
    current_user: User = Depends(get_current_user),
):
    """
    Calcula la caída de tensión acumulada por red de distribución (árbol de circuitos).
    Los tramos deben indicarse en orden desde el origen hasta el extremo.
    La caída total no debe exceder el 5% (RIC Art. 5.5.4).
    """
    try:
        return calcular_arbol_caida(body)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
