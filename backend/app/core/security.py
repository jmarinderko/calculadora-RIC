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


# bcrypt cost 13 — más fuerte que default (12) y aceptable en latencia (~250ms).
# OWASP recomienda 12-14 para 2026; argon2id sería ideal pero requiere migración
# coordinada (re-hashear al login).
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=13,
)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# Lista pequeña de passwords muy comunes (top-100). En producción se puede
# expandir a SecLists o zxcvbn. Lo importante es bloquear los más triviales.
_COMMON_PASSWORDS = frozenset(
    {
        "password", "12345678", "qwerty12", "password1", "admin123", "12345678a",
        "abc12345", "iloveyou", "password123", "1234567890", "qwerty123",
        "password!", "letmein!", "welcome1", "monkey123", "dragon123",
        "master123", "superman", "michael1", "shadow12", "trustno1",
        "killer123", "jennifer", "jordan23", "harley1", "ranger12",
        "buster1", "soccer1", "hockey1", "george1", "andrew1", "joshua1",
        "michelle", "charlie1", "andrew12", "matthew1", "access12",
        "amanda1", "asshole1", "freedom1", "robert1", "thomas1",
        "hunter1", "starwars", "computer", "michelle1", "summer1",
        "ashley1", "bailey1", "passw0rd", "p@ssw0rd", "p@ssword",
        "qweasdzxc", "qwertyuiop", "1q2w3e4r5t", "1qaz2wsx", "zaq12wsx",
        "admin1234", "admin@123", "administrator", "root1234", "test1234",
        "ric12345", "calculadora1", "conductor1", "chile1234", "santiago1",
    }
)


def validate_password_strength(password: str) -> tuple[bool, str]:
    """Valida que el password cumpla la política mínima.

    Returns: (is_valid, error_message_es)
    """
    if not password or len(password) < 10:
        return False, "La contraseña debe tener al menos 10 caracteres"
    if len(password) > 128:
        return False, "La contraseña no puede exceder 128 caracteres"
    if password.lower() in _COMMON_PASSWORDS:
        return False, "Esta contraseña es muy común. Elige una más segura"
    if not any(c.isalpha() for c in password):
        return False, "La contraseña debe contener al menos una letra"
    if not any(c.isdigit() for c in password):
        return False, "La contraseña debe contener al menos un número"
    return True, ""


def create_access_token(
    subject: str,
    expires_delta: Optional[timedelta] = None,
    password_changed_at: Optional[datetime] = None,
) -> str:
    """Crea un JWT firmado.

    Incluye `pwd_iat` (timestamp del último cambio de password del usuario)
    para que decode_token pueda invalidar tokens emitidos antes de un cambio
    de password — sin necesidad de blacklist.
    """
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.jwt_expire_minutes)
    )
    payload: dict = {"sub": subject, "exp": expire}
    if password_changed_at is not None:
        payload["pwd_iat"] = int(password_changed_at.timestamp())
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


# Límite defensivo contra CVE-2024-33664 (JWT bombing en python-jose):
# tokens HS256 legítimos rondan los 200-400 chars; cualquier cosa por encima
# de 4 KB es casi con seguridad un intento de DoS o un payload malicioso.
MAX_JWT_LENGTH = 4096


def decode_token(token: str) -> tuple[str, Optional[int]]:
    """Decodifica el token JWT y retorna (user_id, pwd_iat).

    El caller debe verificar contra `User.password_changed_at` si el `pwd_iat`
    es válido (token emitido después del último cambio de password).
    """
    if not token or len(token) > MAX_JWT_LENGTH:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido o expirado")
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        subject: Optional[str] = payload.get("sub")
        if subject is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
        pwd_iat = payload.get("pwd_iat")
        return subject, pwd_iat
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido o expirado")
