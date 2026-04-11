import json
from pydantic import field_validator
from pydantic_settings import BaseSettings
from typing import List


def _parse_origins(value):
    """Acepta lista Python, JSON array, o CSV/string simple.

    Railway (y otros PaaS) suelen inyectar variables como string plano. Pydantic
    v2 por defecto intenta parsearlas como JSON y revienta si no lo son. Este
    validator hace el formato tolerante: soporta `https://a.com,https://b.com`,
    `["https://a.com"]` y `https://a.com`.
    """
    if value is None or value == "":
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        s = value.strip()
        if s.startswith("["):
            try:
                return json.loads(s)
            except json.JSONDecodeError:
                pass
        return [item.strip() for item in s.split(",") if item.strip()]
    return value


class Settings(BaseSettings):
    # Base de datos
    database_url: str = "postgresql+asyncpg://ric_user:ric_dev_password_change_in_prod@localhost:5432/ric_conductor"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    jwt_secret: str = "dev_secret_change_me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080  # 7 días

    # Entorno
    environment: str = "development"
    log_level: str = "DEBUG"
    backend_cors_origins: List[str] = [
        "http://localhost:3000", "http://127.0.0.1:3000",
        "http://localhost:3001", "http://127.0.0.1:3001",
    ]
    # Dominios adicionales permitidos (Railway, Vercel, custom domain)
    extra_cors_origins: List[str] = []

    # Servicios
    pdf_service_url: str = "http://pdf-service:9000"

    # Seguridad server-to-server: NextAuth → Backend (Google OAuth)
    # Debe ser igual en backend (INTERNAL_API_SECRET) y frontend (INTERNAL_API_SECRET)
    internal_api_secret: str = ""

    # Email (Resend — dejar vacío para deshabilitar)
    resend_api_key: str = ""
    from_email: str = "noreply@ricconductor.cl"
    app_url: str = "http://localhost:3001"

    @field_validator("backend_cors_origins", "extra_cors_origins", mode="before")
    @classmethod
    def _validate_origins(cls, v):
        return _parse_origins(v)

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
