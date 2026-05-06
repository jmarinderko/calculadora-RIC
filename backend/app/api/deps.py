from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.db.session import get_session
from app.db.models import User
from app.core.security import decode_token

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_session),
) -> User:
    """Valida el JWT y retorna el usuario autenticado.

    Verifica que el token NO sea más viejo que el último cambio de password
    del usuario (revocación implícita al cambiar password).
    """
    user_id, pwd_iat = decode_token(credentials.credentials)
    try:
        user_uuid = uuid.UUID(user_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado o inactivo")

    # Invalidar tokens emitidos antes del último cambio de password.
    # Si el token tiene pwd_iat (claim opcional) y no coincide con el actual del
    # user, el token está obsoleto — fue emitido en una sesión que se debe
    # cerrar después del password reset.
    if user.password_changed_at and pwd_iat is not None:
        current_pwd_iat = int(user.password_changed_at.timestamp())
        if pwd_iat < current_pwd_iat:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Sesión cerrada por cambio de contraseña. Inicia sesión nuevamente.",
            )

    return user


async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """Valida que el usuario autenticado sea administrador."""
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Se requieren permisos de administrador")
    return current_user
