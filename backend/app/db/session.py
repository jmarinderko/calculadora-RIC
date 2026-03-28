from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from contextlib import asynccontextmanager

from app.config import settings
from app.db.base import Base

engine = create_async_engine(
    settings.database_url,
    echo=settings.environment == "development",
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def init_db():
    """Crea las tablas si no existen (usado en lifespan y tests)."""
    async with engine.begin() as conn:
        # Importar modelos para que Base los reconozca
        from app.db import models  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncSession:
    """Dependencia FastAPI para obtener sesión de base de datos."""
    async with AsyncSessionLocal() as session:
        yield session


@asynccontextmanager
async def get_raw_connection():
    """Conexión raw para ejecutar SQL de seeds."""
    async with engine.connect() as conn:
        yield conn
