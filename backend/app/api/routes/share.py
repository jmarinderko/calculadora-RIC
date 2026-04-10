from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import secrets
import uuid

from app.db.session import get_session
from app.db.models import Calculation, Project
from app.api.deps import get_current_user
from app.db.models import User

router = APIRouter()


class ShareResponse(BaseModel):
    share_token: str
    share_url: str


class PublicCalculation(BaseModel):
    id: str
    name: str | None
    sistema: str
    tension_v: float
    potencia_kw: float
    seccion_mm2: float
    cumple_ric: bool
    input_data: dict
    result_data: dict
    project_name: str | None
    created_at: str


@router.post("/{calculation_id}/share", response_model=ShareResponse)
async def create_share_link(
    calculation_id: str,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Genera un token de compartir para un cálculo del usuario autenticado."""
    result = await db.execute(
        select(Calculation).where(Calculation.id == uuid.UUID(calculation_id))
    )
    calc = result.scalar_one_or_none()
    if not calc:
        raise HTTPException(status_code=404, detail="Cálculo no encontrado")

    # Verificar que el cálculo pertenece al usuario
    proj_result = await db.execute(
        select(Project).where(Project.id == calc.project_id)
    )
    project = proj_result.scalar_one_or_none()
    if not project or str(project.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin acceso a este cálculo")

    # Generar o reutilizar token
    if not calc.share_token:
        calc.share_token = secrets.token_urlsafe(32)
        db.add(calc)
        await db.commit()

    return ShareResponse(
        share_token=calc.share_token,
        share_url=f"/share/{calc.share_token}",
    )


@router.get("/public/{token}", response_model=PublicCalculation)
async def get_shared_calculation(token: str, db: AsyncSession = Depends(get_session)):
    """Endpoint público — retorna un cálculo compartido sin autenticación."""
    result = await db.execute(
        select(Calculation).where(Calculation.share_token == token)
    )
    calc = result.scalar_one_or_none()
    if not calc:
        raise HTTPException(status_code=404, detail="Cálculo no encontrado o link inválido")

    proj_result = await db.execute(select(Project).where(Project.id == calc.project_id))
    project = proj_result.scalar_one_or_none()

    return PublicCalculation(
        id=str(calc.id),
        name=calc.name,
        sistema=calc.sistema,
        tension_v=calc.tension_v,
        potencia_kw=calc.potencia_kw,
        seccion_mm2=calc.seccion_mm2,
        cumple_ric=calc.cumple_ric,
        input_data=calc.input_data,
        result_data=calc.result_data,
        project_name=project.name if project else None,
        created_at=calc.created_at.isoformat(),
    )
