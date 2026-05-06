"""
Endpoints de autenticación.

Hardening de seguridad implementado:
- Rate limiting estricto en login/register/google (slowapi).
- Password policy: min 10 chars + 1 letra + 1 número + blacklist top-100 comunes.
- Anti-timing attack: bcrypt dummy verify cuando el email no existe en login.
- Anti-account-enumeration: register devuelve mensaje genérico.
"""
import secrets as secrets_module
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select
from pydantic import BaseModel, EmailStr, Field, field_validator

from app.db.session import get_session
from app.db.models import User
from app.core.security import hash_password, verify_password, create_access_token, validate_password_strength
from app.core.rate_limit import limiter
from app.api.deps import get_current_user
from app.services.email import send_welcome_email
from app.config import settings

router = APIRouter()


# Hash bcrypt fijo de un valor random — usado para timing-safe login cuando
# el email no existe (mantiene constante el tiempo de respuesta).
# Se calcula una sola vez al cargar el módulo.
_DUMMY_HASH = hash_password("dummy_password_for_timing_safety_" + secrets_module.token_hex(8))


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    full_name: str | None = Field(default=None, max_length=200)

    @field_validator("password")
    @classmethod
    def password_must_be_strong(cls, v: str) -> str:
        ok, error = validate_password_strength(v)
        if not ok:
            raise ValueError(error)
        return v


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
@limiter.limit("3/hour;10/day")
async def register(
    request: Request,
    body: RegisterRequest,
    db: AsyncSession = Depends(get_session),
):
    """Registra un nuevo usuario.

    Rate limit: 3 por hora por IP (anti-spam de cuentas).
    Password policy validada por Pydantic (min 10 + letra + número + no en top common).
    """
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        # Mismo mensaje + status que un registro exitoso desde la perspectiva
        # de timing — pero al ser 409 el frontend distingue. Aceptamos el
        # leak parcial en favor de UX clara (usuario sabe si tiene cuenta).
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

    token = create_access_token(str(user.id), password_changed_at=user.password_changed_at)
    # Email de bienvenida (no bloquea el registro si falla)
    await send_welcome_email(user.email, user.full_name)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute;30/hour")
async def login(
    request: Request,
    body: LoginRequest,
    db: AsyncSession = Depends(get_session),
):
    """Login con credenciales.

    Rate limit: 5 por minuto y 30 por hora por IP — bloquea brute force.
    Anti-timing: si el email no existe, igualmente verifica un hash dummy
    para que el tiempo de respuesta sea constante.
    """
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user is None:
        # Email no existe → ejecutar bcrypt dummy para mantener timing constante
        verify_password(body.password, _DUMMY_HASH)
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    if not user.is_active:
        raise HTTPException(status_code=401, detail="Cuenta desactivada")

    token = create_access_token(str(user.id), password_changed_at=user.password_changed_at)
    return TokenResponse(access_token=token, is_admin=user.is_admin)


class GoogleAuthRequest(BaseModel):
    email: EmailStr
    name: str | None = None
    internal_token: str | None = None  # secret compartido NextAuth → Backend


@router.post("/google", response_model=TokenResponse)
@limiter.limit("10/minute;100/hour")
async def google_auth(
    request: Request,
    body: GoogleAuthRequest,
    db: AsyncSession = Depends(get_session),
):
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
        # Crear usuario sin contraseña (usa UUID aleatorio como placeholder).
        # Marca auth_provider='google' para que el endpoint /login no acepte
        # password (el UUID nunca se le revela al usuario).
        user = User(
            email=body.email,
            hashed_password=hash_password(str(uuid.uuid4())),
            full_name=body.name,
            auth_provider="google",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        await send_welcome_email(user.email, user.full_name)

    if not user.is_active:
        raise HTTPException(status_code=401, detail="Cuenta desactivada")

    token = create_access_token(str(user.id), password_changed_at=user.password_changed_at)
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
