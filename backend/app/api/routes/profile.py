from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from app.db.session import get_session
from app.db.models import User
from app.core.security import hash_password, verify_password
from app.api.deps import get_current_user

router = APIRouter()


class ProfileOut(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    is_admin: bool


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None


@router.get("", response_model=ProfileOut)
async def get_profile(current_user: User = Depends(get_current_user)):
    return ProfileOut(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        is_admin=current_user.is_admin,
    )


@router.patch("", response_model=ProfileOut)
async def update_profile(
    body: ProfileUpdate,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if body.full_name is not None:
        current_user.full_name = body.full_name

    if body.new_password:
        if not body.current_password:
            raise HTTPException(status_code=400, detail="Se requiere la contraseña actual")
        if not verify_password(body.current_password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
        if len(body.new_password) < 8:
            raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 8 caracteres")
        current_user.hashed_password = hash_password(body.new_password)

    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)

    return ProfileOut(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        is_admin=current_user.is_admin,
    )
