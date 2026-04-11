import json
from pydantic_settings import BaseSettings
from typing import List


def _parse_origins(value) -> List[str]:
    """Acepta lista, JSON array, CSV o string simple y devuelve una lista.

    Railway (y otros PaaS) inyectan variables como string plano. Pydantic
    v2 por defecto intenta parsear campos `List[str]` como JSON y revienta
    si no lo son. Para evitar ese problema declaramos los campos como `str`
    y parseamos manualmente con este helper. Soporta:

      - ``["https://a.com","https://b.com"]`` (JSON array)
      - ``https://a.com,https://b.com`` (CSV)
      - ``https://a.com`` (string único)
      - ``[]`` / ``""`` / None → lista vacía
    """
    if value is None or value == "":
        return []
    if isinstance(value, list):
        return [str(x) for x in value]
    s = str(value).strip()
    if not s:
        return []
    if s.startswith("["):
        try:
            parsed = json.loads(s)
            if isinstance(parsed, list):
                return [str(x) for x in parsed]
        except json.JSONDecodeError:
            pass
    return [item.strip() for item in s.split(",") if item.strip()]


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

    # CORS: guardados como string crudo para tolerar cualquier formato
    # inyectado por el PaaS (JSON, CSV, o valor único). Los getters de abajo
    # los exponen como lista parseada.
    backend_cors_origins: str = (
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:3001,http://127.0.0.1:3001"
    )
    # Dominios adicionales permitidos (Railway, Vercel, custom domain)
    extra_cors_origins: str = ""

    # Servicios
    pdf_service_url: str = "http://pdf-service:9000"

    # Seguridad server-to-server: NextAuth → Backend (Google OAuth)
    # Debe ser igual en backend (INTERNAL_API_SECRET) y frontend (INTERNAL_API_SECRET)
    internal_api_secret: str = ""

    # Email (Resend — dejar vacío para deshabilitar)
    resend_api_key: str = ""
    from_email: str = "noreply@ricconductor.cl"
    app_url: str = "http://localhost:3001"

    def get_cors_origins(self) -> List[str]:
        """Lista combinada de orígenes CORS explícitos (base + extra)."""
        return _parse_origins(self.backend_cors_origins) + _parse_origins(self.extra_cors_origins)

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
