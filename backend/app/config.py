from pydantic_settings import BaseSettings
from typing import List


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

    # Email (Resend — dejar vacío para deshabilitar)
    resend_api_key: str = ""
    from_email: str = "noreply@ricconductor.cl"
    app_url: str = "http://localhost:3001"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
