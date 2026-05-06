from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
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
    """Genera un token de compartir para un cálculo del usuario autenticado.

    Combina el SELECT del cálculo con el JOIN al proyecto en una sola query
    para verificar ownership atómicamente. Para evitar race condition cuando
    dos requests intentan generar el token concurrentemente, usa un UPDATE
    condicional `WHERE share_token IS NULL`: gana solo el primero, los demás
    leen el token ya generado.
    """
    try:
        calc_uuid = uuid.UUID(calculation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de cálculo inválido")

    # SELECT con JOIN: chequeo ownership en una sola ida a la BD
    stmt = (
        select(Calculation, Project.owner_id)
        .join(Project, Project.id == Calculation.project_id)
        .where(Calculation.id == calc_uuid)
    )
    row = (await db.execute(stmt)).first()
    if not row:
        raise HTTPException(status_code=404, detail="Cálculo no encontrado")

    calc, owner_id = row
    if str(owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sin acceso a este cálculo")

    # Si ya tiene token, reusar
    if calc.share_token:
        return ShareResponse(
            share_token=calc.share_token,
            share_url=f"/share/{calc.share_token}",
        )

    # UPDATE condicional atómico — solo escribe si share_token sigue NULL.
    # En caso de carrera, una sola request gana. Las otras releen el valor.
    new_token = secrets.token_urlsafe(32)
    update_stmt = (
        update(Calculation)
        .where(Calculation.id == calc_uuid, Calculation.share_token.is_(None))
        .values(share_token=new_token)
    )
    try:
        result = await db.execute(update_stmt)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Error generando token de compartir")

    if result.rowcount == 0:
        # Otra request ganó la carrera — releer el token que quedó persistido
        await db.refresh(calc)

    final_token = calc.share_token if result.rowcount == 0 else new_token
    return ShareResponse(
        share_token=final_token,
        share_url=f"/share/{final_token}",
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
