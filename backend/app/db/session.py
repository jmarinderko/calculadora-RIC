from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from contextlib import asynccontextmanager

from app.config import settings
from app.db.base import Base

_engine = None
_AsyncSessionLocal = None


def _init_engine():
    """Inicializa el engine lazily — no conecta a la BD en el import."""
    global _engine, _AsyncSessionLocal
    if _engine is None:
        _engine = create_async_engine(
            settings.database_url,
            echo=settings.environment == "development",
            pool_pre_ping=True,
        )
        _AsyncSessionLocal = async_sessionmaker(_engine, expire_on_commit=False)


async def init_db():
    """Crea las tablas si no existen (usado en lifespan y tests)."""
    _init_engine()
    async with _engine.begin() as conn:
        from app.db import models  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncSession:
    """Dependencia FastAPI para obtener sesión de base de datos."""
    _init_engine()
    async with _AsyncSessionLocal() as session:
        yield session


@asynccontextmanager
async def get_raw_connection():
    """Conexión raw para ejecutar SQL de seeds."""
    _init_engine()
    async with _engine.connect() as conn:
        yield conn
