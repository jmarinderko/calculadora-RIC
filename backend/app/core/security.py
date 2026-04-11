import re
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status

from app.config import settings


_FILENAME_SAFE_RE = re.compile(r"[^A-Za-z0-9._-]+")


def sanitize_filename(name: str | None, fallback: str = "archivo", max_length: int = 80) -> str:
    """Sanitiza un string para usarlo como nombre de archivo en Content-Disposition.

    Elimina separadores de path, saltos de línea, comillas y cualquier carácter
    que no sea alfanumérico, punto, guion o guion bajo. Esto evita path traversal
    y header injection cuando el nombre proviene del usuario (ej: nombre de proyecto
    o cálculo que luego se usa en Content-Disposition).
    """
    if not name:
        return fallback
    cleaned = _FILENAME_SAFE_RE.sub("_", str(name)).strip("._")
    cleaned = cleaned[:max_length]
    return cleaned or fallback

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.jwt_expire_minutes)
    )
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


# Límite defensivo contra CVE-2024-33664 (JWT bombing en python-jose):
# tokens HS256 legítimos rondan los 200-400 chars; cualquier cosa por encima
# de 4 KB es casi con seguridad un intento de DoS o un payload malicioso.
MAX_JWT_LENGTH = 4096


def decode_token(token: str) -> str:
    """Decodifica el token JWT y retorna el subject (user_id)."""
    if not token or len(token) > MAX_JWT_LENGTH:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido o expirado")
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        subject: Optional[str] = payload.get("sub")
        if subject is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
        return subject
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido o expirado")
