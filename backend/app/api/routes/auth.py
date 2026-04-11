import secrets as secrets_module
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select
from pydantic import BaseModel, EmailStr, Field

from app.db.session import get_session
from app.db.models import User
from app.core.security import hash_password, verify_password, create_access_token
from app.api.deps import get_current_user
from app.services.email import send_welcome_email
from app.config import settings

router = APIRouter()


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=200)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    is_admin: bool = False


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str | None
    is_active: bool
    is_admin: bool


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_session)):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="El email ya está registrado")

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
    )
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        # Race: otro request creó el mismo email entre el SELECT y el INSERT
        await db.rollback()
        raise HTTPException(status_code=409, detail="El email ya está registrado")
    await db.refresh(user)

    token = create_access_token(str(user.id))
    # Email de bienvenida (no bloquea el registro si falla)
    await send_welcome_email(user.email, user.full_name)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, is_admin=user.is_admin)


class GoogleAuthRequest(BaseModel):
    email: EmailStr
    name: str | None = None
    internal_token: str | None = None  # secret compartido NextAuth → Backend


@router.post("/google", response_model=TokenResponse)
async def google_auth(body: GoogleAuthRequest, db: AsyncSession = Depends(get_session)):
    """Crea o recupera un usuario autenticado con Google y retorna JWT.

    Requiere internal_token == settings.internal_api_secret cuando este está configurado,
    para evitar que terceros puedan hacer account takeover llamando directamente al endpoint.
    """
    secret = settings.internal_api_secret
    if secret and not secrets_module.compare_digest(body.internal_token or "", secret):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No autorizado")
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user:
        # Crear usuario sin contraseña (usa UUID aleatorio como placeholder)
        user = User(
            email=body.email,
            hashed_password=hash_password(str(uuid.uuid4())),
            full_name=body.name,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        await send_welcome_email(user.email, user.full_name)

    if not user.is_active:
        raise HTTPException(status_code=401, detail="Cuenta desactivada")

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, is_admin=user.is_admin)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return UserOut(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        is_admin=current_user.is_admin,
    )
